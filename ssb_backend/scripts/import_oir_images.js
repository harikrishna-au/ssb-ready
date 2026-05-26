#!/usr/bin/env node
/* eslint-disable no-console */
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
  console.error(
    'Missing Firebase Admin credentials for Firestore. Add ONE of:\n' +
      '  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
      '  GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json\n' +
      '  --credentials /path/to/firebase-adminsdk-....json'
  );
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_KEY in ssb_backend/.env (needed for Storage uploads).\n' +
      'Use the service_role key for imports so uploads are not blocked by policies.'
  );
  process.exit(1);
}

const { db } = require('../config/firebase');
const supabase = require('../config/supabase');

/**
 * Images → Supabase Storage; metadata → Firebase `oir_questions`.
 *
 * Create bucket in Supabase (Storage → New bucket), name = SUPABASE_STORAGE_BUCKET (default `oir-questions`).
 * Mark bucket **Public** for reads, or use signed URLs separately.
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key.slice(2)] = value;
    if (value !== 'true') i += 1;
  }
  return args;
}

function mimeForFile(fileName) {
  if (/\.png$/i.test(fileName)) return 'image/png';
  if (/\.jpe?g$/i.test(fileName)) return 'image/jpeg';
  if (/\.webp$/i.test(fileName)) return 'image/webp';
  return 'application/octet-stream';
}

function readAnswerKey(filePath) {
  if (!filePath) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

async function main() {
  const args = parseArgs(process.argv);
  const imagesDir = args.images ? path.resolve(args.images) : '';
  const setName = args.set || 'oir';
  const folder = args.folder || `oir/questions/${setName}`;
  const questionType = args.type || 'nonVerbal';
  const defaultText = args.defaultText || 'Refer to the image and choose the correct option.';
  const options = (args.options || 'A,B,C,D').split(',').map((s) => s.trim()).filter(Boolean);
  const answerPath = args.answers ? path.resolve(args.answers) : '';
  const answerKey = readAnswerKey(answerPath);
  const rawBucketArgs = args.bucket ?? args.supabaseBucket;
  const storageBucket = (
    typeof rawBucketArgs === 'string' && rawBucketArgs.trim().length ? rawBucketArgs : ''
  ).trim() || process.env.SUPABASE_STORAGE_BUCKET || process.env.OIR_STORAGE_BUCKET || 'oir-questions';

  if (!imagesDir || !fs.existsSync(imagesDir)) {
    throw new Error(`--images directory not found: ${imagesDir}`);
  }
  if (options.length < 2) {
    throw new Error('At least 2 options are required (use --options "A,B,C,D")');
  }

  const files = fs
    .readdirSync(imagesDir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No image files found in: ${imagesDir}`);
  }

  console.log(`Supabase bucket: ${storageBucket}`);
  console.log(`Importing ${files.length} question images...`);

  for (let i = 0; i < files.length; i += 1) {
    const index = i + 1;
    const file = files[i];
    const localPath = path.join(imagesDir, file);
    const objectPath = `${folder.replace(/\\/g, '/').replace(/^\//, '')}/${file}`;
    const mime = mimeForFile(file);
    const fileBytes = fs.readFileSync(localPath);

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(objectPath, fileBytes, {
        upsert: true,
        contentType: mime,
        cacheControl: '31536000'
      });

    if (uploadError) {
      throw new Error(
        `Supabase Storage upload failed: ${uploadError.message}\n` +
          `Ensure bucket "${storageBucket}" exists and SUPABASE_KEY is service_role (or bucket policies allow insert).`
      );
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from(storageBucket).getPublicUrl(objectPath);

    const row = answerKey[String(index)] || {};
    const correctAnswerIndex = Number.isInteger(row.correctAnswerIndex)
      ? row.correctAnswerIndex
      : 0;
    const explanation = typeof row.explanation === 'string' ? row.explanation : null;

    const docId = `${setName}_q${String(index).padStart(3, '0')}`;

    await db.collection('oir_questions').doc(docId).set(
      {
        id: docId,
        text: row.text || defaultText,
        options,
        correct_answer_index: correctAnswerIndex,
        type: questionType,
        image_url: publicUrl,
        storage_provider: 'supabase',
        supabase_bucket: storageBucket,
        supabase_object_path: objectPath,
        explanation,
        set: setName,
        questionNumber: index,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { merge: true }
    );

    console.log(`✔ ${docId} -> ${publicUrl}`);
  }

  console.log('Done. OIR question import complete.');
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
