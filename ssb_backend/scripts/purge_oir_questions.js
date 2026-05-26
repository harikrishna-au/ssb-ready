#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Deletes all documents in Firestore `oir_questions` and optionally removes
 * matching objects from Supabase Storage (when each doc has supabase_bucket + supabase_object_path).
 *
 * Usage (from ssb_backend):
 *   npm run oir:purge -- --dry-run
 *   npm run oir:purge
 *   npm run oir:purge -- --skip-storage
 *   npm run oir:purge -- --id-prefix oir1_
 *   npm run oir:purge -- --only-with-image
 *   npm run oir:purge-images
 *
 * --only-with-image: delete only rows that have image_url / imageUrl or supabase_object_path
 * (text-only questions are kept). Same Storage cleanup rules as full purge.
 *
 * Requires same credentials as import: FIREBASE_SERVICE_ACCOUNT_JSON; for Storage deletes:
 * SUPABASE_URL, SUPABASE_KEY (unless --skip-storage).
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const credIdx = process.argv.indexOf('--credentials');
if (credIdx !== -1 && process.argv[credIdx + 1] && !process.argv[credIdx + 1].startsWith('--')) {
  const credPath = path.resolve(process.argv[credIdx + 1]);
  if (!fs.existsSync(credPath)) {
    console.error(`Credentials file not found: ${credPath}`);
    process.exit(1);
  }
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = fs.readFileSync(credPath, 'utf8').trim();
}

if (!String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim() && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const ga = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fs.existsSync(ga)) {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = fs.readFileSync(ga, 'utf8').trim();
  }
}

const hasSa =
  !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim()) ||
  !!(process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

if (!hasSa) {
  console.error('Missing Firebase Admin credentials. See scripts/import_oir_images.js header.');
  process.exit(1);
}

/** True if this row was stored as an image-backed OIR question. */
function docHasImage(data) {
  const url = data.image_url || data.imageUrl;
  if (typeof url === 'string' && url.trim().length > 0) return true;
  const p = data.supabase_object_path;
  if (typeof p === 'string' && p.trim().length > 0) return true;
  return false;
}

function parseArgs(argv) {
  const args = { dryRun: false, skipStorage: false, idPrefix: '', onlyWithImage: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-storage') args.skipStorage = true;
    else if (a === '--only-with-image') args.onlyWithImage = true;
    else if (a === '--id-prefix' && argv[i + 1]) {
      args.idPrefix = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const { db } = require('../config/firebase');

async function main() {
  const args = parseArgs(process.argv);
  const snap = await db.collection('oir_questions').get();
  const totalFetched = snap.docs.length;
  let docs = snap.docs;
  if (args.idPrefix) {
    docs = docs.filter((d) => d.id.startsWith(args.idPrefix));
  }
  const afterPrefix = docs.length;
  if (args.onlyWithImage) {
    docs = docs.filter((d) => docHasImage(d.data() || {}));
    console.log(
      `Image questions: ${docs.length} to remove (of ${afterPrefix} after id filter, ${totalFetched} in collection).`
    );
  } else {
    console.log(`Found ${docs.length} document(s) in oir_questions${args.idPrefix ? ` (id prefix: ${args.idPrefix})` : ''}.`);
  }

  if (args.dryRun) {
    docs.slice(0, 30).forEach((d) => console.log(`  [dry-run] delete ${d.id}`));
    if (docs.length > 30) console.log(`  ... and ${docs.length - 30} more`);
    console.log('[dry-run] No changes made. Run without --dry-run to purge.');
    return;
  }

  const storagePathsByBucket = new Map();
  for (const doc of docs) {
    const data = doc.data() || {};
    const bucket = data.supabase_bucket || process.env.SUPABASE_STORAGE_BUCKET || 'oir-questions';
    const objectPath = data.supabase_object_path;
    if (!args.skipStorage && objectPath && typeof objectPath === 'string') {
      if (!storagePathsByBucket.has(bucket)) storagePathsByBucket.set(bucket, []);
      storagePathsByBucket.get(bucket).push(objectPath);
    }
  }

  if (!args.skipStorage && storagePathsByBucket.size > 0) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.warn('SUPABASE_URL / SUPABASE_KEY missing — skipping Storage deletes.');
    } else {
      const supabase = require('../config/supabase');
      for (const [bucket, paths] of storagePathsByBucket) {
        const unique = [...new Set(paths)];
        for (let i = 0; i < unique.length; i += 100) {
          const chunk = unique.slice(i, i + 100);
          const { error } = await supabase.storage.from(bucket).remove(chunk);
          if (error) {
            console.warn(`Storage remove warning (${bucket}): ${error.message}`);
          } else {
            console.log(`Removed ${chunk.length} object(s) from bucket "${bucket}".`);
          }
        }
      }
    }
  } else if (args.skipStorage) {
    console.log('Skipping Supabase Storage (--skip-storage).');
  }

  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted Firestore batch ${i + 1}–${Math.min(i + batchSize, docs.length)} / ${docs.length}`);
  }

  console.log(
    `Done. Removed ${docs.length} OIR question document(s)${args.onlyWithImage ? ' (image-backed only)' : ''}.`
  );
}

main().catch((err) => {
  console.error('Purge failed:', err.message);
  process.exit(1);
});
