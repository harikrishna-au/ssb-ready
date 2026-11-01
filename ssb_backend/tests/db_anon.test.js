// With the public ANON key the private table reads as empty (RLS), which would look like "no history".
// The store must refuse that key loudly instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

const anon = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from('{"role":"anon"}').toString('base64url')}.sig`;
process.env.LOG_SILENT = '1';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_KEY = anon;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let touched = false;
const key = Module._resolveFilename(path.resolve(__dirname, '../config/supabase.js'), module);
require.cache[key] = { id: key, filename: key, loaded: true, exports: { from: () => { touched = true; throw new Error('should not be reached'); } } };
const { db } = require('../config/db');

test('every operation is refused with the anon key, before any request is made', async () => {
  const msg = /ANON key.*SUPABASE_SERVICE_ROLE_KEY/s;
  await assert.rejects(() => db.collection('piqs').doc('u').get(), msg);
  await assert.rejects(() => db.collection('piqs').doc('u').set({ a: 1 }), msg);
  await assert.rejects(() => db.collection('wat_results').where('userId', '==', 'u').get(), msg);
  await assert.rejects(() => db.collection('wat_results').add({ userId: 'u' }), msg);
  await assert.rejects(() => db.batch().commit(), msg);
  assert.equal(touched, false);
});
