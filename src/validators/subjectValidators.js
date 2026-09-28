const { z } = require('zod');

const { validate, schemas } = require('./common');

const createBody = z
  .object({
    name: schemas.trimmed(2, 100),
    code: schemas.trimmed(2, 20).regex(/^[A-Za-z0-9-]+$/, 'Code may only contain letters, numbers and hyphens'),
    description: schemas.trimmed(2, 500).optional(),
  })
  .strict()
  .refine((data) => data.code === data.code.toUpperCase().trim() || /^[A-Z0-9-]+$/.test(data.code), {
    message: 'Code must be uppercase',
    path: ['code'],
  });

const updateBody = z
  .object({
    name: schemas.trimmed(2, 100),
    code: schemas.trimmed(2, 20).regex(/^[A-Za-z0-9-]+$/, 'Code may only contain letters, numbers and hyphens'),
    description: schemas.trimmed(2, 500).optional(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const id = validate({ params: schemas.idParam });
const list = validate({ query: schemas.paginationQuery });

module.exports = { create: validate({ body: createBody }), update: validate({ body: updateBody }), id, list };
