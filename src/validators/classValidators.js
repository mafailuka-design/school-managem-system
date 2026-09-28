const { z } = require('zod');

const { validate, schemas } = require('./common');

const className = schemas.trimmed(2, 100);

// teacherId may be a real id, or null to unassign the class teacher.
const teacherRef = schemas.nullableIdRef;

const createBody = z
  .object({
    name: className,
    description: schemas.trimmed(2, 500).optional(),
    // Optional link to a teacher; validated as a real id in the controller.
    teacherId: schemas.idRef.optional(),
  })
  .strict();

/** PUT is a full replace of the mutable fields; name stays required. */
const updateBody = z
  .object({
    name: className,
    description: schemas.trimmed(2, 500).optional(),
    teacherId: teacherRef.optional(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const id = validate({ params: schemas.idParam });
const list = validate({ query: schemas.paginationQuery });

module.exports = { create: validate({ body: createBody }), update: validate({ body: updateBody }), id, list };
