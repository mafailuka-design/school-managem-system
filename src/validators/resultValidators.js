const { z } = require('zod');

const { validate, schemas } = require('./common');

const createBody = z
  .object({
    studentId: schemas.idRef,
    subjectId: schemas.idRef,
    score: schemas.score,
    // grade is derived from score in the controller; if supplied it must agree.
    grade: schemas.grade.optional(),
    term: schemas.term,
    session: schemas.session,
  })
  .strict();

const updateBody = z
  .object({
    studentId: schemas.idRef,
    subjectId: schemas.idRef,
    score: schemas.score,
    grade: schemas.grade.optional(),
    term: schemas.term,
    session: schemas.session,
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const id = validate({ params: schemas.idParam });

/** ?studentId=&subjectId=&term=&session= filters for the list endpoint. */
const listQuery = schemas.paginationQuery
  .extend({
    studentId: z.string().regex(/^\d+$/, 'studentId must be a positive integer').optional(),
    subjectId: z.string().regex(/^\d+$/, 'subjectId must be a positive integer').optional(),
    term: schemas.term.optional(),
    session: schemas.session.optional(),
  })
  .strict();

const list = validate({ query: listQuery });

module.exports = { create: validate({ body: createBody }), update: validate({ body: updateBody }), id, list };
