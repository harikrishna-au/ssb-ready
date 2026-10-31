/**
 * Test harness: boots the real Express app with in-memory fakes for Firestore, Supabase, Clerk,
 * Firebase Auth and OpenAI. Nothing here touches the network.
 * Other agents: require('./helpers') FIRST in your test file, then use makeApp() / api().
 */
const path = require('path');
const Module = require('module');

process.env.NODE_ENV = 'test';
process.env.LOG_SILENT = '1';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';
process.env.CLERK_SECRET_KEY = 'sk_test_fake';
process.env.OPENAI_API_KEY = 'sk-test-not-real-000000000000';
process.env.CORS_ORIGIN = 'https://app.example.test';

const root = path.resolve(__dirname, '..');
const stub = (rel, exports) => {
  const file = Module._resolveFilename(path.join(root, rel), module);
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

// ---- tiny in-memory Firestore -------------------------------------------------------------
class FakeFirestore {
  constructor() { this.data = new Map(); this.seq = 0; }
  col(name) { if (!this.data.has(name)) this.data.set(name, new Map()); return this.data.get(name); }
  collection(name) { return new Query(this, name); }
  batch() {
    const ops = [];
    return { delete: (ref) => ops.push(ref), commit: async () => ops.forEach((r) => r.delete()) };
  }
}
class Query {
  constructor(db, name, filters = [], order = null, max = Infinity) { Object.assign(this, { db, name, filters, order, max }); }
  where(f, op, v) { return new Query(this.db, this.name, [...this.filters, [f, v]], this.order, this.max); }
  orderBy(f, dir = 'asc') { return new Query(this.db, this.name, this.filters, [f, dir], this.max); }
  limit(n) { return new Query(this.db, this.name, this.filters, this.order, n); }
  select() { return this; }
  async get() {
    let rows = [...this.db.col(this.name)].filter(([, d]) => this.filters.every(([f, v]) => d[f] === v));
    if (this.order) {
      const [f, dir] = this.order;
      rows.sort((a, b) => ((a[1][f] > b[1][f]) - (a[1][f] < b[1][f])) * (dir === 'desc' ? -1 : 1));
    }
    rows = rows.slice(0, this.max);
    const docs = rows.map(([id, d]) => this.docSnap(id, d));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
  docSnap(id, d) { return { id, exists: true, data: () => ({ ...d }), ref: this.doc(id) }; }
  async add(data) { const id = `doc${++this.db.seq}`; this.db.col(this.name).set(id, { ...data }); return { id }; }
  doc(id) {
    const col = this.db.col(this.name);
    return {
      id,
      set: async (data, opts) => { col.set(id, opts?.merge ? { ...(col.get(id) || {}), ...data } : { ...data }); },
      get: async () => (col.has(id) ? { id, exists: true, data: () => ({ ...col.get(id) }) } : { id, exists: false, data: () => undefined }),
      delete: async () => { col.delete(id); }
    };
  }
}

// ---- fake Supabase ------------------------------------------------------------------------
class FakeSupabase {
  constructor() { this.tables = {}; this.calls = []; }
  table(n) { return (this.tables[n] ||= []); }
  from(name) {
    const self = this;
    const state = { name, op: 'select', patch: null, filters: [], cols: null };
    const run = () => {
      const rows = self.table(name);
      const match = (r) => state.filters.every(([c, v]) => r[c] === v);
      if (state.op === 'delete') { self.tables[name] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
      if (state.op === 'update') { rows.filter(match).forEach((r) => Object.assign(r, state.patch)); return { data: null, error: null }; }
      const pick = (r) => (state.cols ? Object.fromEntries(state.cols.filter((c) => c in r).map((c) => [c, r[c]])) : { ...r });
      return { data: rows.filter(match).map(pick), error: null };
    };
    const q = {
      select: (cols) => { if (cols && cols !== '*') state.cols = cols.split(',').map((c) => c.trim()); return q; }, delete: () => { state.op = 'delete'; return q; }, update: (p) => { state.op = 'update'; state.patch = p; return q; },
      eq: (c, v) => { state.filters.push([c, v]); return q; },
      then: (res, rej) => Promise.resolve(run()).then(res, rej)
    };
    return q;
  }
  get storage() { return { listBuckets: async () => ({ data: [], error: null }), from: () => ({ list: async () => ({ data: [], error: null }) }) }; }
}

// ---- shared mutable fakes -----------------------------------------------------------------
const state = {
  db: new FakeFirestore(),
  supabase: new FakeSupabase(),
  deletedIdentities: [],
  ai: { calls: [] }
};
const users = {
  // token -> claims
  'clerk-alice': { sub: 'user_alice', email: 'alice@example.test' },
  'clerk-bob': { sub: 'user_bob', email: 'bob@example.test' }
};
const firebaseUsers = { 'fb-carol': { uid: 'fb_carol', email: 'carol@example.test' } };

const jwtLike = (name, iss = 'https://x.clerk.accounts.dev') =>
  `${Buffer.from('{"alg":"RS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ iss, name })).toString('base64url')}.sig`;
// Clerk tokens are real-looking JWTs; map our readable names to them.
const tokens = {};
const tokenFor = (name) => (tokens[name] ||= jwtLike(name));

stub('config/firebase.js', {
  db: { collection: (n) => state.db.collection(n), batch: () => state.db.batch() },
  admin: {
    auth: () => ({
      verifyIdToken: async (t) => {
        if (firebaseUsers[t]) return { ...firebaseUsers[t] };
        throw Object.assign(new Error('Firebase ID token has expired / invalid'), { code: 'auth/id-token-expired' });
      },
      deleteUser: async (uid) => state.deletedIdentities.push(`firebase:${uid}`)
    })
  }
});
stub('config/supabase.js', new Proxy({}, { get: (_, k) => state.supabase[k]?.bind?.(state.supabase) ?? state.supabase[k] }));

// Clerk: only tokens we minted for known users verify.
const clerkPath = require.resolve('@clerk/backend');
const realClerk = require(clerkPath);
require.cache[clerkPath].exports = {
  ...realClerk,
  verifyToken: async (t) => {
    const name = Object.keys(tokens).find((n) => tokens[n] === t);
    if (name && users[name]) return users[name];
    if (name === 'clerk-expired') throw new Error('token-expired');
    throw new Error('token-invalid-signature');
  },
  createClerkClient: () => ({
    users: {
      deleteUser: async (id) => state.deletedIdentities.push(`clerk:${id}`),
      getUser: async (id) => ({ id, emailAddresses: [{ emailAddress: 'x@example.test' }], firstName: 'T', lastName: 'U', createdAt: 1, publicMetadata: {}, unsafeMetadata: { apps: {} } })
    }
  })
};

stub('services/aiService.js', new Proxy({}, {
  get: (_, fn) => async (...args) => {
    state.ai.calls.push({ fn, args });
    if (fn === 'ocrHandwrittenImage') return 'text';
    if (fn === 'generateInterviewReply') return 'reply';
    if (fn.endsWith('Pipeline')) return { analysisMarkdown: 'ok', score: 7, olqs: ['x'], alignment: {} };
    return { score: 7, feedback: 'ok', identified_olqs: [] };
  }
}));
stub('services/storyImages.js', { resolveImage: async () => null, pickImages: async () => ({ data: [{ id: 'ppdt/1.jpg', url: 'u' }], premium: false, freeLimit: 5, available: 1 }) });

const { createApp } = require('../app');

/** Starts the app on a random port. Returns { url, close }. */
async function makeApp() {
  const app = createApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

/** Small fetch wrapper: api(url)('POST', '/path', { body, token, headers }) */
const api = (url) => async (method, p, { body, token, headers = {}, raw } = {}) => {
  const res = await fetch(url + p, {
    method,
    headers: { ...(body !== undefined && method !== 'GET' && !raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body === undefined || method === 'GET' ? undefined : JSON.stringify(body))
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers, text };
};

function reset() {
  state.db = new FakeFirestore();
  state.supabase = new FakeSupabase();
  state.deletedIdentities.length = 0;
  state.ai.calls.length = 0;
}

module.exports = { makeApp, api, state, tokenFor, reset, firebaseUsers, root };
