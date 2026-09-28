const express = require('express');

const router = express.Router();

const config = require('../config');
const { db } = require('../data/db');

/** Liveness probe. */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'School Management System API is running',
    data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
  });
});

/** Index of the API surface. */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'School Management System API',
    data: {
      environment: config.env,
      endpoints: {
        auth: '/api/auth',
        students: '/api/students',
        teachers: '/api/teachers',
        classes: '/api/classes',
        subjects: '/api/subjects',
        results: '/api/results',
      },
      counts: {
        users: db.users.length,
        students: db.students.length,
        teachers: db.teachers.length,
        classes: db.classes.length,
        subjects: db.subjects.length,
        results: db.results.length,
      },
    },
  });
});

module.exports = router;
