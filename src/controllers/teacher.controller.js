const bcrypt = require('bcryptjs');

const config = require('../config');
const { db, now, insert, findById, removeById } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { applyListOptions } = require('../utils/query');

/**
 * POST /api/teachers  (admin only)
 * Creates the linked admin/teacher login account for the teacher.
 */
const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, password } = req.body;

  if (db.teachers.some((t) => t.email === email)) {
    throw ApiError.conflict('A teacher with this email already exists');
  }
  if (db.users.some((u) => u.email === email)) {
    throw ApiError.conflict('A user account with this email already exists');
  }

  const teacher = insert('teachers', {
    userId: null,
    name,
    email,
    phone,
    subject,
    createdAt: now(),
  });

  // Always create a login account so the teacher can actually authenticate.
  const temporaryPassword = password || 'Teacher@123';
  const user = insert('users', {
    name,
    email,
    password: await bcrypt.hash(temporaryPassword, config.bcrypt.saltRounds),
    role: 'teacher',
    createdAt: now(),
  });
  teacher.userId = user.id;

  return sendSuccess(res, 201, 'Teacher created successfully', {
    teacher,
    temporaryPassword: password ? undefined : temporaryPassword,
  });
});

/** GET /api/teachers (admin + teacher) */
const listTeachers = asyncHandler(async (req, res) => {
  const { page, limit, sort, search } = req.query;
  const { records, meta } = applyListOptions(
    db.teachers,
    { page, limit, sort, search },
    ['name', 'email', 'subject', 'phone']
  );
  return sendSuccess(res, 200, 'Teachers retrieved', { teachers: records, ...meta });
});

/** GET /api/teachers/:id (admin + teacher) */
const getTeacher = asyncHandler(async (req, res) => {
  const teacher = findById('teachers', req.params.id);
  if (!teacher) throw ApiError.notFound('Teacher not found');
  return sendSuccess(res, 200, 'Teacher retrieved', { teacher });
});

/** PUT /api/teachers/:id (admin only) */
const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = findById('teachers', req.params.id);
  if (!teacher) throw ApiError.notFound('Teacher not found');

  const { name, email, phone, subject } = req.body;

  if (email && email !== teacher.email) {
    if (db.teachers.some((t) => t.email === email && String(t.id) !== String(teacher.id))) {
      throw ApiError.conflict('A teacher with this email already exists');
    }
  }

  if (name !== undefined) teacher.name = name;
  if (email !== undefined) teacher.email = email;
  if (phone !== undefined) teacher.phone = phone;
  if (subject !== undefined) teacher.subject = subject;

  const linkedUser = teacher.userId ? findById('users', teacher.userId) : null;
  if (linkedUser) {
    if (name !== undefined) linkedUser.name = name;
    if (email !== undefined) linkedUser.email = email;
  }

  return sendSuccess(res, 200, 'Teacher updated successfully', { teacher });
});

/** DELETE /api/teachers/:id (admin only) */
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = findById('teachers', req.params.id);
  if (!teacher) throw ApiError.notFound('Teacher not found');

  const removed = removeById('teachers', teacher.id);
  if (teacher.userId) {
    db.users = db.users.filter((u) => String(u.id) !== String(teacher.userId));
  }

  return sendSuccess(res, 200, 'Teacher deleted successfully', { id: removed.id });
});

module.exports = { createTeacher, listTeachers, getTeacher, updateTeacher, deleteTeacher };
