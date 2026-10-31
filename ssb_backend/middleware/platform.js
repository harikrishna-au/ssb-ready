const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { config } = require('../config');
const { logger } = require('../utils/logger');
const { firebaseProtect } = require('./firebaseAuthMiddleware');
const { buildLimiters } = require('./rateLimit');
const schemas = require('./schemas');

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

/**
 * Per-route policy: runs auth first, then limits, then validates the body.
 * Anything not listed here keeps its own route-level handling (all other /api routes authenticate in their router).
 */
function buildPolicies(l) {
  const ai = [l.aiBurst, l.aiDaily];
  return [
    { method: 'POST', path: '/api/evaluate/ppdt', schema: schemas.evalPpdt, limits: ai },
    { method: 'POST', path: '/api/evaluate/wat', schema: schemas.evalResponses, limits: ai },
    { method: 'POST', path: '/api/evaluate/srt', schema: schemas.evalResponses, limits: ai },
    { method: 'POST', path: '/api/evaluate/tat', schema: schemas.evalTat, limits: ai },
    { method: 'POST', path: '/api/evaluation/run', schema: schemas.pipelineRun, limits: ai },
    { method: 'POST', path: '/api/interview/reply', schema: schemas.interviewReply, limits: ai },
    { method: 'POST', path: '/api/ppdt/pipeline', schema: schemas.ppdtPipeline, limits: ai },
    { method: 'POST', path: '/api/ppdt/ocr', schema: schemas.ocr, limits: ai },
    { method: 'POST', path: '/api/tat/pipeline', schema: schemas.tatPipeline, limits: ai },
    { method: 'GET', path: '/api/images', limits: [l.write] },

    { method: 'POST', path: '/api/firestore/oir/results', schema: schemas.oirResult, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/ppdt/results', schema: schemas.storyResult, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/tat/results', schema: schemas.storyResult, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/wat/results', schema: schemas.responsesResult, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/srt/results', schema: schemas.responsesResult, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/piq', schema: schemas.piq, limits: [l.write] },
    { method: 'POST', path: '/api/firestore/user/profile', schema: schemas.userProfile, limits: [l.write] },
    { method: 'PATCH', path: '/api/firestore/user/type', schema: schemas.userType, limits: [l.write] },

    { method: 'GET', path: '/api/account/export', limits: [l.account] },
    { method: 'DELETE', path: '/api/account', schema: schemas.accountDelete, limits: [l.account] }
  ];
}

function runChain(fns, req, res, done) {
  let i = 0;
  const step = (err) => {
    if (err) return done(err);
    const fn = fns[i++];
    if (!fn) return done();
    try {
      fn(req, res, step);
    } catch (e) {
      done(e);
    }
  };
  step();
}

function policyMiddleware(policies) {
  const table = new Map(policies.map((p) => [`${p.method} ${p.path}`, p]));
  return (req, res, next) => {
    const policy = table.get(`${req.method} ${req.path.replace(/\/+$/, '')}`);
    if (!policy) return next();
    const validate = (r, _s, cb) => {
      if (!policy.schema) return cb();
      const parsed = policy.schema.safeParse(r.body ?? {});
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const err = new Error(`Invalid request: ${(issue.path || []).join('.') || 'body'} ${issue.message}`.slice(0, 200));
        err.statusCode = 400;
        return cb(err);
      }
      r.body = parsed.data;
      cb();
    };
    runChain([firebaseProtect, ...policy.limits, validate], req, res, next);
  };
}

function applyPlatform(app) {
  const limiters = buildLimiters();
  app.disable('x-powered-by');
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
  app.use(policyMiddleware(buildPolicies(limiters)));
  return limiters;
}

module.exports = { applyPlatform, corsOptions, allowedOrigins, buildPolicies, policyMiddleware, requestId, accessLog };
