const rateLimit = require('express-rate-limit');

const config = require('../config');
const ApiError = require('../utils/ApiError');

const handler = (message) => (req, res, next) =>
  next(ApiError.tooManyRequests(message));

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler(
    'Too many requests from this IP, please try again later'
  ),
};

/** Tight limiter for credential endpoints to slow down brute forcing. */
const authLimiter = rateLimit({
  ...common,
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again in 15 minutes',
});

/** Looser global limiter applied to the whole /api surface. */
const apiLimiter = rateLimit({
  ...common,
  windowMs: config.rateLimit.apiWindowMs,
  max: config.rateLimit.apiMax,
});

module.exports = { authLimiter, apiLimiter };
