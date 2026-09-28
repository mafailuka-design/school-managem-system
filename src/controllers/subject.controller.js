const { db, now, insert, findById, removeById } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { applyListOptions } = require('../utils/query');

/** POST /api/subjects (admin only) */
const createSubject = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  const normalisedCode = code.toUpperCase();

  if (db.subjects.some((s) => s.code === normalisedCode)) {
    throw ApiError.conflict('A subject with this code already exists');
  }

  const subject = insert('subjects', {
    name,
    code: normalisedCode,
    description: description || null,
    createdAt: now(),
  });

  return sendSuccess(res, 201, 'Subject created successfully', { subject });
});

/** GET /api/subjects (all authenticated roles) */
const listSubjects = asyncHandler(async (req, res) => {
  const { page, limit, sort, search } = req.query;
  const { records, meta } = applyListOptions(
    db.subjects,
    { page, limit, sort, search },
    ['name', 'code', 'description']
  );
  return sendSuccess(res, 200, 'Subjects retrieved', { subjects: records, ...meta });
});

/** GET /api/subjects/:id - includes the results recorded for the subject. */
const getSubject = asyncHandler(async (req, res) => {
  const subject = findById('subjects', req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const results = db.results.filter(
    (r) => String(r.subjectId) === String(subject.id)
  );

  return sendSuccess(res, 200, 'Subject retrieved', { subject, results });
});

/** PUT /api/subjects/:id (admin only) */
const updateSubject = asyncHandler(async (req, res) => {
  const subject = findById('subjects', req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const { name, code, description } = req.body;

  if (code) {
    const normalisedCode = code.toUpperCase();
    if (
      normalisedCode !== subject.code &&
      db.subjects.some((s) => s.code === normalisedCode)
    ) {
      throw ApiError.conflict('A subject with this code already exists');
    }
    subject.code = normalisedCode;
  }

  if (name !== undefined) subject.name = name;
  if (description !== undefined) subject.description = description;

  return sendSuccess(res, 200, 'Subject updated successfully', { subject });
});

/** DELETE /api/subjects/:id (admin only) - blocked while results reference it. */
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = findById('subjects', req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const used = db.results.some(
    (r) => String(r.subjectId) === String(subject.id)
  );
  if (used) {
    throw ApiError.conflict('Cannot delete a subject that has results recorded against it');
  }

  const removed = removeById('subjects', subject.id);
  return sendSuccess(res, 200, 'Subject deleted successfully', { id: removed.id });
});

module.exports = { createSubject, listSubjects, getSubject, updateSubject, deleteSubject };
