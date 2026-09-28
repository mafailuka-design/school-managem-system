const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const requestLogger = require('./middleware/logger.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { seed } = require('./data/db');

const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const classRoutes = require('./routes/class.routes');
const subjectRoutes = require('./routes/subject.routes');
const resultRoutes = require('./routes/result.routes');
const indexRoutes = require('./routes/index');

const app = express();

// Trust proxy if running behind one (useful for rate limit keys).
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

// Core middlewares.
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(requestLogger);

// Global rate limiting for /api.
app.use('/api', apiLimiter);

// Health and root.
app.use('/', indexRoutes);

// API routes.
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/results', resultRoutes);

// Error handlers (must be last).
app.use(notFound);
app.use(errorHandler);

// Bootstraps the in-memory seed data for the first request cycle.
const ensureSeeded = (async () => {
  if (process.env.SEEDED === 'true') return;
  await seed();
  process.env.SEEDED = 'true';
})();

app._ensureSeeded = ensureSeeded;

module.exports = app;
