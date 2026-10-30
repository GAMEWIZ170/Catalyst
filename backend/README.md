# Catalyst API

The backend for Catalyst, a low-cost learning platform for university students. It serves course material, tutorial video references and practice questions, and keeps track of each student's progress and daily streak. The first course is CHEM113.

Built with Express and MongoDB. A React frontend talks to it over JSON, and students stay logged in with an HTTP-only cookie.

## Contents

1. [Overview](#overview)
2. [Quick start](#quick-start)
3. [API reference](#api-reference)
4. [How it works](#how-it-works)
5. [Reference](#reference): data models, middleware, project structure
6. [Troubleshooting](#troubleshooting)
7. [Known limitations](#known-limitations)

## Overview

Content is organised as a chain: a **course** has **units**, a unit has **lessons**, and a lesson has **questions**. A student reads a lesson, answers its questions, and submits it. The server grades the answers, keeps the best score, and updates the student's streak.

There are two kinds of user. **Students** read published content and record progress. **Admins** write and edit the content. Everyone registers as a student, and an admin is a student whose role has been changed by hand in the database.

## Quick start

You need a current Node.js LTS release and a MongoDB database.

### 1. Install

```bash
git clone https://github.com/GAMEWIZ170/Catalyst.git
cd Catalyst
npm install
```

### 2. Configure

Copy `.env.example` to `.env` (on Windows: `copy .env.example .env`) and fill it in. Never commit `.env`: it holds your database password and token secret.

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Port to listen on. Falls back to 5000 | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:password@cluster.mongodb.net/catalyst_dev` |
| `JWT_SECRET` | Signs login tokens. Use a different one in production | 32 or more random characters |
| `JWT_EXPIRES_IN` | How long a login lasts | `7d` |
| `NODE_ENV` | In `production`, the login cookie is sent over HTTPS only | `development` |
| `CLIENT_URL` | Exact address of the frontend. CORS allows only this origin | `http://localhost:5173` |

The server will not start if `JWT_SECRET` or `JWT_EXPIRES_IN` is missing. To generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Connect a database

Use a different database name for testing and for the live app, for example `catalyst_dev` and `catalyst`. The name is the last part of the connection string.

<details>
<summary><strong>MongoDB Atlas (cloud)</strong></summary>

1. Create a free cluster and a database user. The user is separate from your Atlas login.
2. Copy the connection string into `MONGODB_URI`. Replace `<password>` with the user's password and remove the angle brackets. If the password contains characters like `@` or `#`, use a simpler one or URL-encode it.
3. Add your IP address under Network Access.

Atlas only accepts connections from addresses on that list, so if your connection changes address often, connections will start timing out. You can allow `0.0.0.0/0` while the database holds only test data, but remove it once real accounts exist. The free tier has no backups, so keep your lesson content in files you control.

</details>

<details>
<summary><strong>MongoDB on your own computer</strong></summary>

Install MongoDB Community Server and set:

```
MONGODB_URI=mongodb://127.0.0.1:27017/catalyst_dev
```

A local database has no allowlist and works offline.

</details>

### 4. Run

```bash
npm run dev     # restarts automatically when files change
npm start       # runs once
```

The API is at `http://localhost:5000/api/v1`, or on whatever port you set. There is no automated test suite yet, so `npm test` is not configured.

### 5. Create the first admin

Registration always creates a student, so the first admin is made by hand:

1. Register with `POST /api/v1/auth/register`.
2. In Atlas (Browse Collections) or MongoDB Compass, open the `users` collection, find your user and change `role` from `"student"` to `"admin"`.
3. Log in again with `POST /api/v1/auth/login`.

The role is checked against the database on every request, so the change applies as soon as you log in again.

### 6. Try it

Use an HTTP client that keeps cookies, such as Thunder Client or the Postman desktop app. The browser version of Postman cannot reach `localhost`. Send raw JSON bodies and use `http://`, not `https://`.

<details>
<summary><strong>A first test session, step by step</strong></summary>

| Step | Request | Body |
| --- | --- | --- |
| 1 | `POST /api/v1/auth/register` | `{ "name": "Ama Mensah", "email": "ama@example.com", "password": "a-long-password" }` |
| 2 | `GET /api/v1/auth/me` | none |
| 3 | Make yourself admin (step 5 above), then log in again | |
| 4 | `POST /api/v1/admin/courses` | `{ "code": "CHEM113", "title": "General Chemistry", "description": "Introductory chemistry.", "isPublished": true }` |
| 5 | `POST /api/v1/admin/units` | `{ "course": "<course id>", "title": "Atomic structure", "order": 1 }` |
| 6 | `POST /api/v1/admin/lessons` | `{ "unit": "<unit id>", "title": "The atom", "order": 1, "explanation": "...", "isPublished": true }` |
| 7 | `POST /api/v1/admin/questions` | `{ "lesson": "<lesson id>", "type": "mcq", "text": "...", "options": ["A", "B", "C"], "correctAnswer": "B", "explanation": "...", "order": 1 }` |
| 8 | `GET /api/v1/courses/<course id>` | none |

Each ID comes from the `data` in the previous response. Content is created unpublished unless you send `"isPublished": true`, and students cannot see unpublished content. Once the outline appears, try answering the question, completing the lesson, and then `GET /progress` and `GET /progress/streak`.

</details>

## API reference

All routes start with `/api/v1`. Requests and responses are JSON. Successful responses have a `data` key, lists also have a `count`, and errors always look like `{ "message": "..." }`. A browser frontend must send requests with credentials (`credentials: "include"` in `fetch`).

**Access levels:** *Public* means anyone, *Student* means logged in, and *Admin* means logged in with the `admin` role.

| Status | Meaning |
| --- | --- |
| 400 | Malformed ID, invalid or missing field, or an empty update |
| 401 | Not logged in, or the login is invalid or expired |
| 403 | Not allowed, or the account is deactivated |
| 404 | Not found, unpublished or deleted |
| 409 | Duplicate course code or email |
| 429 | Rate limit exceeded |

### Auth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a student account and log in. Body: `name`, `email`, `password`. 409 if the email exists |
| POST | `/auth/login` | Public | Log in. Body: `email`, `password` |
| POST | `/auth/logout` | Public | Clear the login cookie |
| GET | `/auth/me` | Student | The logged-in user |

Register and login return the user's `id`, `name`, `email` and `role` and set the cookie. A wrong email and a wrong password give the same 401, `Invalid credentials`, so the API does not reveal which emails have accounts. Logout is public so that someone whose login has expired can still clear their cookie.

### Courses

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | Student | Published courses, sorted by code |
| GET | `/courses/:id` | Student | One course with its units, lessons and this student's progress |

<details>
<summary>Example response for <code>GET /courses/:id</code></summary>

```json
{
  "data": {
    "_id": "...",
    "code": "CHEM113",
    "title": "General Chemistry",
    "description": "Introductory chemistry.",
    "units": [
      {
        "_id": "...",
        "title": "Atomic structure",
        "order": 1,
        "lessons": [
          { "_id": "...", "title": "The atom", "order": 1, "hasVideo": true, "completed": true, "score": 80 }
        ]
      }
    ],
    "progress": { "completedLessons": 1, "totalLessons": 4 }
  }
}
```

Units with no published lessons are left out. `score` is `null` for lessons not yet completed. `hasVideo` tells the frontend whether to show a video icon; the video itself comes with the lesson.

</details>

### Lessons and questions

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/lessons/:id` | Student | A lesson with its questions, without the answers |
| POST | `/lessons/:id/complete` | Student | Submit all answers for a lesson. The server grades them |
| POST | `/questions/:id/answer` | Student | Check one answer and reveal the correct one |

`GET /lessons/:id` returns the lesson's `title`, `order`, `explanation`, `videoHost` and `videoId`, and its questions in order, each with only `_id`, `type`, `text`, `options` and `order`. Videos are hosted elsewhere, for example on YouTube (unlisted). The API stores only the host name and the video's ID.

<details>
<summary>Request and response examples</summary>

**`POST /lessons/:id/complete`**

```json
{ "answers": [ { "questionId": "...", "answer": "B" }, { "questionId": "...", "answer": "true" } ] }
```

```json
{ "message": "Lesson completed", "data": { "score": 80, "correct": 4, "total": 5, "bestScore": 80 } }
```

The response has totals only, so a student cannot collect a lesson's answers by submitting blanks.

**`POST /questions/:id/answer`**

```json
{ "answer": "B" }
```

```json
{ "data": { "isCorrect": false, "correctAnswer": "B", "explanation": "..." } }
```

For a flashcard, no answer is needed and `isCorrect` is `null`. For the other types, a missing answer returns 400.

</details>

### Progress

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/progress` | Student | This student's records: `lesson`, `completed`, `score`, `completedAt` |
| GET | `/progress/streak` | Student | `{ "data": { "streak": 3, "completedToday": true } }` |

### Admin

Every route below needs the admin role. Create routes need the parent's ID in the body, and the parent must exist and not be deleted, or the route returns 404. Update routes accept any subset of the fields, but an empty body returns 400. Delete routes are soft deletes.

| Method | Path | Body or query | Purpose |
| --- | --- | --- | --- |
| GET | `/admin/courses` | | All courses not deleted, drafts included |
| POST | `/admin/courses` | `code`, `title`, `description`, `isPublished`* | Create a course. 409 if the code exists |
| PUT | `/admin/courses/:id` | any of the above | Update a course |
| DELETE | `/admin/courses/:id` | | Soft-delete a course |
| POST | `/admin/units` | `course`, `title`, `order` | Create a unit |
| PUT | `/admin/units/:id` | any of the above | Update a unit |
| DELETE | `/admin/units/:id` | | Soft-delete a unit |
| POST | `/admin/lessons` | `unit`, `title`, `order`, `explanation`, `videoHost`*, `videoId`*, `isPublished`* | Create a lesson |
| GET | `/admin/lessons/:id` | | A lesson in full, with its questions and answers, drafts included |
| PUT | `/admin/lessons/:id` | any of the above | Update a lesson |
| DELETE | `/admin/lessons/:id` | | Soft-delete a lesson |
| POST | `/admin/questions` | `lesson`, `type`, `text`, `options`, `correctAnswer`, `explanation`*, `order` | Create a question |
| PUT | `/admin/questions/:id` | any of the above | Update a question. Its type rules are checked again |
| DELETE | `/admin/questions/:id` | | Soft-delete a question |
| GET | `/admin/users` | `page` (default 1), `limit` (default 20, max 100) | List users, newest first, with pagination |

\* optional. `options` is required for `mcq` questions only.

`GET /admin/users` returns `name`, `email`, `role`, `isActive` and `createdAt` for each user, never the password hash, plus a `pagination` object with `currentPage`, `limit`, `totalUsers` and `totalPages`.

## How it works

### Visibility and soft deletes

A student can only see a lesson if the lesson, its unit and its course are all visible: the lesson and course must be published, and none of the three can be deleted. Units have no published flag and are visible whenever their course is. Anything hidden returns 404, the same as something that does not exist, so a student cannot tell that an unpublished item is there.

Deleting never removes anything. The API sets a `deletedAt` date and every query skips records that have one, so students' progress is not broken and a delete can be undone by setting `deletedAt` back to `null`. Course codes are unique across all records, so a deleted course still holds its code, and creating a new course with the same code returns 409 until the old one is renamed or restored.

### Questions and grading

| Type | `text` | `options` | `correctAnswer` |
| --- | --- | --- | --- |
| `mcq` | The question | 2 to 6 choices | Must exactly match one option |
| `true_false` | The statement | Not used | `true` or `false` |
| `flashcard` | Front of the card | Not used | Back of the card |

These rules are enforced by the model itself, so they apply on create and on update.

The server never sends `correctAnswer` or `explanation` with a lesson's questions. A student receives them only after answering, and lessons are graded on the server: the client sends answers, never a score. Answers are compared after trimming spaces, collapsing repeated spaces and ignoring capital letters. Flashcards are flipped, not answered, so they are not graded. Only `mcq` and `true_false` questions count towards a score, a skipped question counts as wrong, and a lesson with nothing to grade scores 100.

Submitting a lesson always marks it completed, whatever the score, and the stored score is the best one achieved, so replaying never lowers it.

### Streaks

Each submission records today's date against the lesson. A streak is the number of consecutive days, ending today or yesterday, on which the student completed at least one lesson. If they have not studied yet today, the count runs up to yesterday so it does not drop to zero before the day is over. Dates are in UTC, which matches Ghana time.

### Security

- **Login.** Registering or logging in sets an HTTP-only cookie named `token`, holding a signed token with the user's ID and role. The cookie is `sameSite: lax`, and `secure` in production. The token is never returned in a response body.
- **Checked on every request.** `authenticate` verifies the token, then loads the user from the database and rejects the request if the account no longer exists or is deactivated. Demoting or deactivating someone takes effect immediately, not when their token expires.
- **Cross-origin frontends.** A frontend on another origin must send credentials, and `CLIENT_URL` must match its address exactly, or the browser will not send the cookie.
- **Passwords** are hashed with bcrypt and hidden from database queries unless a query asks for them.
- **Registration** always creates a student and strips any other fields, so nobody can register as an admin.
- **Answers** are never sent with questions.
- **Secrets.** Never commit `.env`. If a database password or `JWT_SECRET` is ever exposed, change it immediately.

### Validation and rate limits

Every route that accepts a body is validated with Joi before it reaches a controller. Strings are trimmed and unknown fields are removed.

<details>
<summary><strong>Validation limits</strong></summary>

| Field | Rule |
| --- | --- |
| `name` | 2 to 60 characters |
| `email` | Valid address, up to 254 characters, stored in lower case |
| `password` | 8 to 72 characters |
| Course `description` | Up to 200 characters |
| Lesson `explanation` | Up to 10,000 characters |
| Question `text` | Up to 1,000 characters |
| Question `options` | Up to 6 items, each up to 300 characters |
| `order` | A whole number of 1 or more |
| IDs | 24-character hexadecimal strings |
| Lesson `answers` | Up to 100 items |

</details>

| Limiter | Applies to | Limit |
| --- | --- | --- |
| General | Every route | 1,000 requests per IP every 15 minutes |
| Strict | Register and login | 20 failed attempts per IP every 15 minutes. Successful requests are not counted |
| Answer | `POST /questions/:id/answer` | 100 requests per logged-in user every 15 minutes |

Most limits are per IP address, and many students on a campus network may share one, which is why the general limit is generous and the login limit counts only failures. The answer limiter counts per user instead. Rejected requests get a 429.

## Reference

<details>
<summary><strong>Data models</strong></summary>

Every model has `createdAt` and `updatedAt`, added automatically. `deletedAt` is `null` until the record is soft-deleted.

| Model | Fields |
| --- | --- |
| **User** | `name`, `email` (unique, lower case), `password` (bcrypt hash, hidden by default), `role` (`student` or `admin`, default `student`), `enrolledCourses` (reserved, not used yet), `isActive` (`false` blocks login and every request) |
| **Course** | `code` (unique, trimmed), `title`, `description` (up to 200 characters), `isPublished` (default `false`), `deletedAt` |
| **Unit** | `course` (reference), `title`, `order`, `deletedAt` |
| **Lesson** | `unit` (reference), `title`, `order`, `explanation`, `videoHost` and `videoId` (optional), `isPublished` (default `false`), `deletedAt` |
| **Question** | `lesson` (reference), `type`, `text`, `options`, `correctAnswer`, `explanation`, `order`, `deletedAt` |
| **Progress** | `user` and `lesson` (references, unique together, so one record per student per lesson), `completed`, `score` (best, 0 to 100), `completedAt` (first completion), `completedDays` (every day it was completed, as `YYYY-MM-DD`) |

</details>

<details>
<summary><strong>Middleware</strong></summary>

| Middleware | What it does |
| --- | --- |
| `helmet` | Adds security headers to every response |
| `cors` | Allows browser requests only from `CLIENT_URL`, with credentials |
| `express.json` | Parses JSON request bodies |
| `cookie-parser` | Makes the login cookie available as `req.cookies` |
| `logger` | Logs the method, URL and client IP of each request |
| `generalLimiter`, `strictLimiter`, `answerLimiter` | The three rate limits above |
| `authenticate` | Verifies the login and loads the user |
| `authorizeRole` | Allows a route only for the listed roles. Always placed after `authenticate` |
| `validate` | Joi validators that check and clean the request body |
| `notFound` | Replies 404 when no route matched |
| `error` | Logs unexpected errors and returns a safe 500 |

`notFound` and `error` are the last two middleware in the app, in that order, so they only see what nothing else handled.

</details>

<details>
<summary><strong>Project structure</strong></summary>

```
src/
  app.js          Express app: middleware, routes, error handling
  server.js       Loads .env, checks required settings, connects to the database, starts listening
  config/         Database connection
  controllers/    The logic behind each route
  middlewares/    Authentication, validation, rate limiting, logging, errors
  models/         Mongoose schemas
  routes/         Which URL goes to which controller, plus the middleware guarding it
  utils/          Password hashing, answer normalisation, visibility checks, streak calculation
```

</details>

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Connection times out | Your IP is not on the Atlas allowlist |
| `bad auth : authentication failed` | Wrong database username or password, or the `<password>` placeholder was left in |
| Requests hang with no response | `express.json()` was written without its brackets in `app.js` |
| `401` right after logging in | The client is not keeping cookies |
| `403` on an admin route | The `role` change did not save, or you have not logged in again since |
| Lists come back empty | The content was created with `isPublished` left as `false` |
| `409` creating a course | The code exists already, possibly on a deleted course |

## Known limitations

- **No subscriptions or payments yet.** Every logged-in student can reach all published lessons. A subscription check and a payment integration are planned.
- **Answers can be collected by a determined script.** The answer limiter slows it down, but only the subscription check will properly stop non-paying users from reading answers.
- **No automated tests.** The API is tested by hand through an HTTP client.
- **Proxy settings.** Behind a hosting provider's proxy, every user can appear to share one IP address unless the app is told to trust the proxy. This, and the cookie settings for a live domain, must be configured at deployment.
- **Deleted courses keep their code.** A later change may let a code be reused.
- **Admins are made by hand.** There is no route for promoting a user.
- **Planned:** a mode where students turn their own material into flashcards and quizzes, and support for more than one course.