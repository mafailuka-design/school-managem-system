const { db, now, insert, findById, removeById } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { applyListOptions } = require('../utils/query');

/** POST /api/classes (admin only) */
const createClass = asyncHandler(async (req, res) => {
  const { name, description, teacherId } = req.body;

  if (db.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw ApiError.conflict('A class with this name already exists');
  }
  if (teacherId && !findById('teachers', teacherId)) {
    throw ApiError.badRequest('teacherId does not match an existing teacher');
  }

  const klass = insert('classes', {
    name,
    description: description || null,
    teacherId: teacherId ? Number(teacherId) : null,
    createdAt: now(),
  });

  return sendSuccess(res, 201, 'Class created successfully', { class: klass });
});

/** GET /api/classes (all authenticated roles) */
const listClasses = asyncHandler(async (req, res) => {
  const { page, limit, sort, search } = req.query;
  const { records, meta } = applyListOptions(
    db.classes,
    { page, limit, sort, search },
    ['name', 'description']
  );
  return sendSuccess(res, 200, 'Classes retrieved', { classes: records, ...meta });
});

/** GET /api/classes/:id - includes the students and teacher in the class. */
const getClass = asyncHandler(async (req, res) => {
  const klass = findById('classes', req.params.id);
  if (!klass) throw ApiError.notFound('Class not found');

  const students = db.students.filter(
    (student) => String(student.classId) === String(klass.id)
  );
  const teacher = klass.teacherId ? findById('teachers', klass.teacherId) : null;

  return sendSuccess(res, 200, 'Class retrieved', { class: klass, students, teacher });
});

/** PUT /api/classes/:id (admin only) */
const updateClass = asyncHandler(async (req, res) => {
  const klass = findById('classes', req.params.id);
  if (!klass) throw ApiError.notFound('Class not found');

  const { name, description, teacherId } = req.body;

  if (name && name.toLowerCase() !== klass.name.toLowerCase()) {
    if (db.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw ApiError.conflict('A class with this name already exists');
    }
    // Keep denormalised student class names in step with the rename.
    db.students
      .filter((s) => String(s.classId) === String(klass.id))
      .forEach((s) => {
        s.class = name;
      });
    klass.name = name;
  }

  if (description !== undefined) klass.description = description;

  if (teacherId !== undefined) {
    if (teacherId !== null && !findById('teachers', teacherId)) {
      throw ApiError.badRequest('teacherId does not match an existing teacher');
    }
    klass.teacherId = teacherId === null ? null : Number(teacherId);
  }

  return sendSuccess(res, 200, 'Class updated successfully', { class: klass });
});

/** DELETE /api/classes/:id (admin only) - blocked while students are attached. */
const deleteClass = asyncHandler(async (req, res) => {
  const klass = findById('classes', req.params.id);
  if (!klass) throw ApiError.notFound('Class not found');

  const attached = db.students.filter(
    (s) => String(s.classId) === String(klass.id)
  );
  if (attached.length) {
    throw ApiError.conflict(
      'Cannot delete a class that still has students assigned to it'
    );
  }

  const removed = removeById('classes', klass.id);
  return sendSuccess(res, 200, 'Class deleted successfully', { id: removed.id });
});

module.exports = { createClass, listClasses, getClass, updateClass, deleteClass };
