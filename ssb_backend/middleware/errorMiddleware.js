function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  // In production, hide internal error details for 5xx responses to avoid leaking implementation details.
  const message = isServerError && isProd
    ? 'Internal server error'
    : err.message || 'Internal server error';

  if (isServerError) {
    console.error(`[${req.requestId}] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      requestId: req.requestId
    }
  });
}

module.exports = { notFound, errorHandler };
