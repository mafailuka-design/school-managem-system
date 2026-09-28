const bcrypt = require('bcryptjs');

const config = require('../config');

/**
 * In-memory "database". Plain arrays standing in for real collections.
 * Records are related by id: user -> student/teacher profile, result -> student + subject.
 */
const db = {
  users: [],
  students: [],
  teachers: [],
  classes: [],
  subjects: [],
  results: [],
};

let sequence = 0;

/**
 * Per-collection auto-increment counters, so each collection has its own
 * id space (student 1 and class 1 are unrelated rows).
 */
const sequences = {};

/** Monotonic id generator for one collection (simulates AUTO_INCREMENT). */
const nextId = (collection) => {
  sequences[collection] = (sequences[collection] || 0) + 1;
  return sequences[collection];
};

const now = () => new Date().toISOString();

/**
 * Academic terms and sessions, used to validate result records.
 */
const TERMS = Object.freeze(['first', 'second', 'third']);
const SESSIONS = Object.freeze(['2023/2024', '2024/2025', '2025/2026']);

/**
 * Standard grading scale. A score maps to a letter grade; the result
 * validator enforces the same band so grades are never inconsistent.
 */
const GRADE_SCALE = Object.freeze([
  { min: 70, grade: 'A' },
  { min: 60, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: 0, grade: 'F' },
]);

const gradeForScore = (score) =>
  GRADE_SCALE.find((band) => score >= band.min).grade;

const findById = (collection, id) =>
  db[collection].find((record) => String(record.id) === String(id));

const insert = (collection, record) => {
  // Use a caller-supplied id when present, otherwise auto-increment.
  const row = { id: record.id ?? nextId(collection), ...record };
  db[collection].push(row);
  return row;
};

const removeById = (collection, id) => {
  const index = db[collection].findIndex(
    (record) => String(record.id) === String(id)
  );
  if (index === -1) return null;
  return db[collection].splice(index, 1)[0];
};

/** Loads seed data. Passwords are hashed exactly like a real registration. */
const seed = async () => {
  const rounds = config.bcrypt.saltRounds;
  const hash = (plain) => bcrypt.hash(plain, rounds);

  const [
    adminHash,
    teacherHash,
    studentHash,
    extraTeacherHash,
    extraStudentHash,
  ] = await Promise.all([
    hash('Admin@123'),
    hash('Teacher@123'),
    hash('Student@123'),
    hash('Teacher@123'),
    hash('Student@123'),
  ]);

  // ---- users -------------------------------------------------------------
  insert('users', {
    name: 'System Administrator',
    email: 'admin@school.com',
    password: adminHash,
    role: 'admin',
    createdAt: now(),
  });

  insert('users', {
    name: 'Bello Adeyemi',
    email: 'teacher@school.com',
    password: teacherHash,
    role: 'teacher',
    createdAt: now(),
  });

  insert('users', {
    name: 'Chidi Okonkwo',
    email: 'student@school.com',
    password: studentHash,
    role: 'student',
    createdAt: now(),
  });

  // A second teacher + student so list endpoints have more than one row.
  insert('users', {
    name: 'Amina Yusuf',
    email: 'amina.yusuf@school.com',
    password: extraTeacherHash,
    role: 'teacher',
    createdAt: now(),
  });

  insert('users', {
    name: 'Emeka Obi',
    email: 'emeka.obi@school.com',
    password: extraStudentHash,
    role: 'student',
    createdAt: now(),
  });

  // ---- subjects ----------------------------------------------------------
  const subjectIds = {};
  for (const name of ['Mathematics', 'English', 'Physics', 'Biology']) {
    const id = nextId('subjects');
    subjectIds[name] = id;
    insert('subjects', {
      id,
      name,
      code: name.slice(0, 3).toUpperCase(),
      description: `${name} department subject`,
      createdAt: now(),
    });
  }

  // ---- classes -----------------------------------------------------------
  const classIds = {};
  for (const name of ['JSS1 Gold', 'JSS2 Gold', 'SSS1 Science']) {
    const id = nextId('classes');
    classIds[name] = id;
    insert('classes', {
      id,
      name,
      description: `${name} class`,
      createdAt: now(),
    });
  }

  // ---- teachers ----------------------------------------------------------
  insert('teachers', {
    userId: 2,
    name: 'Bello Adeyemi',
    email: 'teacher@school.com',
    phone: '+2348010000001',
    subject: 'Mathematics',
    createdAt: now(),
  });

  insert('teachers', {
    userId: 4,
    name: 'Amina Yusuf',
    email: 'amina.yusuf@school.com',
    phone: '+2348010000002',
    subject: 'English',
    createdAt: now(),
  });

  // ---- students ----------------------------------------------------------
  insert('students', {
    userId: 3,
    name: 'Chidi Okonkwo',
    email: 'student@school.com',
    phone: '+2348020000001',
    class: 'JSS1 Gold',
    classId: classIds['JSS1 Gold'],
    createdAt: now(),
  });

  insert('students', {
    userId: 5,
    name: 'Emeka Obi',
    email: 'emeka.obi@school.com',
    phone: '+2348020000002',
    class: 'JSS2 Gold',
    classId: classIds['JSS2 Gold'],
    createdAt: now(),
  });

  // ---- results -----------------------------------------------------------
  const results = [
    { studentId: 1, subjectId: subjectIds.Mathematics, score: 84 },
    { studentId: 1, subjectId: subjectIds.English, score: 71 },
    { studentId: 1, subjectId: subjectIds.Physics, score: 65 },
    { studentId: 2, subjectId: subjectIds.Mathematics, score: 58 },
    { studentId: 2, subjectId: subjectIds.English, score: 77 },
  ];

  for (const result of results) {
    insert('results', {
      ...result,
      grade: gradeForScore(result.score),
      term: 'first',
      session: '2024/2025',
      createdAt: now(),
    });
  }
};

module.exports = {
  db,
  seed,
  nextId,
  now,
  findById,
  insert,
  removeById,
  gradeForScore,
  TERMS,
  SESSIONS,
  GRADE_SCALE,
};
