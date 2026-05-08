const { createClient } = require('@supabase/supabase-js');
const { loadEnv } = require('./env');

loadEnv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
