const { createClient } = require('@supabase/supabase-js');
const { config, loadEnv } = require('./index');

loadEnv();

const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
