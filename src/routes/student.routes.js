const express = require('express');

const controller = require('../controllers/student.controller');
const { create, update, id, list } = require('../validators/studentValidators');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

router.use(authenticate);

// Admin: full CRUD. Teacher: read only. Student: own profile only.
router.post('/', authorize('admin'), create, controller.createStudent);
router.get('/', list, controller.listStudents);
router.get('/me', controller.getMyProfile);
router.get('/:id', id, controller.getStudent);
router.put('/:id', authorize('admin'), id, update, controller.updateStudent);
router.delete('/:id', authorize('admin'), id, controller.deleteStudent);

module.exports = router;
