const express = require('express');

const controller = require('../controllers/subject.controller');
const { create, update, id, list } = require('../validators/subjectValidators');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

router.use(authenticate);

// Admin: full CRUD. Teacher/student: read only.
router.post('/', authorize('admin'), create, controller.createSubject);
router.get('/', list, controller.listSubjects);
router.get('/:id', id, controller.getSubject);
router.put('/:id', authorize('admin'), id, update, controller.updateSubject);
router.delete('/:id', authorize('admin'), id, controller.deleteSubject);

module.exports = router;
