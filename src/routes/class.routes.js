const express = require('express');

const controller = require('../controllers/class.controller');
const { create, update, id, list } = require('../validators/classValidators');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

router.use(authenticate);

// Admin: full CRUD. Teacher/student: read only.
router.post('/', authorize('admin'), create, controller.createClass);
router.get('/', list, controller.listClasses);
router.get('/:id', id, controller.getClass);
router.put('/:id', authorize('admin'), id, update, controller.updateClass);
router.delete('/:id', authorize('admin'), id, controller.deleteClass);

module.exports = router;
