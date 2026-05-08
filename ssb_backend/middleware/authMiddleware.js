const supabase = require('../config/supabase');
const { asyncHandler } = require('./asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    const error = new Error('Not authorized, no token');
    error.statusCode = 401;
    throw error;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    const authError = new Error('Not authorized, token validation failed');
    authError.statusCode = 401;
    throw authError;
  }

  req.user = user;
  next();
});

module.exports = { protect };
