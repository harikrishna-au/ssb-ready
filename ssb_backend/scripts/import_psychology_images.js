#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envFromFile = parseEnvFile(path.resolve(__dirname, '..', '.env'));
const SUPABASE_URL = (process.env.SUPABASE_URL || envFromFile.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_KEY || envFromFile.SUPABASE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_KEY in ssb_backend/.env (needed for Storage uploads).'
  );
  process.exit(1);
}

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
  if (/\.jpe?g$/i.test(fileName)) return 'image/jpeg';
  if (/\.png$/i.test(fileName)) return 'image/png';
  if (/\.webp$/i.test(fileName)) return 'image/webp';
  return 'application/octet-stream';
}

function normalizeObjectPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

async function ensureBucket(bucketName) {
  const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  if (!listResponse.ok) {
    throw new Error(`Unable to list Supabase buckets: ${await listResponse.text()}`);
  }

  const buckets = await listResponse.json();

  const existing = (buckets || []).find((bucket) => bucket.name === bucketName);
  if (existing) return;

  const createResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: true,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Unable to create bucket "${bucketName}": ${await createResponse.text()}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const imagesDir = path.resolve(args.images || path.join(__dirname, '..', '..', 'PPDT_IMAGES'));
  const bucketName = (args.bucket || process.env.PSYCHOLOGY_IMAGE_BUCKET || 'ppdt-tat-images').trim();
  const objectPrefix = normalizeObjectPath(args.prefix || 'ppdt');

  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Images directory not found: ${imagesDir}`);
  }

  const files = fs
    .readdirSync(imagesDir)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No JPEG files found in: ${imagesDir}`);
  }

  await ensureBucket(bucketName);

  console.log(`Supabase bucket: ${bucketName}`);
  console.log(`Importing ${files.length} images from ${imagesDir}`);

  for (const file of files) {
    const localPath = path.join(imagesDir, file);
    const objectPath = `${objectPrefix}/${file}`;
    const fileBytes = fs.readFileSync(localPath);

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucketName)}/${objectPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'content-type': mimeForFile(file),
          'x-upsert': 'true',
          'cache-control': '31536000',
        },
        body: fileBytes,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed for ${file}: ${await uploadResponse.text()}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${objectPath}`;
    console.log(`✔ ${file} -> ${publicUrl}`);
  }

  console.log('Done. Psychology image import complete.');
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});