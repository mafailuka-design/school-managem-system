const bcrypt = require('bcryptjs');

const config = require('../config');
const { db, now, insert } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { sendSuccess } = require('../utils/ApiResponse');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

/** Strip the password hash before anything is sent to a client. */
const publicUser = (user) => {
  const { password, ...safe } = user;
  return safe;
};

/**
 * POST /api/auth/register
 * Creates a user account. Public registration only creates students; the
 * matching student record is created too so the profile is always reachable.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, classId, class: className } = req.body;

  const existingUser = db.users.find((u) => u.email === email);
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const hashed = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const user = insert('users', {
    name,
    email,
    password: hashed,
    role: role || 'student',
    createdAt: now(),
  });

  // Link a student record to the new account (if not already linked).
  const existingStudent = db.students.find((s) => s.email === email);
  if (!existingStudent) {
    insert('students', {
      userId: user.id,
      name,
      email,
      phone: null,
      class: className || null,
      classId: classId ? Number(classId) : null,
      createdAt: now(),
    });
  }

  const token = signToken(user);
  res.cookie('token', token, COOKIE_OPTIONS);

  return sendSuccess(res, 201, 'Registration successful', {
    token,
    user: publicUser(user),
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = db.users.find((u) => u.email === email);
  // Compare against a dummy hash when the user is missing so that response
  // timing does not reveal whether an email is registered.
  const hash = user ? user.password : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const match = await bcrypt.compare(password, hash);

  if (!user || !match) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken(user);
  res.cookie('token', token, COOKIE_OPTIONS);

  return sendSuccess(res, 200, 'Login successful', {
    token,
    user: publicUser(user),
  });
});

/**
 * GET /api/auth/me
 * Returns the authenticated user (never the password).
 */
const me = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, 'Authenticated user retrieved', { user: req.user })
);

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  return sendSuccess(res, 200, 'Logout successful', null);
});

/**
 * PATCH /api/auth/password
 * Change own password.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!user) throw ApiError.notFound('User not found');

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw ApiError.unauthorized('Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  return sendSuccess(res, 200, 'Password updated successfully', null);
});

/**
 * GET /api/auth/users  (admin only) - list all accounts without passwords.
 */
const listUsers = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, 'Users retrieved', {
    users: db.users.map(publicUser),
  })
);

module.exports = {
  register,
  login,
  me,
  logout,
  changePassword,
  listUsers,
};
