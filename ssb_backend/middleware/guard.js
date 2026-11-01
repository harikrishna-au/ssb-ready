const { requireAuth } = require('./auth');
const { getLimiters } = require('./rateLimit');

/**
 * Per-route guard: authenticate, rate limit, then validate the body. It is attached to the route
 * itself (never looked up by path string), so policy and routing cannot drift apart, and the same
 * handler chain runs whatever case, slashes or encoding the request used to reach it.
 *
 * guard({ schema, limits: ['aiBurst','aiDaily'] })  ->  array of middleware for router.METHOD(path, ...guard(...), handler)
 */
function guard({ schema, limits = [] } = {}) {
  const mark = (req, _res, next) => { req.guarded = true; next(); };
  mark.isGuard = true; // lets tests prove every /api route is guarded
  const chain = [requireAuth, mark];
  for (const name of limits) {
    chain.push((req, res, next) => {
      const l = getLimiters()[name];
      if (!l) return next(new Error(`unknown limiter ${name}`));
      return l(req, res, next);
    });
  }
  if (schema) {
    chain.push((req, _res, next) => {
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const err = new Error(`Invalid request: ${(issue.path || []).join('.') || 'body'} ${issue.message}`.slice(0, 200));
        err.statusCode = 400;
        return next(err);
      }
      req.body = parsed.data;
      next();
    });
  }
  return chain;
}

const AI = ['aiBurst', 'aiDaily'];
module.exports = { guard, AI };
