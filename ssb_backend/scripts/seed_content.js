#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seeds the content banks from scripts/seeds/*.json (idempotent: upserts on the unique text column).
 *   node scripts/seed_content.js                 # WAT, SRT, lecturette
 * Needs SUPABASE_URL and a service-role SUPABASE_KEY in ssb_backend/.env. Items under "approved" are stored as approved,
 * items under "pending" as pending (they are served, but wait for a human review).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const seeds = require('path').resolve(__dirname, 'seeds');
const read = (f) => JSON.parse(require('fs').readFileSync(require('path').join(seeds, f), 'utf8'));

function rowsFor(file, col) {
  const j = read(file);
  return [
    ...j.approved.map((v) => ({ [col]: v, review_status: 'approved' })),
    ...j.pending.map((v) => ({ [col]: v, review_status: 'pending' }))
  ];
}

async function upsert(sb, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 200), { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${rows.length} rows`);
}

module.exports = { rowsFor };

if (require.main === module) {
  (async () => {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY, { auth: { persistSession: false } });
    await upsert(sb, 'content_wat_words', rowsFor('wat_words.json', 'word'), 'word');
    await upsert(sb, 'content_srt_situations', rowsFor('srt_situations.json', 'text'), 'text');
    await upsert(sb, 'content_lecturette_topics', rowsFor('lecturette_topics.json', 'topic'), 'topic');
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
