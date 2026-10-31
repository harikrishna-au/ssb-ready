const { logger } = require('../utils/logger');

function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
}

/** Body-parser and other library errors carry `status`; our own errors carry `statusCode`. */
function statusOf(err) {
  const s = err.statusCode || err.status;
  return Number.isInteger(s) && s >= 400 && s < 600 ? s : 500;
}

let captureException = null;
function setErrorReporter(fn) {
  captureException = fn;
}

function errorHandler(err, req, res, _next) {
  const statusCode = statusOf(err);
  const isServerError = statusCode >= 500;
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  let message = err.message || 'Internal server error';
  if (err.type === 'entity.too.large') message = 'Request body is too large';
  else if (err.type === 'entity.parse.failed') message = 'Request body is not valid JSON';
  if (isServerError && isProd) message = 'Internal server error';

  if (isServerError) {
    logger.error('request failed', { requestId: req.requestId, method: req.method, path: req.path, err });
    if (captureException) captureException(err, req);
  }

  if (!res.headersSent) {
    res.status(statusCode).json({ success: false, error: { message, requestId: req.requestId } });
  }
}

module.exports = { notFound, errorHandler, setErrorReporter, statusOf };
