# Catalyst API

The backend for Catalyst, a low-cost learning platform for university students. It serves courses, lessons, tests, flashcards and lesson materials, and records student progress and streaks.

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

Content is organised as **course > unit > lesson**. Lessons can have tests, flashcards and materials. Tests may belong to a lesson, unit or course. Students see only published content whose parents are not deleted.

Students can complete a lesson by finishing a published test, rating every published flashcard, or using **Mark as done** when the lesson has neither a qualifying test nor a flashcard. A test with no non-deleted questions gives no credit. The streak combines completed progress days, test-result days and flashcard-review days.

There are two kinds of user. **Students** read published content and record progress. **Admins** write and edit content. Everyone registers as a student; an admin is promoted by hand in the database.

## Quick start

You need a current Node.js LTS release and a MongoDB database.

### 1. Install

```bash
git clone https://github.com/GAMEWIZ170/Catalyst.git
cd Catalyst
npm install
```

### 2. Configure

Copy `.env.example` to `.env` and fill it in. On Windows:

```powershell
copy .env.example .env
```

Never commit `.env`: it holds database credentials, the token secret and the Cloudinary secret.

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Port to listen on. Falls back to 5000 | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://.../catalyst_dev` |
| `JWT_SECRET` | Signs login tokens | 32 or more random characters |
| `JWT_EXPIRES_IN` | How long a login lasts | `7d` |
| `NODE_ENV` | Production enables secure cookies | `development` |
| `CLIENT_URL` | Exact frontend origin allowed by CORS | `http://localhost:5173` |
| `CLOUDINARY_URL` | Cloudinary SDK configuration | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` |

Find `CLOUDINARY_URL` in the Cloudinary Console under the product environment's API environment variable or API keys area. Never commit it or paste the API secret into source control. In Cloudinary, go to Settings, then Security, and tick "Allow delivery of PDF and ZIP files"; without it every PDF link returns 401.

Startup checks that `JWT_SECRET`, `JWT_EXPIRES_IN` and `CLOUDINARY_URL` exist before connecting to MongoDB. It then prints `Server running on port ...` after the database connection succeeds.

### 3. Connect a database

Use separate database names for development and testing, such as `catalyst_dev` and `catalyst_test`. The name is the last part of the connection string.

<details>
<summary><strong>MongoDB Atlas (cloud)</strong></summary>

Create a cluster and database user, put the connection string in `MONGODB_URI`, URL-encode special password characters, and add the machine's IP address under Network Access. Atlas only accepts connections from addresses on that list.

</details>

<details>
<summary><strong>MongoDB on your own computer</strong></summary>

```text
MONGODB_URI=mongodb://127.0.0.1:27017/catalyst_dev
```

</details>

### 4. Run

```bash
npm run dev
npm start
```

The API is at `http://localhost:5000/api/v1`, or on the port in `PORT`.

### 5. Create the first admin

Register with `POST /api/v1/auth/register`, change that user's `role` from `student` to `admin` in the `users` collection, and log in again.

### 6. Try it

Use an HTTP client that keeps cookies. Browser clients must send `credentials: "include"` with requests.

<details>
<summary><strong>A first content session</strong></summary>

1. Register and log in.
2. Promote the account to admin and log in again.
3. Create a course, unit and published lesson.
4. Create a published test and questions, or create flashcards and materials.
5. Open the course outline as a student.
6. Submit a test, rate flashcards, or mark an otherwise empty lesson done.

</details>

## API reference

All routes start with `/api/v1`. Successful responses use `{ "data": ... }` where applicable. Errors use `{ "message": "..." }`.

**Access levels:** *Public* means anyone, *Student* means logged in, and *Admin* means logged in with the `admin` role. Every admin route also runs `authenticate -> authorizeRole("admin")`.

| Status | Meaning |
| --- | --- |
| 400 | Invalid ID, body, upload or empty update |
| 401 | Not logged in or invalid credentials |
| 403 | Authenticated but not allowed |
| 404 | Not found, unpublished or deleted |
| 409 | Conflict, including an empty test submission |
| 429 | Rate limit exceeded |

### Auth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a student and set the cookie |
| POST | `/auth/login` | Public | Log in |
| POST | `/auth/logout` | Public | Clear the cookie |
| GET | `/auth/me` | Student | Return `id`, `name`, `email`, `role` and `avatar` |
| PUT | `/auth/me/avatar` | Student | Body `{ "avatar": "beaker" }` or `{ "avatar": null }` |

Example avatar response:

```json
{ "data": { "id": "...", "name": "Ama", "email": "ama@example.com", "role": "student", "avatar": "beaker" } }
```

### Courses and lessons

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | Student | Published courses |
| GET | `/courses/:id` | Student | Course outline, tests and lesson progress |
| GET | `/lessons/:id` | Student | Visible lesson summary |
| GET | `/lessons/:id/flashcards` | Student | Published flashcards and confidence summary |
| GET | `/lessons/:id/materials` | Student | Published lesson materials |
| POST | `/lessons/:id/mark-done` | Student | Mark a lesson done only when it has neither qualifying tests nor flashcards |

`GET /lessons/:id` returns lesson fields, published test summaries, flashcard counts by confidence (`total`, `confident`, `unsure`, `unknown`, `unrated`) and `materialCount`. The course outline adds `testCount`, `flashcardCount` and `materialCount` to each lesson.

Example outline lesson:

```json
{ "_id": "...", "title": "The atom", "testCount": 1, "flashcardCount": 3, "materialCount": 2, "completed": false, "score": null }
```

### Tests and questions

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/tests/:id` | Student | Published test with student-safe questions |
| POST | `/tests/:id/submit` | Student | Grade answers and update test result |
| POST | `/questions/:id/answer` | Student | Check one answer |
| POST | `/admin/tests` | Admin | Create a lesson-, unit- or course-scope test |
| GET | `/admin/tests/:id` | Admin | Full test and questions |
| PUT | `/admin/tests/:id` | Admin | Update title, order, publication or pass percent |
| DELETE | `/admin/tests/:id` | Admin | Soft-delete a test |
| POST | `/admin/questions` | Admin | Create a question |
| PUT | `/admin/questions/:id` | Admin | Update a question |
| DELETE | `/admin/questions/:id` | Admin | Soft-delete a question |

To create or update a multiple-choice question, send options (a list without ids) and correctIndex (the position of the correct option) together. The server saves the options, gives each an id, and stores the id of the correct one. A question's type and a material's kind cannot be changed after creation. A true/false question has no options or correctIndex and requires correctAnswer equal to `"true"` or `"false"`. Question and explanation images use `{ "url", "publicId", "alt" }`; `alt` is required when a URL is present.

`POST /questions/:id/answer` example:

```json
{
  "data": {
    "isCorrect": false,
    "correctAnswer": { "_id": "...", "text": "B", "image": null },
    "explanation": "...",
    "explanationImage": null
  }
}
```

`GET /tests/:id` example:

```json
{
  "data": {
    "_id": "...",
    "title": "Atomic structure",
    "scope": "lesson",
    "order": 1,
    "questions": [
      {
        "_id": "...",
        "type": "mcq",
        "text": "Which particle is negatively charged?",
        "image": null,
        "options": [
          { "_id": "...", "text": "Electron", "image": null },
          { "_id": "...", "text": "Proton", "image": null }
        ],
        "order": 1
      }
    ]
  }
}
```

`POST /tests/:id/submit` example:

```json
{ "data": { "score": 80, "correct": 4, "total": 5, "bestScore": 80, "attempts": 2, "passPercent": 70, "passed": true } }
```

Submitting a visible test with no non-deleted questions returns `409` with `This test has no questions yet` and creates no result or progress.

**Pass percent.** Each test has an optional `passPercent` (integer 0 to 100) set by its author. A lesson test completes its lesson only when the score is at or above it, and `passed` in the submit response says whether it was. A failed attempt still records the result and counts as activity for streaks, but it does not complete the lesson. `passPercent: null` means no requirement: any attempt completes the lesson, which is how tests created before this setting behave. Tests created through `POST /admin/tests` default to `50` when the field is left out. Send `null` to clear it. Unit and course tests report `passed` but never complete a lesson. A lesson that is already complete stays complete if a later attempt fails or the author raises the percent. `GET /tests/:id` and the tests listed in `GET /lessons/:id` include `passPercent`.

### Flashcards

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/lessons/:id/flashcards` | Student | Return published cards in order; `?filter=review` excludes confident cards |
| POST | `/flashcards/:id/rate` | Student | Body `{ "confidence": "confident" }`; update review progress |
| POST | `/admin/flashcards` | Admin | Create a flashcard |
| PUT | `/admin/flashcards/:id` | Admin | Update lesson, sides, order or publication |
| DELETE | `/admin/flashcards/:id` | Admin | Soft-delete a flashcard |

Each card has `front` and `back` sides. Each side needs text or an image. Rating every published card completes the lesson without changing its score. The rate response includes the updated summary.

### Materials

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/lessons/:id/materials` | Student | Published materials with safe delivery fields |
| POST | `/admin/uploads/material` | Admin | Upload one PDF |
| POST | `/admin/materials` | Admin | Create a file or link material |
| PUT | `/admin/materials/:id` | Admin | Update any subset except `kind` |
| DELETE | `/admin/materials/:id` | Admin | Soft-delete a material |
| GET | `/admin/lessons/:id` | Admin | Include full materials, including drafts |

File materials use `{ "url", "publicId", "format", "bytes" }`. File URLs are HTTPS Cloudinary URLs and public IDs start with `catalyst/materials/` and end in `.pdf`. Link URLs are HTTPS and cannot contain credentials or a port.

The upload response is:

```json
{ "data": { "url": "https://res.cloudinary.com/.../catalyst/materials/<20-char>.pdf", "publicId": "catalyst/materials/<20-char>.pdf", "format": "pdf", "bytes": 1024 } }
```

### Image uploads

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/admin/uploads` | Admin | Upload one JPEG, PNG or WEBP image in field `image` |

Images are limited to 2 MB. The declared MIME type is a cheap first rejection; the bytes must contain a JPEG, PNG or WEBP signature. Images go to `catalyst/images` and return `url`, `publicId`, `width` and `height`.

### Progress

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/progress` | Student | Student lesson progress |
| GET | `/progress/streak` | Student | Streak from progress, test results and flashcard reviews |

### Admin content

Create routes require an available parent. Delete routes are soft deletes.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/courses` | List all non-deleted courses |
| GET | `/admin/courses/:id` | Full editor tree with drafts, tests and lesson counts |
| POST | `/admin/courses` | Create a course |
| PUT | `/admin/courses/:id` | Update a course |
| DELETE | `/admin/courses/:id` | Soft-delete a course |
| POST | `/admin/units` | Create a unit |
| PUT | `/admin/units/:id` | Update a unit |
| DELETE | `/admin/units/:id` | Soft-delete a unit |
| PUT | `/admin/units/reorder` | Reorder units with `{ "course", "ids" }` |
| POST | `/admin/lessons` | Create a lesson |
| GET | `/admin/lessons/:id` | Get a lesson with tests, flashcards and materials |
| PUT | `/admin/lessons/:id` | Update a lesson |
| DELETE | `/admin/lessons/:id` | Soft-delete a lesson |
| PUT | `/admin/lessons/reorder` | Reorder lessons with `{ "unit", "ids" }` |
| POST | `/admin/tests` | Create a test |
| GET | `/admin/tests/:id` | Get a test with questions and answers |
| PUT | `/admin/tests/:id` | Update a test |
| DELETE | `/admin/tests/:id` | Soft-delete a test |
| PUT | `/admin/tests/reorder` | Reorder tests with `{ "scope", "parent", "ids" }` |
| POST | `/admin/questions` | Create a question |
| PUT | `/admin/questions/:id` | Update a question |
| DELETE | `/admin/questions/:id` | Soft-delete a question |
| PUT | `/admin/questions/reorder` | Reorder questions with `{ "test", "ids" }` |
| POST | `/admin/flashcards` | Create a flashcard |
| PUT | `/admin/flashcards/:id` | Update a flashcard |
| DELETE | `/admin/flashcards/:id` | Soft-delete a flashcard |
| PUT | `/admin/flashcards/reorder` | Reorder flashcards with `{ "lesson", "ids" }` |
| POST | `/admin/uploads/material` | Upload a PDF material |
| POST | `/admin/materials` | Create a material |
| PUT | `/admin/materials/:id` | Update a material |
| DELETE | `/admin/materials/:id` | Soft-delete a material |
| PUT | `/admin/materials/reorder` | Reorder materials with `{ "lesson", "ids" }` |
| POST | `/admin/uploads` | Upload an image |
| GET | `/admin/users` | Paginated user list without password hashes |

## How it works

### Visibility, completion and soft deletes

A visible lesson requires a published lesson and course, an available unit, and no `deletedAt` on any parent. Tests count toward completion and outline counts only when published and containing at least one non-deleted question. Flashcards and materials use their own published, non-deleted filters.

`deletedAt` is set instead of removing records. Students receive 404 for hidden content. Cloudinary assets are not automatically deleted when content is soft-deleted.

### Question types

| Type | Fields | Rules |
| --- | --- | --- |
| `mcq` | `text`, `options`, `correctOption` | 2 to 6 option objects; each option has text or an image; correct option must be one option |
| `true_false` | `text`, `correctAnswer` | No options or `correctOption`; answer is `"true"` or `"false"` |

Student serializers omit correct answers. Scores are calculated on the server. An empty test cannot be submitted for credit. Unit tests and course tests record a result but never complete a lesson. Mark as done returns `409` for any lesson with a test that has questions or a published flashcard.

### Streaks

The streak is calculated from distinct UTC `YYYY-MM-DD` dates in lesson progress, test results and `FlashcardProgress.reviewedDays`. Consecutive activity ending today or yesterday is counted.

### Security

Login sets an HTTP-only `token` cookie. Authentication verifies the token and reloads the user on every request. Password hashes are excluded from auth responses. CORS requires the exact `CLIENT_URL` and credentials.

### Validation and rate limits

Joi validators trim strings, strip unknown fields and reject malformed IDs. Image and material URLs must use HTTPS, host `res.cloudinary.com`, and begin with `/<configured-cloud-name>/`.

| Limiter | Applies to | Limit |
| --- | --- | --- |
| General | Every route | 1,000 requests/IP/15 minutes |
| Strict | Register and login failures | 20/IP/15 minutes |
| Answer | `POST /questions/:id/answer` | 100/user/15 minutes |
| Submit | `POST /tests/:id/submit` | 60/user/15 minutes |
| Mark done | `POST /lessons/:id/mark-done` | 60/user/15 minutes |
| Upload | Admin image and PDF uploads | 30/user/15 minutes |
| Flashcard rate | `POST /flashcards/:id/rate` | 300/user/15 minutes |

## Reference

<details>
<summary><strong>Data models</strong></summary>

All schemas have timestamps. Soft-deletable content has `deletedAt`.

| Model | Main fields |
| --- | --- |
| **User** | `name`, `email`, hidden bcrypt `password`, `role`, `avatar`, `isActive` |
| **Course** | `code`, `title`, `description`, `isPublished`, `deletedAt` |
| **Unit** | `course`, `title`, `order`, `deletedAt` |
| **Lesson** | `unit`, `title`, `order`, `explanation`, optional `explanationImage`, `videoHost`, `videoId`, `isPublished`, `deletedAt` |
| **Test** | `scope`, one of `lesson`/`unit`/`course`, `title`, `order`, `isPublished`, `deletedAt` |
| **Question** | `test`, `type`, `text`, option objects, `correctOption`, `correctAnswer`, explanation images, `order`, `deletedAt` |
| **TestResult** | `user`, `test`, `bestScore`, `lastScore`, `attempts`, `completedAt`, `completedDays` |
| **Progress** | `user`, `lesson`, `completed`, best `score`, `completedAt`, `completedDays` |
| **Flashcard** | `lesson`, `front`, `back`, `order`, `isPublished`, `deletedAt` |
| **FlashcardProgress** | `user`, `flashcard`, `confidence`, `reviewCount`, `lastReviewedAt`, `reviewedDays` |
| **Material** | `lesson`, `title`, `description`, `kind`, file metadata or `linkUrl`, `order`, `isPublished`, `deletedAt` |

Allowed avatar keys are `beaker`, `flask`, `atom`, `test-tube`, `microscope`, `flame`, `molecule`, `magnet`, `crystal`, `dna`, `leaf` and `periodic-tile`. The default avatar is `null`.

</details>

<details>
<summary><strong>Uploads</strong></summary>

Image uploads accept JPEG, PNG and WEBP bytes, up to 2 MB, and use `catalyst/images`. PDF uploads accept only bytes beginning `%PDF-`, up to 10 MB, and use `catalyst/materials`. PDF public IDs are server-generated lowercase 20-character names ending `.pdf`.

Saved Cloudinary image and file URLs must use HTTPS, exactly `res.cloudinary.com`, no credentials or port, and a pathname starting with `/<cloud name>/`. Image public IDs start with `catalyst/`; material file IDs start with `catalyst/materials/`, end with `.pdf`, and appear in the URL.

</details>

<details>
<summary><strong>Middleware</strong></summary>

`helmet`, `cors`, `express.json`, `cookie-parser` and `logger` are global middleware. Route middleware includes `generalLimiter`, `strictLimiter`, `answerLimiter`, `submitLimiter`, `markDoneLimiter`, `uploadLimiter`, `flashcardRateLimiter`, `authenticate`, `authorizeRole`, `validate`, `upload`, `materialUpload`, `notFound` and `error`.

`notFound` and `error` are the final middleware and return safe errors without exposing internal messages.

</details>

<details>
<summary><strong>Project structure</strong></summary>

```text
src/
  app.js
  server.js
  config/
  controllers/
  middlewares/
  models/
  routes/
  utils/
```

</details>

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Startup says `JWT_SECRET, JWT_EXPIRES_IN and CLOUDINARY_URL must be set in .env` | One required environment variable is missing |
| Connection times out | The IP is not on the Atlas allowlist |
| `bad auth : authentication failed` | Wrong database credentials |
| `400` from an upload | The field name, byte signature, file size, URL host or public ID rule is invalid |
| `401` after login | The client is not keeping cookies |
| `403` on an admin route | The account is not an admin or the role change was not followed by a new login |
| `401` on a material URL | In Cloudinary, go to Settings, then Security, and tick "Allow delivery of PDF and ZIP files" |
| Lists are empty | Content is unpublished or deleted |

## Known limitations

- Materials are served through public links until subscription checks exist.
- Cloudinary's free plan has monthly usage limits.
- Soft-deleted content keeps its Cloudinary images and files.
- The frontend has not yet been updated for tests, flashcards, materials and avatars.
- There are no automated tests; verification is currently performed with isolated scripts and HTTP checks.
- Admin promotion is manual.
