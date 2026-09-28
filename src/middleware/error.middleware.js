const ApiError = require('../utils/ApiError');
const config = require('../config');

/** Unmatched routes -> consistent 404 body. */
const notFound = (req, res, next) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Translate common third-party errors into our own envelope.
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication required: invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication required: token has expired';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Payload too large';
  }

  if (statusCode >= 500) {
    // Log the stack server-side; never leak internals to the client.
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, error);
    if (config.env === 'production') message = 'Internal server error';
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (config.env !== 'production' && statusCode >= 500) body.stack = error.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
