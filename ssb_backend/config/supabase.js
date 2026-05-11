const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { config, loadEnv } = require('./index');

loadEnv();

// Node.js < 22 has no native WebSocket; Supabase Realtime requires one at client init.
const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket
  }
});

module.exports = supabase;
