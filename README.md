# School Management System — REST API

A backend-only REST API for managing students, teachers, classes, subjects and
student results. Built with **Node.js + Express.js**, authenticated with **JWT**,
passwords hashed with **bcrypt**, and every request validated with **Zod**.

There is **no frontend and no real database** — the data layer is plain
in-memory arrays seeded at boot, exactly as the brief requires.

---

## Table of contents

- [Quick start](#quick-start)
- [Seed accounts](#seed-accounts)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Role permissions](#role-permissions)
- [Response format](#response-format)
- [Status codes](#status-codes)
- [Validation rules](#validation-rules)
- [Security](#security)
- [Logging](#logging)
- [Rate limiting](#rate-limiting)
- [Testing with Thunder Client](#testing-with-thunder-client)
- [Quick cURL walkthrough](#quick-curl-walkthrough)

---

## Quick start

```bash
# 1. install dependencies
npm install

# 2. create your environment file
cp .env.example .env

# 3. start the server
npm run dev      # with file watching
# or
npm start
```

The API is then available on **http://localhost:5000**.

```bash
curl http://localhost:5000          # endpoint index + record counts
curl http://localhost:5000/health   # health check
```

> Data lives in memory only. Every restart resets the database back to the
> seed state.

---

## Seed accounts

| Role     | Email                  | Password       |
| -------- | ---------------------- | -------------- |
| admin    | `admin@school.com`     | `Admin@123`    |
| teacher  | `teacher@school.com`   | `Teacher@123`  |
| teacher  | `amina.yusuf@school.com` | `Teacher@123` |
| student  | `student@school.com`   | `Student@123`  |
| student  | `emeka.obi@school.com` | `Student@123`  |

Seeded records: 3 classes, 4 subjects (Mathematics, English, Physics,
Biology), 2 teachers, 2 students and 5 results.

---

## Project structure

```
src/
├── config/
│   └── index.js                 # env loading + typed config
├── constants/
│   └── roles.js                 # single source of truth for roles
├── controllers/                 # request handling, one per resource
│   ├── auth.controller.js
│   ├── student.controller.js
│   ├── teacher.controller.js
│   ├── class.controller.js
│   ├── subject.controller.js
│   └── result.controller.js
├── data/
│   └── db.js                    # in-memory store, seed data, helpers
├── middleware/
│   ├── auth.middleware.js       # JWT verification -> req.user
│   ├── authorize.middleware.js  # role gate -> 403
│   ├── rateLimit.middleware.js  # auth + global limiters
│   ├── logger.middleware.js     # method, url, status, timestamp
│   └── error.middleware.js      # 404 handler + global error handler
├── routes/                      # URL -> middleware -> controller wiring
│   ├── index.js
│   ├── auth.routes.js
│   ├── student.routes.js
│   ├── teacher.routes.js
│   ├── class.routes.js
│   ├── subject.routes.js
│   └── result.routes.js
├── utils/
│   ├── ApiError.js              # operational error with HTTP status
│   ├── ApiResponse.js           # consistent success envelope
│   ├── asyncHandler.js          # async route error forwarding
│   ├── query.js                 # filter/sort/paginate helpers
│   └── token.js                 # JWT sign + verify
├── validators/
│   ├── common.js                # shared Zod schemas + validate()
│   ├── authValidators.js
│   ├── studentValidators.js
│   ├── teacherValidators.js
│   ├── classValidators.js
│   ├── subjectValidators.js
│   └── resultValidators.js
├── app.js                       # Express app assembly
└── server.js                    # HTTP listener + graceful shutdown

thunder-tests/
├── thunderCollection.json      # 68 requests, 100 assertions, 8 folders
└── thunderEnvironment.json     # baseUrl + token/id variables
```

---

## Environment variables

| Variable                    | Default              | Purpose                                    |
| --------------------------- | -------------------- | ------------------------------------------ |
| `NODE_ENV`                  | `development`        | Runtime mode                               |
| `PORT`                      | `5000`               | Port to bind                               |
| `JWT_SECRET`                | —                    | JWT signing secret (**required in prod**)  |
| `JWT_EXPIRES_IN`            | `1d`                 | Token lifetime                             |
| `BCRYPT_SALT_ROUNDS`        | `10`                 | Password hashing cost                      |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000`             | Auth limiter window (15 min)               |
| `AUTH_RATE_LIMIT_MAX`       | `10`                 | Failed auth attempts per window            |
| `API_RATE_LIMIT_WINDOW_MS`  | `900000`             | Global limiter window                      |
| `API_RATE_LIMIT_MAX`        | `100`                | Requests per window per IP                 |

In `production` the app refuses to boot without a `JWT_SECRET` of at least 32
characters.

---

## Data model

Records relate by id exactly as the brief specifies:

```
User (id) ──userId──> Student ──studentId──> Result ──subjectId──> Subject
   │                      │
   │                      └──classId──> Class ──teacherId──> Teacher
   └──role: admin | teacher | student
```

Each collection has its own id space (student `1` and class `1` are unrelated
rows), mirroring a real `AUTO_INCREMENT` per table.

**Grading scale** — `grade` is derived from `score`, never trusted from the
client:

| Score  | Grade |
| ------ | ----- |
| 70–100 | A     |
| 60–69  | B     |
| 50–59  | C     |
| 40–49  | D     |
| 0–39   | F     |

If a request supplies a `grade` that disagrees with its `score`, the API
rejects it with `400`.

---

## API reference

All protected routes expect `Authorization: Bearer <token>`. The token is also
accepted from an `httpOnly` cookie, so browser clients can use it without
managing headers.

### Authentication

| Method | Endpoint              | Access  | Description                                  |
| ------ | --------------------- | ------- | -------------------------------------------- |
| POST   | `/api/auth/register`  | Public  | Create a student account (rate limited)     |
| POST   | `/api/auth/login`     | Public  | Log in and receive a JWT (rate limited)     |
| GET    | `/api/auth/me`        | Any     | Current user profile                         |
| POST   | `/api/auth/logout`    | Any     | Clear the auth cookie                        |
| PATCH  | `/api/auth/password`  | Any     | Change your own password                     |
| GET    | `/api/auth/users`     | Admin   | List all accounts (no passwords)             |

> Public registration only creates **students**. Sending `"role": "admin"` to
> `/register` is rejected with `400` — role escalation is not possible.

### Students

| Method | Endpoint               | Access             | Description                        |
| ------ | ---------------------- | ------------------ | ---------------------------------- |
| POST   | `/api/students`        | Admin              | Create a student                   |
| GET    | `/api/students`        | Admin, Teacher     | List students                      |
| GET    | `/api/students`        | Student            | Returns **only their own record**  |
| GET    | `/api/students/me`     | Any                | The caller's own student profile   |
| GET    | `/api/students/:id`    | Admin, Teacher     | Fetch one student                  |
| GET    | `/api/students/:id`    | Student            | Only their own record (else `403`) |
| PUT    | `/api/students/:id`    | Admin              | Update a student                   |
| DELETE | `/api/students/:id`    | Admin              | Delete student + their results     |

### Teachers

| Method | Endpoint               | Access         | Description        |
| ------ | ---------------------- | -------------- | ------------------ |
| POST   | `/api/teachers`        | Admin          | Create a teacher   |
| GET    | `/api/teachers`        | Admin, Teacher | List teachers      |
| GET    | `/api/teachers/:id`    | Admin, Teacher | Fetch one teacher  |
| PUT    | `/api/teachers/:id`    | Admin          | Update a teacher   |
| DELETE | `/api/teachers/:id`    | Admin          | Delete a teacher   |

### Classes

| Method | Endpoint               | Access               | Description                          |
| ------ | ---------------------- | -------------------- | ------------------------------------ |
| POST   | `/api/classes`         | Admin                | Create a class                       |
| GET    | `/api/classes`         | Any authenticated    | List classes                         |
| GET    | `/api/classes/:id`     | Any authenticated    | Class + its students and teacher     |
| PUT    | `/api/classes/:id`     | Admin                | Update a class                       |
| DELETE | `/api/classes/:id`     | Admin                | Delete an empty class (`409` if full)|

### Subjects

| Method | Endpoint               | Access               | Description                        |
| ------ | ---------------------- | -------------------- | ---------------------------------- |
| POST   | `/api/subjects`        | Admin                | Create a subject                   |
| GET    | `/api/subjects`        | Any authenticated    | List subjects                      |
| GET    | `/api/subjects/:id`    | Any authenticated    | Subject + its results              |
| PUT    | `/api/subjects/:id`    | Admin                | Update a subject                   |
| DELETE | `/api/subjects/:id`    | Admin                | Delete a subject (`409` if used)   |

### Results

| Method | Endpoint               | Access               | Description                          |
| ------ | ---------------------- | -------------------- | ------------------------------------ |
| POST   | `/api/results`         | Admin, Teacher       | Create a result (grade auto-derived) |
| GET    | `/api/results`         | Admin, Teacher       | List/filter all results              |
| GET    | `/api/results`         | Student              | **Only their own results**           |
| GET    | `/api/results/:id`     | Admin, Teacher       | Fetch one result                     |
| GET    | `/api/results/:id`     | Student              | Only their own result (else `403`)   |
| PUT    | `/api/results/:id`     | Admin, Teacher       | Update a result                      |
| DELETE | `/api/results/:id`     | Admin                | Delete a result                      |

### Query parameters (list endpoints)

`?page=1&limit=10&sort=asc|desc&search=text`

`GET /api/results` additionally accepts `?studentId=&subjectId=&term=&session=`.

List responses include pagination metadata:

```json
{
  "success": true,
  "message": "Students retrieved",
  "data": {
    "students": [ ... ],
    "total": 2, "page": 1, "limit": 10, "totalPages": 1, "count": 2
  }
}
```

---

## Role permissions

| Action                                   | Admin | Teacher | Student |
| ---------------------------------------- | :---: | :-----: | :-----: |
| Create / update / delete students        |  ✅   |   ❌    |   ❌    |
| View students                            |  ✅   |   ✅    | own only|
| Create / update / delete teachers        |  ✅   |   ❌    |   ❌    |
| View teachers                            |  ✅   |   ✅    |   ❌    |
| Create / update / delete classes         |  ✅   |   ❌    |   ❌    |
| View classes                             |  ✅   |   ✅    |   ✅    |
| Create / update / delete subjects        |  ✅   |   ❌    |   ❌    |
| View subjects                            |  ✅   |   ✅    |   ✅    |
| Create / update results                  |  ✅   |   ✅    |   ❌    |
| View results                             |  ✅   |   ✅    | own only|
| Delete results                           |  ✅   |   ❌    |   ❌    |
| View / manage user accounts              |  ✅   |   ❌    |   ❌    |

---

## Response format

Success:

```json
{
  "success": true,
  "message": "Student not found",
  "data": { }
}
```

Error:

```json
{
  "success": false,
  "message": "Student not found"
}
```

Validation errors add a field-level breakdown:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "password", "message": "Password must contain a number" }
  ]
}
```

---

## Status codes

| Code  | When                                                      |
| ----- | --------------------------------------------------------- |
| 200   | Successful read / update                                  |
| 201   | Resource created                                          |
| 400   | Validation failed, malformed JSON, bad foreign key        |
| 401   | Missing, invalid or expired token; bad credentials        |
| 403   | Authenticated but the role is not permitted               |
| 404   | Resource or route does not exist                          |
| 409   | Duplicate email / code / name, or delete blocked by links |
| 429   | Rate limit exceeded                                       |
| 500   | Unexpected server error (details never leak in prod)      |

---

## Validation rules

Every request body, path param and query param is validated with Zod before a
controller runs. Unknown fields are rejected (`.strict()`).

- **Email** — valid format, lowercased, max 255 chars
- **Password** — min 8, max 128, and must contain an uppercase letter, a
  lowercase letter and a number
- **Phone** — `+`/digits/spaces/hyphens, 7–20 characters
- **IDs** — positive integers; accepted as JSON numbers or numeric strings
- **Score** — number between `0` and `100`
- **Grade** — one of `A B C D F`, and must match the score
- **Term** — one of `first`, `second`, `third`
- **Session** — one of `2023/2024`, `2024/2025`, `2025/2026`
- **Role** — one of `admin`, `teacher`, `student`
- **Subject code** — 2–20 chars, letters/numbers/hyphens only, uppercased
- **Pagination** — `page ≥ 1`, `1 ≤ limit ≤ 100`

Referential integrity is enforced too: a `classId` that matches no class, a
`studentId` that matches no student, or deleting a class/subject that still has
dependents all fail with a clear `400`/`409`.

---

## Security

- Passwords hashed with **bcrypt** (`BCRYPT_SALT_ROUNDS`, default 10)
- Plain-text passwords are never stored; the hash is stripped from every
  response, including `req.user` and `/api/auth/users`
- Login compares against a dummy hash when the email is unknown, so response
  timing does not reveal whether an account exists
- JWT secret lives in `.env` (git-ignored); production boot fails without a
  32+ character secret
- `helmet` sets security headers; CORS is credential-aware
- Request bodies capped at 1 MB
- Public registration cannot create admin or teacher accounts
- Students are scoped to their own records at the controller level, not just in
  the route guard
- 500-level stacks are logged server-side and only exposed outside production
- When an admin creates a student or teacher, a linked login account is created
  and its temporary password is returned **once** in the response — it is never
  persisted in plain text

---

## Logging

Every request (except `/health`) is logged via `morgan` with timestamp, method,
URL, status code, response size and duration:

```
2026-09-28T01:05:22.104Z GET /api/students 200 412B - 3.115 ms
2026-09-28T01:05:23.881Z POST /api/auth/login 401 84B - 141.851 ms
```

---

## Rate limiting

- **Auth limiter** — 10 failed attempts per 15 minutes per IP on
  `POST /api/auth/register` and `POST /api/auth/login`
  (`skipSuccessfulRequests`, so legitimate logins are not penalised)
- **Global limiter** — 100 requests per 15 minutes per IP across `/api`

Responses include `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`
headers, and exceedances return `429`:

```json
{ "success": false, "message": "Too many requests from this IP, please try again later" }
```

---

## Testing with Thunder Client

The test collection is committed in Thunder Client's own native format, so no
import step is needed. Install the
[Thunder Client](https://marketplace.visualstudio.com/items?itemName=RangaVadhineni.thunder-client)
extension, open this folder in VS Code, and the collection loads from
`thunder-tests/` automatically.

In the **Env** tab, set `School API (local)` as the active environment (the star
marks it). It supplies `baseUrl` = `http://localhost:5000/`, so nothing in the
collection hardcodes a host.

Then run the folders in order:

| Folder          | Covers                                                    |
| --------------- | --------------------------------------------------------- |
| 00 - Server     | Index and health check                                    |
| 01 - Authentication | Register, login, `me`, users, change password, logout |
| 02 - Security   | 401 / 403 / 400 / 404 cases                               |
| 03 - Students   | Full CRUD + validation + cascading delete                 |
| 04 - Teachers   | Full CRUD                                                 |
| 05 - Classes    | Full CRUD + conflict on non-empty delete                  |
| 06 - Subjects   | Full CRUD + duplicate code                                |
| 07 - Results    | Create/read/update/delete, grading, filters               |

That's **68 requests carrying 100 assertions**, and every expected status code in
the collection was verified against the running API.

The login requests use a `Set Env Variable` test to capture
`{{adminToken}}`, `{{teacherToken}}` and `{{studentToken}}` out of the response,
and the create requests capture `{{studentId}}`, `{{teacherId}}`, `{{subjectId}}`
and `{{resultId}}`. Downstream requests then reference those variables, so the
whole flow chains together without manual editing.

> **⚠ Run it once per server restart.** The auth routes are limited to 10
> requests per 15 minutes, and the collection makes 7 of them. A second run
> inside that window returns `429` on the auth requests. The counters are
> in-memory, so restarting the server clears them.

> **⚠ Tokens get written back to disk.** Running the collection makes Thunder
> Client save the captured JWTs into `thunder-tests/thunderEnvironment.json`. The
> committed version has those values empty, so check `git status` after a run
> before committing.

`script.md` contains a step-by-step walkthrough of the same flow in the
Thunder Client UI, for rehearsing the demo.

---

## Quick cURL walkthrough

```bash
# 1. log in as admin
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@school.com","password":"Admin@123"}' | jq -r .data.token)

# 2. create a class
curl -s -X POST http://localhost:5000/api/classes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"SSS2 Arts","description":"Arts track"}'

# 3. create a student in that class
curl -s -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Tobi Balogun","email":"tobi@school.com",
       "phone":"+2348030000001","class":"SSS2 Arts","classId":4}'

# 4. record a result as a teacher
TTOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher@school.com","password":"Teacher@123"}' | jq -r .data.token)

curl -s -X POST http://localhost:5000/api/results \
  -H "Authorization: Bearer $TTOKEN" -H 'Content-Type: application/json' \
  -d '{"studentId":1,"subjectId":1,"score":84,"term":"first","session":"2025/2026"}'

# 5. a student cannot delete anything (expect 403)
STOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@school.com","password":"Student@123"}' | jq -r .data.token)

curl -s -X DELETE http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer $STOKEN"

# 6. no token at all (expect 401)
curl -s http://localhost:5000/api/students
```

---

## Notes and trade-offs

- The data layer is intentionally in-memory per the brief: no persistence, and
  no unique-constraint race conditions to handle. Swapping in a real database
  means replacing `src/data/db.js`; the controllers only use its
  `findById`/`insert`/`removeById` helpers.
- Cascading deletes are explicit: deleting a student removes their results and
  their linked user account. Deleting a class or subject that still has
  dependents is blocked with `409` instead of silently orphaning data.
- Teachers are permitted to see all students, per the brief's teacher role
  description, but hold no write access to student or teacher records.
# school-managem-system
