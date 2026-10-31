const supabase = require('../config/supabase');
const { config } = require('../config');
const { logger } = require('../utils/logger');
const { isPremium } = require('./premium');

const BUCKET = (process.env.PSYCHOLOGY_IMAGE_BUCKET || 'ppdt-tat-images').trim();
const FOLDER = 'ppdt';
/** Free accounts only see the first N pictures, matching the mobile app's preview. */
const FREE_LIMIT = 5;
const INDEX_TTL_MS = 5 * 60 * 1000;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

const baseUrl = () => String(config.supabase.url || '').replace(/\/+$/, '');
const storagePrefix = () => `${baseUrl()}/storage/v1/object/public/`;
const publicUrl = (path, bucket = BUCKET) => `${storagePrefix()}${bucket}/${path}`;

const safeId = (id) => typeof id === 'string' && id.length < 200 && /^[\w\-./]+$/.test(id) && !id.includes('..');
const naturalKey = (id) => Number((id.match(/(\d+)(?=\.\w+$)/) || [0, 0])[1]);
const byNumber = (a, b) => naturalKey(a.id) - naturalKey(b.id) || a.id.localeCompare(b.id);

let indexCache = { at: 0, rows: null };

/**
 * Picture list. The bucket is the source of truth for which pictures exist; `story_images`
 * only adds per-picture settings (such as which tests may use it). A picture with no metadata
 * row is still served and is judged from the picture itself.
 */
async function loadIndex() {
  if (indexCache.rows && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache.rows;

  const [listed, table] = await Promise.all([
    supabase.storage.from(BUCKET).list(FOLDER, { limit: 500 }),
    supabase.from('story_images').select('id, bucket, path, uses')
  ]);
  if (table.error) logger.warn(`story_images unavailable (${table.error.message}); pictures will be judged without stored metadata`);
  const settings = new Map((table.data || []).map((r) => [r.id, r]));

  let rows;
  if (!listed.error) {
    rows = (listed.data || [])
      .filter((o) => IMAGE_EXT.test(o.name))
      .map((o) => {
        const id = `${FOLDER}/${o.name}`;
        const row = settings.get(id);
        return { id, bucket: row?.bucket || BUCKET, path: row?.path || id, uses: row?.uses || ['ppdt', 'tat'] };
      });
  } else if (settings.size) {
    logger.warn(`Could not list bucket (${listed.error.message}); using story_images rows`);
    rows = [...settings.values()].map((r) => ({ id: r.id, bucket: r.bucket || BUCKET, path: r.path || r.id, uses: r.uses || ['ppdt', 'tat'] }));
  } else {
    throw new Error(`Could not list picture bucket: ${listed.error.message}`);
  }

  rows.sort(byNumber);
  indexCache = { at: Date.now(), rows };
  return rows;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random pictures for a test, limited to the free preview unless the user is premium. */
async function pickImages({ test, count, userId }) {
  const [rows, premium] = await Promise.all([loadIndex(), isPremium(userId)]);
  const forTest = rows.filter((r) => r.uses.includes(test));
  const pool = premium ? forTest : forTest.slice(0, FREE_LIMIT);
  const data = shuffle(pool)
    .slice(0, count)
    .map((r) => ({ id: r.id, url: publicUrl(r.path, r.bucket) }));
  return { data, premium, freeLimit: FREE_LIMIT, available: pool.length };
}

/** Metadata row for one picture, or null. Never throws, so a missing table only weakens the comparison. */
async function getMetadata(id) {
  if (!safeId(id)) return null;
  const { data, error } = await supabase.from('story_images').select('*').eq('id', id).maybeSingle();
  if (error) {
    logger.warn(`story_images lookup failed for ${id}: ${error.message}`);
    return null;
  }
  return data || null;
}

/**
 * Resolves what the client says it showed into a trusted picture record.
 * - `imageId` wins: URL and metadata come from our own storage and table.
 * - A bare `imageUrl` (older mobile builds) is only accepted if it points at our public storage.
 */
async function resolveImage({ imageId, imageUrl }) {
  let id = safeId(imageId) ? imageId : null;
  if (!id && typeof imageUrl === 'string' && imageUrl.startsWith(storagePrefix())) {
    const rest = imageUrl.slice(storagePrefix().length).split('?')[0];
    const [, ...path] = rest.split('/'); // drop the bucket name
    const candidate = path.join('/');
    if (safeId(candidate)) id = candidate;
  }
  if (!id) return null;
  const metadata = await getMetadata(id);
  return { id, url: publicUrl(metadata?.path || id, metadata?.bucket || BUCKET), metadata };
}

module.exports = { BUCKET, FREE_LIMIT, publicUrl, loadIndex, isPremium, pickImages, getMetadata, resolveImage };
