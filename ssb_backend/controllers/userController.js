const supabase = require('../config/supabase');
const { asyncHandler } = require('../middleware/asyncHandler');

const getUserProfile = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) {
    const profileError = new Error(error.message || 'Failed to fetch profile');
    profileError.statusCode = 400;
    throw profileError;
  }

  res.json({ success: true, data });
});

const loginProxy = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const authError = new Error(error.message || 'Invalid credentials');
    authError.statusCode = 401;
    throw authError;
  }

  res.json({ success: true, data });
});

const signupProxy = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const signupError = new Error(error.message || 'Sign up failed');
    signupError.statusCode = 400;
    throw signupError;
  }

  res.status(201).json({ success: true, data });
});

module.exports = { getUserProfile, loginProxy, signupProxy };
