const bcrypt = require('bcryptjs');

const config = require('../config');
const { db, now, insert, findById, removeById } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { applyListOptions } = require('../utils/query');

/** Resolves the student record that belongs to the logged-in user. */
const ownStudent = (user) =>
  db.students.find(
    (student) => String(student.userId) === String(user.id) || student.email === user.email
  );

/**
 * POST /api/students  (admin only)
 * Optionally creates the linked login account when a password is supplied.
 */
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, phone, class: className, classId, password } = req.body;

  if (db.students.some((s) => s.email === email)) {
    throw ApiError.conflict('A student with this email already exists');
  }
  const linkedClass = findById('classes', classId);
  if (!linkedClass) throw ApiError.badRequest('classId does not match an existing class');
  if (db.users.some((u) => u.email === email)) {
    throw ApiError.conflict('A user account with this email already exists');
  }

  const student = insert('students', {
    userId: null,
    name,
    email,
    phone,
    class: linkedClass.name,
    classId: linkedClass.id,
    createdAt: now(),
  });

  // Link (or create) the login account for this student.
  let temporaryPassword;
  if (password) {
    const user = insert('users', {
      name,
      email,
      password: await bcrypt.hash(password, config.bcrypt.saltRounds),
      role: 'student',
      createdAt: now(),
    });
    student.userId = user.id;
  } else {
    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      student.userId = existing.id;
    } else {
      temporaryPassword = 'Student@123';
      const user = insert('users', {
        name,
        email,
        password: await bcrypt.hash(temporaryPassword, config.bcrypt.saltRounds),
        role: 'student',
        createdAt: now(),
      });
      student.userId = user.id;
    }
  }

  return sendSuccess(res, 201, 'Student created successfully', {
    student,
    // Returned exactly once so the admin can share it; never stored in plain text.
    temporaryPassword: temporaryPassword || undefined,
  });
});

/**
 * GET /api/students
 * admin + teacher: all students. student: their own record only.
 */
const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, sort, search } = req.query;

  let records = db.students;
  if (req.user.role === 'student') {
    const self = ownStudent(req.user);
    records = self ? [self] : [];
  }

  const { records: page_records, meta } = applyListOptions(
    records,
    { page, limit, sort, search },
    ['name', 'email', 'class', 'phone']
  );

  return sendSuccess(res, 200, 'Students retrieved', {
    students: page_records,
    ...meta,
  });
});

/** GET /api/students/me - the authenticated student's own profile. */
const getMyProfile = asyncHandler(async (req, res) => {
  const student = ownStudent(req.user);
  if (!student) throw ApiError.notFound('Student profile not found for this account');
  return sendSuccess(res, 200, 'Profile retrieved', { student });
});

/**
 * GET /api/students/:id
 * admin + teacher: any student. student: only themselves.
 */
const getStudent = asyncHandler(async (req, res) => {
  const student = findById('students', req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  if (req.user.role === 'student') {
    const self = ownStudent(req.user);
    if (!self || String(self.id) !== String(student.id)) {
      throw ApiError.forbidden('Students may only view their own profile');
    }
  }

  return sendSuccess(res, 200, 'Student retrieved', { student });
});

/** PUT /api/students/:id (admin only) */
const updateStudent = asyncHandler(async (req, res) => {
  const student = findById('students', req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const { name, email, phone, class: className, classId } = req.body;

  if (email && email !== student.email) {
    if (db.students.some((s) => s.email === email && String(s.id) !== String(student.id))) {
      throw ApiError.conflict('A student with this email already exists');
    }
  }

  if (classId || className) {
    const target = findById('classes', classId || student.classId);
    if (!target) throw ApiError.badRequest('classId does not match an existing class');
    student.classId = target.id;
    student.class = className || target.name;
  }

  if (name !== undefined) student.name = name;
  if (email !== undefined) student.email = email;
  if (phone !== undefined) student.phone = phone;

  // Keep the linked account in sync where it makes sense.
  const linkedUser = student.userId ? findById('users', student.userId) : null;
  if (linkedUser) {
    if (name !== undefined) linkedUser.name = name;
    if (email !== undefined) linkedUser.email = email;
  }

  return sendSuccess(res, 200, 'Student updated successfully', { student });
});

/** DELETE /api/students/:id (admin only) - cascades their results. */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = findById('students', req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const removedResults = db.results.filter(
    (r) => String(r.studentId) === String(student.id)
  ).length;
  db.results = db.results.filter(
    (r) => String(r.studentId) !== String(student.id)
  );

  if (student.userId) {
    db.users = db.users.filter((u) => String(u.id) !== String(student.userId));
  }

  const removed = removeById('students', student.id);

  return sendSuccess(res, 200, 'Student deleted successfully', {
    id: removed.id,
    deletedResults: removedResults,
  });
});

module.exports = {
  createStudent,
  listStudents,
  getMyProfile,
  getStudent,
  updateStudent,
  deleteStudent,
  ownStudent,
};
