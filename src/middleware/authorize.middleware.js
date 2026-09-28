const ApiError = require('../utils/ApiError');

/**
 * Role gate. Must run after `authenticate` so req.user exists.
 * Returns 403 Forbidden when the authenticated user's role is not allowed.
 */
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.length || !allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: role "${req.user.role}" is not allowed to perform this action`
        )
      );
    }
    return next();
  };

module.exports = authorize;
