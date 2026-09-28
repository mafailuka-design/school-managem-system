const { db, now, insert, findById, removeById, gradeForScore } = require('../data/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { applyListOptions } = require('../utils/query');
const { ownStudent } = require('./student.controller');

/** A duplicate result for the same student/subject/term/session is rejected. */
const assertUnique = (record, excludeId) => {
  const duplicate = db.results.find(
    (r) =>
      String(r.studentId) === String(record.studentId) &&
      String(r.subjectId) === String(record.subjectId) &&
      r.term === record.term &&
      r.session === record.session &&
      String(r.id) !== String(excludeId)
  );
  if (duplicate) {
    throw ApiError.conflict(
      'A result already exists for this student, subject, term and session'
    );
  }
};

/** POST /api/results (admin + teacher) */
const createResult = asyncHandler(async (req, res) => {
  const { studentId, subjectId, score, grade, term, session } = req.body;

  if (!findById('students', studentId)) {
    throw ApiError.badRequest('studentId does not match an existing student');
  }
  if (!findById('subjects', subjectId)) {
    throw ApiError.badRequest('subjectId does not match an existing subject');
  }

  const computedGrade = gradeForScore(score);
  if (grade && grade !== computedGrade) {
    throw ApiError.badRequest(
      `Grade "${grade}" does not match score ${score}; expected "${computedGrade}"`
    );
  }

  const payload = { studentId, subjectId, score, grade: computedGrade, term, session };
  assertUnique(payload);

  const result = insert('results', {
    ...payload,
    createdAt: now(),
  });

  return sendSuccess(res, 201, 'Result created successfully', { result });
});

/**
 * GET /api/results
 * admin + teacher: all results (filterable). student: own results only.
 */
const listResults = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, ...filters } = req.query;

  let records = db.results;

  if (req.user.role === 'student') {
    const self = ownStudent(req.user);
    records = self
      ? records.filter((r) => String(r.studentId) === String(self.id))
      : [];
  } else {
    for (const field of ['studentId', 'subjectId', 'term', 'session']) {
      if (filters[field]) {
        records = records.filter(
          (r) => String(r[field]) === String(filters[field])
        );
      }
    }
  }

  const { records: pageRecords, meta } = applyListOptions(
    records,
    { page, limit, sort, search },
    ['grade', 'term', 'session']
  );

  return sendSuccess(res, 200, 'Results retrieved', { results: pageRecords, ...meta });
});

/** GET /api/results/:id */
const getResult = asyncHandler(async (req, res) => {
  const result = findById('results', req.params.id);
  if (!result) throw ApiError.notFound('Result not found');

  if (req.user.role === 'student') {
    const self = ownStudent(req.user);
    if (!self || String(self.id) !== String(result.studentId)) {
      throw ApiError.forbidden('Students may only view their own results');
    }
  }

  const student = findById('students', result.studentId);
  const subject = findById('subjects', result.subjectId);

  return sendSuccess(res, 200, 'Result retrieved', { result, student, subject });
});

/** PUT /api/results/:id (admin + teacher) */
const updateResult = asyncHandler(async (req, res) => {
  const result = findById('results', req.params.id);
  if (!result) throw ApiError.notFound('Result not found');

  const { studentId, subjectId, score, grade, term, session } = req.body;

  if (studentId && !findById('students', studentId)) {
    throw ApiError.badRequest('studentId does not match an existing student');
  }
  if (subjectId && !findById('subjects', subjectId)) {
    throw ApiError.badRequest('subjectId does not match an existing subject');
  }

  const nextScore = score === undefined ? result.score : score;
  const computedGrade = gradeForScore(nextScore);
  if (grade && grade !== computedGrade) {
    throw ApiError.badRequest(
      `Grade "${grade}" does not match score ${nextScore}; expected "${computedGrade}"`
    );
  }

  const next = {
    studentId: studentId || result.studentId,
    subjectId: subjectId || result.subjectId,
    term: term || result.term,
    session: session || result.session,
  };
  assertUnique(next, result.id);

  Object.assign(result, {
    studentId: next.studentId,
    subjectId: next.subjectId,
    score: nextScore,
    grade: computedGrade,
    term: next.term,
    session: next.session,
  });

  return sendSuccess(res, 200, 'Result updated successfully', { result });
});

/** DELETE /api/results/:id (admin only) */
const deleteResult = asyncHandler(async (req, res) => {
  const result = findById('results', req.params.id);
  if (!result) throw ApiError.notFound('Result not found');

  const removed = removeById('results', result.id);
  return sendSuccess(res, 200, 'Result deleted successfully', { id: removed.id });
});

module.exports = { createResult, listResults, getResult, updateResult, deleteResult };
