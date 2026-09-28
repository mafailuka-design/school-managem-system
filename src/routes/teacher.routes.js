const express = require('express');

const controller = require('../controllers/teacher.controller');
const { create, update, id, list } = require('../validators/teacherValidators');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

router.use(authenticate);

// Admin: full CRUD. Teacher: read only. Student: no access (403).
router.post('/', authorize('admin'), create, controller.createTeacher);
router.get('/', authorize('admin', 'teacher'), list, controller.listTeachers);
router.get('/:id', authorize('admin', 'teacher'), id, controller.getTeacher);
router.put('/:id', authorize('admin'), id, update, controller.updateTeacher);
router.delete('/:id', authorize('admin'), id, controller.deleteTeacher);

module.exports = router;
