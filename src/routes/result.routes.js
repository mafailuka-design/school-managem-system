const express = require('express');

const controller = require('../controllers/result.controller');
const { create, update, id, list } = require('../validators/resultValidators');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

router.use(authenticate);

// Admin: full CRUD. Teacher: create/read/update. Student: read own only.
router.post('/', authorize('admin', 'teacher'), create, controller.createResult);
router.get('/', list, controller.listResults);
router.get('/:id', id, controller.getResult);
router.put('/:id', authorize('admin', 'teacher'), id, update, controller.updateResult);
router.delete('/:id', authorize('admin'), id, controller.deleteResult);

module.exports = router;
