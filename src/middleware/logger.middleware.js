const morgan = require('morgan');

const config = require('../config');

/**
 * Request logger. Every request is logged with:
 *   timestamp | method | url | status code | response size | duration
 * e.g. [2026-09-28T10:15:22.104Z] GET /api/students 200 412B - 3.115 ms
 */
const requestLogger = morgan(
  ':date[iso] :method :url :status :res[content-length] - :response-time ms',
  {
    skip: (req) => req.url === '/health',
    stream: {
      write: (message) => process.stdout.write(`${message.trim()}\n`),
    },
  }
);

module.exports = requestLogger;
