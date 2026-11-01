const { config } = require('../config');

const TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 3000);
const CACHE_MS = Number(process.env.HEALTH_CACHE_MS || 30_000);

function withTimeout(promise, ms = TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Default probes. Each resolves on success and throws on failure; details are never exposed. */
const defaultProbes = {
  // The user-data database (Supabase Postgres). Also fails if the backend holds the anon key instead of the service-role key.
  database: async () => {
    const { db } = require('../config/db');
    await db.collection('piqs').limit(1).get();
  },
  supabase: async () => {
    const supabase = require('../config/supabase');
    const { error } = await supabase.storage.listBuckets();
    if (error) throw new Error('supabase');
  },
  // Lists models: free, needs only the key. Confirms OpenAI is reachable AND the key is accepted.
  openai: async () => {
    if (!config.openai.apiKey) throw new Error('no key');
    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${config.openai.apiKey}` }
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
  }
};

let cache = { at: 0, value: null };

/**
 * @returns {{ok: boolean, checks: Record<string, 'ok'|'fail'>}}
 * Results are cached for CACHE_MS so a public endpoint cannot be used to hammer the dependencies.
 */
async function runHealthChecks({ probes = defaultProbes, now = Date.now, useCache = true } = {}) {
  if (useCache && cache.value && now() - cache.at < CACHE_MS) return cache.value;
  const names = Object.keys(probes);
  const results = await Promise.all(
    names.map((n) =>
      withTimeout(Promise.resolve().then(probes[n]))
        .then(() => 'ok')
        .catch(() => 'fail')
    )
  );
  const checks = Object.fromEntries(names.map((n, i) => [n, results[i]]));
  const value = { ok: results.every((r) => r === 'ok'), checks };
  if (useCache) cache = { at: now(), value };
  return value;
}

function clearHealthCache() {
  cache = { at: 0, value: null };
}

module.exports = { runHealthChecks, clearHealthCache, defaultProbes };
