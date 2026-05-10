const { admin } = require('../config/firebase');
const { asyncHandler } = require('./asyncHandler');

const firebaseProtect = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    const error = new Error('Not authorized, no token');
    error.statusCode = 401;
    throw error;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  req.firebaseUser = decoded;
  next();
});

module.exports = { firebaseProtect };
