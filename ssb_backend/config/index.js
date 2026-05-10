const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function trimTrailingSlash(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

/** Resolve public API base URL — prefer PUBLIC_URL, then BACKEND_PUBLIC_URL (alias). */
function resolvePublicUrl() {
  const raw = process.env.PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || '';
  return trimTrailingSlash(raw);
}

let validated = false;

function validateRequired() {
  const requiredKeys = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function loadEnv() {
  if (validated) return;
  validateRequired();
  validated = true;
}

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',

  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || '0.0.0.0',

  /** HTTPS base URL for this API (no trailing slash). Set in production so responses never rely on hardcoded hosts. */
  publicUrl: resolvePublicUrl(),

  corsOriginRaw: process.env.CORS_ORIGIN || '',

  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '15mb',

  jwtSecret: process.env.JWT_SECRET,

  supabase: Object.freeze({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  }),

  openai: Object.freeze({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    visionModel:
      process.env.OPENAI_VISION_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini',
    maxPromptChars: Number(process.env.AI_PROMPT_MAX_CHARS || 12000)
  }),

  firebase: Object.freeze({
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''
  })
});

/**
 * Express `cors` origin option: '*' if CORS_ORIGIN unset; otherwise string or array.
 */
function getCorsOriginOption() {
  const raw = config.corsOriginRaw;
  if (!raw || !String(raw).trim()) return '*';
  const list = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return '*';
  if (list.length === 1) return list[0];
  return list;
}

module.exports = {
  config,
  loadEnv,
  getCorsOriginOption,
  validateRequired
};
