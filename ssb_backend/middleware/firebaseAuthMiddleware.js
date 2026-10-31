const { asyncHandler } = require('./asyncHandler');

function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

/** Clerk session JWTs carry an issuer on a clerk.* / *.clerk.accounts.dev host. */
function isClerkToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return typeof payload.iss === 'string' && payload.iss.includes('clerk');
  } catch {
    return false;
  }
}

// Loaded lazily so tests can run without Firebase credentials.
const firebaseAdmin = () => require('../config/firebase').admin;

/**
 * Accepts a Clerk session token (web app) or a Firebase ID token (mobile app).
 * Either way `req.firebaseUser.uid` is set so controllers need no changes.
 * `req.firebaseUser.provider` is 'clerk' or 'firebase'.
 *
 * Idempotent: if an earlier middleware already authenticated this request it does nothing,
 * so the platform layer can authenticate before rate limiting and validation.
 */
const firebaseProtect = asyncHandler(async (req, _res, next) => {
  if (req.firebaseUser?.uid) return next();

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (!token || (scheme && scheme.toLowerCase() !== 'bearer')) throw unauthorized('Not authorized, no token');

  if (isClerkToken(token)) {
    if (!process.env.CLERK_SECRET_KEY) throw unauthorized('Clerk auth is not configured');
    const { verifyToken } = require('@clerk/backend');
    try {
      const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      if (!claims || !claims.sub) throw new Error('no subject');
      req.firebaseUser = { uid: claims.sub, email: claims.email || '', provider: 'clerk' };
    } catch {
      throw unauthorized('Not authorized, token validation failed');
    }
    return next();
  }

  try {
    const decoded = await firebaseAdmin().auth().verifyIdToken(token);
    if (!decoded || !decoded.uid) throw new Error('no uid');
    req.firebaseUser = { ...decoded, provider: 'firebase' };
  } catch {
    // Expired, forged or malformed: always 401, never a 500 that would hint at internals.
    throw unauthorized('Not authorized, token validation failed');
  }
  next();
});

module.exports = { firebaseProtect, isClerkToken };
