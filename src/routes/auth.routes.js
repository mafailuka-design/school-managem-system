const express = require('express');

const controller = require('../controllers/auth.controller');
const { register, login, changePassword } = require('../validators/authValidators');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

// Credential endpoints are rate limited against brute force / enumeration.
router.post('/register', authLimiter, register, controller.register);
router.post('/login', authLimiter, login, controller.login);

router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.patch('/password', authenticate, changePassword, controller.changePassword);
router.get('/users', authenticate, authorize('admin'), controller.listUsers);

module.exports = router;
