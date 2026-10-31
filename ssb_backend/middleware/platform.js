const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { config } = require('../config');
const { logger } = require('../utils/logger');
const { getLimiters } = require('./rateLimit');

const DEFAULT_BODY_LIMIT = process.env.JSON_BODY_DEFAULT_LIMIT || '1mb';
const OCR_BODY_LIMIT = config.jsonBodyLimit || '8mb';

/** Allowed browser origins. Requests with no Origin header (mobile apps, curl, server-to-server) are not CORS requests. */
function allowedOrigins() {
  return String(config.corsOriginRaw || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function corsOptions() {
  const list = allowedOrigins();
  const devDefaults = ['http://localhost:3000', 'http://localhost:3103', 'http://localhost:8080'];
  const allow = new Set(list.length ? list : config.isProduction ? [] : devDefaults);
  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      return cb(null, allow.has(origin.replace(/\/+$/, '')));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600
  };
}

function requestId(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '');
  req.requestId = /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

/** One structured line per request: id, method, path (no query), status, duration, user hash. Never bodies. */
function accessLog(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/api/health' || req.path === '/api/health/') return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const uid = req.firebaseUser?.uid;
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Math.round(ms),
      user: uid ? crypto.createHash('sha256').update(uid).digest('hex').slice(0, 12) : undefined
    });
  });
  next();
}

function applyPlatform(app) {
  const limiters = getLimiters();
  app.disable('x-powered-by');
  // /API/x and /api/x are different URLs. Routers are also created with { caseSensitive: true }.
  app.set('case sensitive routing', true);
  app.set('strict routing', false);
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1)); // Render sits behind one proxy

  app.use(requestId);
  app.use(accessLog);
  app.use(
    helmet({
      // This service returns JSON and one small HTML page, so lock everything down.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], styleSrc: ["'unsafe-inline'"], imgSrc: ["'self'", 'data:'] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: config.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false
    })
  );
  app.use(cors(corsOptions()));
  app.use('/api', limiters.ip);
  app.use('/api/ppdt/ocr', express.json({ limit: OCR_BODY_LIMIT }));
  app.use(express.json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  return limiters;
}

module.exports = { applyPlatform, corsOptions, allowedOrigins, requestId, accessLog };
