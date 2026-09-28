const { z } = require('zod');

const { TERMS, SESSIONS, GRADE_SCALE } = require('../data/db');
const { ALL_ROLES } = require('../constants/roles');
const ApiError = require('../utils/ApiError');

/* -------------------------------------------------------------------------- */
/* Reusable field schemas                                                      */
/* -------------------------------------------------------------------------- */

const trimmed = (min, max) =>
  z.string().trim().min(min, `Must be at least ${min} characters`).max(max);

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Must be a valid email address')
  .max(255, 'Email must be at most 255 characters')
  .toLowerCase();

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,19}$/, 'Must be a valid phone number')
  .max(20, 'Phone number must be at most 20 characters');

// 8+ chars with an uppercase, a lowercase and a number.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const name = trimmed(2, 100);

const role = z.enum(ALL_ROLES, {
  errorMap: () => ({ message: `Role must be one of: ${ALL_ROLES.join(', ')}` }),
});

const score = z
  .number({ invalid_type_error: 'Score must be a number' })
  .min(0, 'Score must be between 0 and 100')
  .max(100, 'Score must be between 0 and 100');

const term = z.enum(TERMS, {
  errorMap: () => ({ message: `Term must be one of: ${TERMS.join(', ')}` }),
});

const session = z.enum(SESSIONS, {
  errorMap: () => ({ message: `Session must be one of: ${SESSIONS.join(', ')}` }),
});

const grade = z.enum(GRADE_SCALE.map((band) => band.grade), {
  errorMap: () => ({
    message: `Grade must be one of: ${GRADE_SCALE.map((b) => b.grade).join(', ')}`,
  }),
});

/** Route params are always string ids; ids are positive integers. */
const idParam = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a positive integer'),
});

/**
 * A foreign-key id in a JSON body. Accepts a number or a numeric string and
 * normalises both to a number, so `{"studentId": 1}` and
 * `{"studentId": "1"}` behave identically.
 */
const idRef = z
  .union([
    z.number().int('id must be an integer').positive('id must be a positive integer'),
    z.string().regex(/^\d+$/, 'id must be a positive integer'),
  ])
  .transform((value) => Number(value));

/** Same as idRef but also allows an explicit null (e.g. unassigning a link). */
const nullableIdRef = z.union([idRef, z.null()]);

/* -------------------------------------------------------------------------- */
/* Pagination / sorting query params                                           */
/* -------------------------------------------------------------------------- */

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['asc', 'desc']).default('asc'),
  // `?search=` (blank) is treated as "no filter" rather than a validation error.
  search: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
});

/* -------------------------------------------------------------------------- */
/* Middleware factory                                                          */
/* -------------------------------------------------------------------------- */

const formatIssues = (issues) =>
  issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

/**
 * Validates the given request parts with zod and replaces them with the
 * parsed (coerced, stripped) values so controllers can trust their input.
 */
const validate = (schemas) => (req, res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        throw ApiError.badRequest('Validation failed', formatIssues(result.error.issues));
      }
      // req.query is a getter in some Express versions; assign defensively.
      if (part === 'query') {
        Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
      } else {
        req[part] = result.data;
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validate,
  schemas: {
    email,
    phone,
    password,
    name,
    role,
    score,
    term,
    session,
    grade,
    idParam,
    idRef,
    nullableIdRef,
    paginationQuery,
    trimmed,
  },
};
