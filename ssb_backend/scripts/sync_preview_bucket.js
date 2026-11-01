#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Copies the free-tier pictures from the private full bucket into the public preview bucket.
 * Run once after migration 20261101000200_rounds_private_pictures.sql (safe to re-run).
 * Needs SUPABASE_URL and a key that can read/write storage (service role) in ssb_backend/.env.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { FREE_LIMIT, BUCKET, PREVIEW_BUCKET } = require('../services/storyImages');

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.storage.from(BUCKET).list('ppdt', { limit: 500 });
  if (error) throw new Error(`list failed: ${error.message}`);
  const n = (s) => Number((s.match(/(\d+)(?=\.\w+$)/) || [0, 0])[1]);
  const free = data.filter((o) => /\.(jpe?g|png|webp)$/i.test(o.name)).sort((a, b) => n(a.name) - n(b.name)).slice(0, FREE_LIMIT);
  for (const o of free) {
    const path = `ppdt/${o.name}`;
    const dl = await sb.storage.from(BUCKET).download(path);
    if (dl.error) throw new Error(`download ${path}: ${dl.error.message}`);
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const up = await sb.storage.from(PREVIEW_BUCKET).upload(path, buf, { upsert: true, contentType: dl.data.type || 'image/jpeg' });
    if (up.error) throw new Error(`upload ${path}: ${up.error.message}`);
    console.log(`copied ${path}`);
  }
  console.log(`Done: ${free.length} pictures in ${PREVIEW_BUCKET}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
