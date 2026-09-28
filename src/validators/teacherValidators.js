const { z } = require('zod');

const { validate, schemas } = require('./common');

const createBody = z
  .object({
    name: schemas.name,
    email: schemas.email,
    phone: schemas.phone,
    subject: schemas.trimmed(2, 100),
    // Optional: creates the linked login account for this teacher.
    password: schemas.password.optional(),
  })
  .strict();

const updateBody = z
  .object({
    name: schemas.name,
    email: schemas.email,
    phone: schemas.phone,
    subject: schemas.trimmed(2, 100),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const id = validate({ params: schemas.idParam });
const list = validate({ query: schemas.paginationQuery });

module.exports = { create: validate({ body: createBody }), update: validate({ body: updateBody }), id, list };
