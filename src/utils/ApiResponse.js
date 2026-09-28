/**
 * Every success response uses this envelope:
 *   { success: true, message, data }
 * Errors use { success: false, message, ... } from the error middleware.
 */
const sendSuccess = (res, statusCode, message, data) =>
  res.status(statusCode).json({ success: true, message, data });

module.exports = { sendSuccess };
