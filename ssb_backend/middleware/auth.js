const { asyncHandler } = require('./asyncHandler');

function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

/**
 * Authenticates a request with a Clerk session token (Authorization: Bearer <token>).
 * On success `req.authUser` is `{ uid, email }`, where `uid` is the Clerk user id.
 *
 * Idempotent: if an earlier middleware already authenticated this request it does nothing,
 * so the platform layer can authenticate before rate limiting and validation.
 */
const requireAuth = asyncHandler(async (req, _res, next) => {
  if (req.authUser?.uid) return next();

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (!token || (scheme && scheme.toLowerCase() !== 'bearer')) throw unauthorized('Not authorized, no token');
  if (!process.env.CLERK_SECRET_KEY) throw unauthorized('Login is not configured on the server');

  try {
    const { verifyToken } = require('@clerk/backend');
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!claims || !claims.sub) throw new Error('no subject');
    req.authUser = { uid: claims.sub, email: claims.email || '' };
  } catch {
    // Expired, forged or malformed: always 401, never a 500 that would hint at internals.
    throw unauthorized('Not authorized, token validation failed');
  }
  next();
});

module.exports = { requireAuth };
