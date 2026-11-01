/**
 * Small sliding-window rate limiter (no dependency). State is in memory, so limits apply per
 * server instance. Render's free plan runs one instance; move the store to Redis before scaling out.
 */
function createRateLimiter({ name, windowMs, max, keyFn, now = Date.now, message }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const cutoff = now() - windowMs;
    for (const [key, stamps] of hits) {
      if (stamps.length === 0 || stamps[stamps.length - 1] <= cutoff) hits.delete(key);
    }
  }, Math.max(windowMs, 60_000));
  if (typeof sweep.unref === 'function') sweep.unref();

  function middleware(req, res, next) {
    const key = keyFn(req);
    if (!key) return next(); // nothing to key on (e.g. unauthenticated); the IP limiter covers that case
    const t = now();
    const stamps = (hits.get(key) || []).filter((s) => s > t - windowMs);
    if (stamps.length >= max) {
      const retryAfter = Math.max(1, Math.ceil((stamps[0] + windowMs - t) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      const err = new Error(message || 'Too many requests. Please slow down and try again shortly.');
      err.statusCode = 429;
      err.code = `rate_limited:${name}`;
      return next(err);
    }
    stamps.push(t);
    hits.set(key, stamps);
    next();
  }
  middleware.reset = () => hits.clear();
  middleware.limiterName = name;
  return middleware;
}

const byIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';
const byUser = (req) => (req.authUser?.uid ? `u:${req.authUser.uid}` : null);

const envInt = (name, fallback) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Built from env at call time so tests can change limits. */
function buildLimiters(now = Date.now) {
  return {
    ip: createRateLimiter({ name: 'ip', windowMs: 60_000, max: envInt('RATE_LIMIT_IP_PER_MIN', 240), keyFn: byIp, now }),
    // Calls that cost money (OpenAI): a burst limit and a daily cap, per signed-in user.
    aiBurst: createRateLimiter({ name: 'ai-burst', windowMs: 5 * 60_000, max: envInt('RATE_LIMIT_AI_PER_5MIN', 20), keyFn: byUser, now }),
    aiDaily: createRateLimiter({ name: 'ai-daily', windowMs: 24 * 3600_000, max: envInt('RATE_LIMIT_AI_PER_DAY', 150), keyFn: byUser, now }),
    // Writes to the database.
    write: createRateLimiter({ name: 'write', windowMs: 60_000, max: envInt('RATE_LIMIT_WRITE_PER_MIN', 60), keyFn: byUser, now }),
    // Account export and deletion.
    account: createRateLimiter({ name: 'account', windowMs: 3600_000, max: envInt('RATE_LIMIT_ACCOUNT_PER_HOUR', 5), keyFn: byUser, now })
  };
}

let shared = null;
/** One set of limiters per process, shared by the IP limiter in app setup and every route guard. */
function getLimiters() {
  return (shared ||= buildLimiters());
}

module.exports = { createRateLimiter, buildLimiters, getLimiters, byIp, byUser };
