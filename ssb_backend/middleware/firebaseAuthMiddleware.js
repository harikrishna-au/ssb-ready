const { admin } = require('../config/firebase');
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

/**
 * Accepts a Clerk session token (web app) or a Firebase ID token (mobile app).
 * Either way `req.firebaseUser.uid` is set so controllers need no changes.
 */
const firebaseProtect = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw unauthorized('Not authorized, no token');

  if (isClerkToken(token)) {
    if (!process.env.CLERK_SECRET_KEY) throw unauthorized('Clerk auth is not configured');
    const { verifyToken } = require('@clerk/backend');
    try {
      const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      req.firebaseUser = { uid: claims.sub, email: claims.email || '' };
    } catch {
      throw unauthorized('Not authorized, token validation failed');
    }
    return next();
  }

  req.firebaseUser = await admin.auth().verifyIdToken(token);
  next();
});

module.exports = { firebaseProtect };
