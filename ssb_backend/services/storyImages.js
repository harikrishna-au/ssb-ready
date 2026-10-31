const supabase = require('../config/supabase');
const { config } = require('../config');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { isPremium } = require('./premium');

/** PRIVATE bucket with every picture. Only reachable through signed URLs issued here. */
const BUCKET = (process.env.PSYCHOLOGY_IMAGE_BUCKET || 'ppdt-tat-images').trim();
/** PUBLIC bucket holding only the free-tier pictures, same object paths as the full bucket. */
const PREVIEW_BUCKET = (process.env.PSYCHOLOGY_PREVIEW_BUCKET || 'ppdt-tat-preview').trim();
/** Signed URL lifetime shown to clients (a TAT set takes about an hour) and used for server-side vision calls. */
const CLIENT_URL_TTL_S = 2 * 60 * 60;
const SERVER_URL_TTL_S = 10 * 60;
const TOKEN_TTL_S = 6 * 60 * 60;
const FOLDER = 'ppdt';
/** Free accounts only see the first N pictures, matching the mobile app's preview. */
const FREE_LIMIT = 5;
const INDEX_TTL_MS = 5 * 60 * 1000;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

const baseUrl = () => String(config.supabase.url || '').replace(/\/+$/, '');
const storagePrefix = () => `${baseUrl()}/storage/v1/object/public/`;
const publicUrl = (path, bucket = PREVIEW_BUCKET) => `${storagePrefix()}${bucket}/${path}`;
const forbidden = (message) => Object.assign(new Error(message), { statusCode: 403 });

/** Short-lived signed URL for a picture in the private bucket, or null if it cannot be created. */
async function signedUrl(path, bucket = BUCKET, ttl = CLIENT_URL_TTL_S) {
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'no url');
    return data.signedUrl;
  } catch (e) {
    logger.warn(`Could not sign ${bucket}/${path}: ${e.message}`);
    return null;
  }
}

/** Proof that the server served this picture to this user. Binds user, picture and expiry. */
function mac(userId, id, exp) {
  return crypto.createHmac('sha256', String(config.jwtSecret || '')).update(`${userId}|${id}|${exp}`).digest('base64url');
}
function issueToken(userId, id, now = Date.now()) {
  const exp = Math.floor(now / 1000) + TOKEN_TTL_S;
  return `${exp}.${mac(userId, id, exp)}`;
}
function verifyToken(token, userId, id, now = Date.now()) {
  if (typeof token !== 'string' || !userId) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const want = Buffer.from(mac(userId, id, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

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

/** Ids any account may use: the first FREE_LIMIT pictures. Single source of truth for pick and resolve. */
const freeIdSet = (rows) => new Set(rows.slice(0, FREE_LIMIT).map((r) => r.id));

/**
 * Random pictures for a test, limited to the free preview unless the user is premium.
 * Free pictures come from the public preview bucket; premium ones as short-lived signed URLs.
 * Each picture carries a token so the evaluators can verify the server served it to this user.
 */
async function pickImages({ test, count, userId }) {
  const [rows, premium] = await Promise.all([loadIndex(), isPremium(userId)]);
  const free = freeIdSet(rows);
  const forTest = rows.filter((r) => r.uses.includes(test));
  const pool = premium ? forTest : forTest.filter((r) => free.has(r.id));
  const picked = shuffle(pool).slice(0, count);
  const data = await Promise.all(
    picked.map(async (r) => {
      const url = free.has(r.id) && !premium ? publicUrl(r.path, PREVIEW_BUCKET) : await signedUrl(r.path, r.bucket);
      return { id: r.id, url, token: issueToken(userId, r.id) };
    })
  );
  return { data: data.filter((d) => d.url), premium, freeLimit: FREE_LIMIT, available: pool.length };
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

/** Pulls a picture id out of one of our storage URLs (older mobile builds send only the URL). */
function idFromUrl(imageUrl) {
  if (typeof imageUrl !== 'string') return null;
  for (const mode of ['public', 'sign']) {
    const prefix = `${baseUrl()}/storage/v1/object/${mode}/`;
    if (!imageUrl.startsWith(prefix)) continue;
    const [bucket, ...path] = imageUrl.slice(prefix.length).split('?')[0].split('/');
    if (bucket !== BUCKET && bucket !== PREVIEW_BUCKET) return null;
    const candidate = path.join('/');
    return safeId(candidate) ? candidate : null;
  }
  return null;
}

/**
 * Resolves what the client says it showed into a trusted picture record, or throws 403.
 * - The id must be a picture that exists.
 * - A valid `imageToken` (issued by GET /api/images to this same user) proves the server served it.
 * - Otherwise the id must be inside the caller's entitled pool: free = first FREE_LIMIT, premium = all.
 *   (Older Flutter builds send only a URL; those keep working for the free preview pool.)
 * - A forged token is rejected outright, even for a free picture.
 * Returns null when the client named no picture at all.
 */
async function resolveImage({ imageId, imageUrl, imageToken, userId }) {
  const id = safeId(imageId) ? imageId : idFromUrl(imageUrl);
  if (!id) {
    if (imageId) throw forbidden('That picture is not valid');
    return null;
  }

  const rows = await loadIndex();
  const row = rows.find((r) => r.id === id);
  if (!row) throw forbidden('That picture is not valid');

  if (imageToken !== undefined && imageToken !== null && imageToken !== '') {
    if (!verifyToken(imageToken, userId, id)) throw forbidden('That picture was not issued to your account');
  } else if (!freeIdSet(rows).has(id) && !(await isPremium(userId))) {
    throw forbidden('This picture is part of the premium set. Upgrade to practise with it.');
  }

  const metadata = await getMetadata(id);
  const url = await signedUrl(row.path, row.bucket, SERVER_URL_TTL_S);
  return { id, url, metadata };
}

module.exports = {
  BUCKET, PREVIEW_BUCKET, FREE_LIMIT, publicUrl, signedUrl, issueToken, verifyToken,
  loadIndex, isPremium, pickImages, getMetadata, resolveImage, _resetIndexCache: () => { indexCache = { at: 0, rows: null }; }
};
