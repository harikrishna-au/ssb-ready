const { setErrorReporter } = require('./errorMiddleware');
const { scrub } = require('../utils/logger');

/** Removes request bodies, headers, cookies, query strings and user identity before anything leaves the server. */
function scrubEvent(event) {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split('?')[0];
  }
  delete event.user;
  if (event.extra) event.extra = scrub(event.extra);
  return event;
}

/** Starts Sentry only when SENTRY_DSN is set. Safe to call when it is not. */
function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    beforeSend: scrubEvent
  });
  setErrorReporter((err, req) => Sentry.withScope((scope) => {
    scope.setTag('request_id', req?.requestId);
    Sentry.captureException(err);
  }));
  return true;
}

module.exports = { initSentry, scrubEvent };
