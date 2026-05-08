const dotenv = require('dotenv');

function loadEnv() {
  dotenv.config();

  const requiredKeys = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = { loadEnv };
