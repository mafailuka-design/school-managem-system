const { z } = require('zod');

const { validate, schemas } = require('./common');

/* -------------------------------------------------------------------------- */
/* POST /api/auth/register                                                     */
/* -------------------------------------------------------------------------- */

const registerBody = z
  .object({
    name: schemas.name,
    email: schemas.email,
    password: schemas.password,
    // The public register route only ever provisions student accounts.
    // Teacher/admin accounts are created by an admin through the CRUD routes.
    role: schemas.role.optional(),
    // Optional class placement; a linked student record is always created.
    classId: schemas.idRef.optional(),
    class: schemas.trimmed(2, 100).optional(),
  })
  .strict()
  .refine((data) => data.role === undefined || data.role === 'student', {
    message: 'Public registration only allows the "student" role',
    path: ['role'],
  });

const register = validate({ body: registerBody });

/* -------------------------------------------------------------------------- */
/* POST /api/auth/login                                                        */
/* -------------------------------------------------------------------------- */

const loginBody = z
  .object({
    email: schemas.email,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const login = validate({ body: loginBody });

/* -------------------------------------------------------------------------- */
/* PATCH /api/auth/password                                                    */
/* -------------------------------------------------------------------------- */

const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: schemas.password,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

const changePassword = validate({ body: changePasswordBody });

module.exports = { register, login, changePassword };
