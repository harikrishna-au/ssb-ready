const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_KEY = 'stub';
process.env.JWT_SECRET = 'test-secret';

// Stub config/supabase through require.cache: 45 pictures, premium table controlled per test.
const state = { premiumUsers: new Set(), signCalls: [] };
const files = Array.from({ length: 45 }, (_, i) => ({ name: `ppdt${i + 1}.jpg` }));
const fakeSupabase = {
  storage: {
    from: (bucket) => ({
      list: async () => ({ data: files, error: null }),
      createSignedUrl: async (p, ttl) => {
        state.signCalls.push({ bucket, p, ttl });
        return { data: { signedUrl: `https://stub.supabase.co/storage/v1/object/sign/${bucket}/${p}?token=t` }, error: null };
      }
    })
  },
  from: (table) => {
    const q = {
      select: () => q,
      eq: (_c, v) => { q.v = v; return q; },
      maybeSingle: async () =>
        table === 'premium_members' && state.premiumUsers.has(q.v)
          ? { data: { subscription_status: 'active', premium_expires_at: null }, error: null }
          : { data: null, error: null },
      then: (res) => res({ data: [], error: null })
    };
    return q;
  }
};
const key = require.resolve('../config/supabase');
require.cache[key] = { id: key, filename: key, loaded: true, exports: fakeSupabase };

// Entitlement now lives in services/premium (Agent 1: linked identities, caching). Stub it directly so
// these tests are about picture access, not about how premium is looked up.
const premiumKey = require.resolve('../services/premium');
require.cache[premiumKey] = { id: premiumKey, filename: premiumKey, loaded: true, exports: {
  isPremium: async (id) => state.premiumUsers.has(id),
  getEntitlement: async (id) => ({ premium: state.premiumUsers.has(id) }),
} };
const si = require('../services/storyImages');

test.beforeEach(() => { si._resetIndexCache(); state.premiumUsers.clear(); });

test('free user + premium picture id is rejected with 403', async () => {
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/ppdt20.jpg', userId: 'free1' }), (e) => e.statusCode === 403);
});

test('free user + free picture id is allowed', async () => {
  const img = await si.resolveImage({ imageId: 'ppdt/ppdt3.jpg', userId: 'free1' });
  assert.equal(img.id, 'ppdt/ppdt3.jpg');
  assert.match(img.url, /object\/sign\//);
});

test('premium user can use any picture', async () => {
  state.premiumUsers.add('prem1');
  const img = await si.resolveImage({ imageId: 'ppdt/ppdt44.jpg', userId: 'prem1' });
  assert.equal(img.id, 'ppdt/ppdt44.jpg');
});

test('forged id (not a real picture) is rejected', async () => {
  state.premiumUsers.add('prem1');
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/ppdt999.jpg', userId: 'prem1' }), (e) => e.statusCode === 403);
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/../secret.jpg', userId: 'prem1' }), (e) => e.statusCode === 403);
});

test('forged or foreign token is rejected, even for a free picture', async () => {
  const tokenForOther = si.issueToken('someone-else', 'ppdt/ppdt2.jpg');
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/ppdt2.jpg', imageToken: tokenForOther, userId: 'free1' }), (e) => e.statusCode === 403);
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/ppdt2.jpg', imageToken: 'garbage', userId: 'free1' }), (e) => e.statusCode === 403);
  const expired = si.issueToken('free1', 'ppdt/ppdt2.jpg', Date.now() - 7 * 3600 * 1000);
  await assert.rejects(si.resolveImage({ imageId: 'ppdt/ppdt2.jpg', imageToken: expired, userId: 'free1' }), (e) => e.statusCode === 403);
});

test('token issued by /api/images for this user and picture is accepted', async () => {
  state.premiumUsers.add('prem1');
  const set = await si.pickImages({ test: 'tat', count: 12, userId: 'prem1' });
  assert.equal(set.data.length, 12);
  assert.ok(set.data.every((p) => p.url.includes('/object/sign/ppdt-tat-images/')));
  const p = set.data[0];
  const img = await si.resolveImage({ imageId: p.id, imageToken: p.token, userId: 'prem1' });
  assert.equal(img.id, p.id);
  // the same token is useless to another user
  await assert.rejects(si.resolveImage({ imageId: p.id, imageToken: p.token, userId: 'prem2' }), (e) => e.statusCode === 403);
});

test('free users only ever get the 5 preview pictures, from the public preview bucket', async () => {
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const set = await si.pickImages({ test: 'tat', count: 12, userId: 'free1' });
    for (const p of set.data) {
      seen.add(p.id);
      assert.match(p.url, /\/object\/public\/ppdt-tat-preview\//);
    }
  }
  assert.deepEqual([...seen].sort(), ['ppdt/ppdt1.jpg', 'ppdt/ppdt2.jpg', 'ppdt/ppdt3.jpg', 'ppdt/ppdt4.jpg', 'ppdt/ppdt5.jpg']);
});

test('older mobile builds sending only a public URL work for the free pool, not for premium pictures', async () => {
  const base = 'https://stub.supabase.co/storage/v1/object/public';
  const ok = await si.resolveImage({ imageUrl: `${base}/ppdt-tat-images/ppdt/ppdt4.jpg`, userId: 'free1' });
  assert.equal(ok.id, 'ppdt/ppdt4.jpg');
  await assert.rejects(si.resolveImage({ imageUrl: `${base}/ppdt-tat-images/ppdt/ppdt30.jpg`, userId: 'free1' }), (e) => e.statusCode === 403);
  assert.equal(await si.resolveImage({ imageUrl: 'https://evil.example/x.jpg', userId: 'free1' }), null);
});
