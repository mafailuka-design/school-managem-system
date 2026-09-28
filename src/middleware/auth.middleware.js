const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/token');
const { findById } = require('../data/db');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
};

/**
 * Verifies the JWT, resolves the live user record and attaches it to req.user.
 * Any missing/invalid/expired token results in 401 Unauthorized.
 */
const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(ApiError.unauthorized('Authentication required: no token provided'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Authentication required: token has expired'
        : 'Authentication required: invalid token';
    return next(ApiError.unauthorized(message));
  }

  const user = findById('users', payload.sub);
  if (!user) {
    return next(ApiError.unauthorized('Authentication required: user no longer exists'));
  }

  // Never let the hashed password travel further down the pipeline.
  const { password, ...safeUser } = user;
  req.user = safeUser;
  return next();
};

module.exports = authenticate;
