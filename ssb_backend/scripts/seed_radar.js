'use strict';
/**
 * One-time seed of radar_notifications from scripts/radar_seed.json. Never overwrites an existing row.
 *   node scripts/seed_radar.js --dry-run      (in-memory store, prints what would be inserted)
 *   node scripts/seed_radar.js                (needs SUPABASE_URL + RADAR_SUPABASE_SERVICE_KEY)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const seed = require('./radar_seed.json');
const core = require('../services/radarCore');

(async () => {
  const dry = process.argv.includes('--dry-run');
  if (dry) process.env.RADAR_STORE = 'memory';
  const store = require('../services/radarStore').getStore();
  const now = new Date().toISOString();
  let added = 0, skipped = 0;
  for (const s of seed.items) {
    if (await store.getNotification(s.id)) { skipped++; continue; }
    const n = { version: 1, createdAt: now, updatedAt: now, ...s };
    if (n.status === 'published' && core.publishProblems(n).length) throw new Error(`${n.id} cannot be published: ${core.publishProblems(n).join(' ')}`);
    await store.saveNotification(n);
    await store.addHistory({ notificationId: n.id, action: 'created', changedBy: 'seed-script', changes: {}, createdAt: now });
    added++;
    console.log(`${dry ? '[dry-run] ' : ''}${n.status.padEnd(9)} ${n.id}`);
  }
  console.log(`${added} added, ${skipped} already present.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
