const { z } = require('zod');

const { validate, schemas } = require('./common');

/**
 * A student always belongs to a class. `classId` is the relational link
 * (verified in the controller); `class` is the human-readable name that the
 * assessment spec requires on the student record.
 */
const classRef = z.object({
  classId: schemas.idRef,
  class: schemas.trimmed(2, 100),
});

const createBody = z
  .object({
    name: schemas.name,
    email: schemas.email,
    phone: schemas.phone,
    classId: classRef.shape.classId,
    class: classRef.shape.class,
    // Optional: creates the linked login account for this student.
    password: schemas.password.optional(),
  })
  .strict();

const updateBody = z
  .object({
    name: schemas.name,
    email: schemas.email,
    phone: schemas.phone,
    classId: classRef.shape.classId,
    class: classRef.shape.class,
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const id = validate({ params: schemas.idParam });
const list = validate({ query: schemas.paginationQuery });

module.exports = { create: validate({ body: createBody }), update: validate({ body: updateBody }), id, list };
