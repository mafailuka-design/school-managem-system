const jwt = require('jsonwebtoken');

const config = require('../config');

const signToken = (user) =>
  jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

/** Throws on invalid signature, expired token, or malformed token. */
const verifyToken = (token) => jwt.verify(token, config.jwt.secret);

module.exports = { signToken, verifyToken };
