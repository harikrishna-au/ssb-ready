/**
 * Structured (one JSON object per line) logger with PII scrubbing.
 *
 * Rules: never log candidate text (stories, responses, PIQ, chat), tokens, e-mail or phone numbers.
 * Anything under a sensitive key is replaced, long strings are truncated, and Error objects are
 * reduced to name/message/stack so request payloads attached to them cannot leak.
 */
const SENSITIVE = /(story|stories|piq|response|chat|history|message|text|image|base64|token|authorization|cookie|secret|password|key|email|phone|mobile|dob|dateofbirth|address|payload|body|perception|feedback|note)/i;
const MAX_STRING = 300;
const MAX_DEPTH = 4;

function scrub(value, depth = 0, keyName = '') {
  if (value == null) return value;
  if (keyName && SENSITIVE.test(keyName) && !/^(requestId|statusCode|status)$/.test(keyName)) return '[redacted]';
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message), stack: scrubString(value.stack || '').split('\n').slice(0, 6).join('\n') };
  }
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrub(v, depth + 1, k);
  return out;
}

function scrubString(s) {
  return String(s)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, '[jwt]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, '[key]')
    .slice(0, MAX_STRING);
}

function write(level, message, meta) {
  if (process.env.LOG_SILENT === '1') return;
  const line = {
    time: new Date().toISOString(),
    level,
    msg: scrubString(message instanceof Error ? message.message : message),
    ...(meta !== undefined && meta !== '' ? { meta: scrub(meta) } : {})
  };
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta)
};

module.exports = { logger, scrub, scrubString };
