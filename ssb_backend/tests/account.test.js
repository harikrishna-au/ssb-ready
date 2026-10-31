const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, api, tokenFor, reset, state } = require('./helpers');

let app, call;
before(async () => { app = await makeApp(); call = api(app.url); });
after(() => app.close());

const alice = () => tokenFor('clerk-alice');

async function seed() {
  reset();
  for (const [uid, label] of [['user_alice', 'ALICE'], ['user_bob', 'BOB']]) {
    for (const c of ['oir_results', 'ppdt_results', 'tat_results', 'wat_results', 'srt_results']) {
      await state.db.collection(c).add({ userId: uid, score: 5, userStory: `${label}-${c}`, completedAt: new Date('2026-01-01') });
    }
    await state.db.collection('piqs').doc(uid).set({ userId: uid, fullName: `${label} NAME` });
    await state.db.collection('users').doc(uid).set({ id: uid, firstName: label });
    state.supabase.table('profiles').push({ user_id: uid, email: `${label}@x.test`, is_premium: true });
    state.supabase.table('premium_members').push({ user_id: uid, email: `${label}@x.test`, amount_inr: 299 });
    state.supabase.table('payment_transactions').push({ user_id: uid, txnid: `tx-${label}`, amount: 299, status: 'success', raw_response: { card: 'CARD-SECRET-77' } });
  }
}

test('export returns only the caller\'s data', async () => {
  await seed();
  const r = await call('GET', '/api/account/export', { token: alice() });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  const text = r.text;
  assert.ok(text.includes('ALICE-wat_results'));
  assert.ok(text.includes('ALICE NAME'));
  assert.ok(!text.includes('BOB'), 'must not contain another user\'s data');
  assert.equal(r.json.firestore.ppdt_results.length, 1);
  assert.equal(r.json.supabase.premium_members.length, 1);
  assert.ok(!text.includes('CARD-SECRET-77'), 'gateway payload is not exported');
});

test('delete removes the caller\'s Firestore docs, Supabase rows and identity, and leaves other users alone', async () => {
  await seed();
  const r = await call('DELETE', '/api/account', { token: alice(), body: { confirm: 'DELETE' } });
  assert.equal(r.status, 200);

  for (const c of ['oir_results', 'ppdt_results', 'tat_results', 'wat_results', 'srt_results']) {
    const rows = [...state.db.col(c).values()];
    assert.equal(rows.filter((d) => d.userId === 'user_alice').length, 0, c);
    assert.equal(rows.filter((d) => d.userId === 'user_bob').length, 1, `${c} bob untouched`);
  }
  assert.equal(state.db.col('piqs').has('user_alice'), false);
  assert.equal(state.db.col('users').has('user_alice'), false);
  assert.equal(state.db.col('piqs').has('user_bob'), true);

  assert.deepEqual(state.supabase.table('profiles').map((x) => x.user_id), ['user_bob']);
  assert.deepEqual(state.supabase.table('premium_members').map((x) => x.user_id), ['user_bob']);
  const pay = state.supabase.table('payment_transactions');
  assert.equal(pay.length, 2, 'payment records are kept for accounting');
  assert.ok(!pay.some((p) => p.user_id === 'user_alice'));
  assert.ok(pay.find((p) => p.txnid === 'tx-ALICE').raw_response === null);
  assert.equal(pay.find((p) => p.txnid === 'tx-BOB').raw_response.card, 'CARD-SECRET-77');

  assert.deepEqual(state.deletedIdentities, ['clerk:user_alice']);
});

test('if a step fails the login is kept so the user can retry', async () => {
  await seed();
  const orig = state.supabase.from.bind(state.supabase);
  state.supabase.from = (n) => {
    if (n !== 'profiles') return orig(n);
    const q = { delete: () => q, eq: () => q, then: (res) => Promise.resolve({ error: { message: 'down' } }).then(res) };
    return q;
  };
  const r = await call('DELETE', '/api/account', { token: alice(), body: { confirm: 'DELETE' } });
  assert.equal(r.status, 502);
  assert.deepEqual(state.deletedIdentities, []);
  state.supabase.from = orig;
  const retry = await call('DELETE', '/api/account', { token: alice(), body: { confirm: 'DELETE' } });
  assert.equal(retry.status, 200);
  assert.deepEqual(state.deletedIdentities, ['clerk:user_alice']);
});

test('a mobile (Firebase) user is deleted from Firebase Auth, not Clerk', async () => {
  await seed();
  const r = await call('DELETE', '/api/account', { token: 'fb-carol', body: { confirm: 'DELETE' } });
  assert.equal(r.status, 200);
  assert.deepEqual(state.deletedIdentities, ['firebase:fb_carol']);
});

test('export and delete are rate limited per user', async () => {
  await seed();
  let last;
  for (let i = 0; i < 7; i++) last = await call('GET', '/api/account/export', { token: tokenFor('clerk-bob') });
  assert.equal(last.status, 429);
});
