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
| `TRUST_PROXY` | Optional. Number of proxies in front of the app, so the app sees each student's real IP address. Leave unset when there is no proxy | `1` |
| `REQUIRE_SUBSCRIPTION` | Optional. `true` makes students need an active subscription to open lessons, tests, flashcards and materials. Default off | `true` |
| `RATE_LIMIT_USER` | Optional. Requests per signed-in user per 15 minutes. Default `600` | `600` |
| `RATE_LIMIT_IP` | Optional. Requests per IP address per 15 minutes, a ceiling against floods. Default `5000` | `5000` |
| `RATE_LIMIT_AUTH_FAILS` | Optional. Failed logins or registrations per IP and email per 15 minutes. Default `20` | `20` |
| `RATE_LIMIT_AUTH_IP` | Optional. Failed logins or registrations per IP across all emails per 15 minutes. Default `200` | `200` |
| `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Optional. Used only by `npm run seed:demo`. Choose any emails and passwords (8 or more characters) | `demo.student@example.test` |

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

### Demo data

`npm run seed:demo` fills the database with a demo student, a demo admin and one published course, `DEMO113`. The course has 2 units and 6 lessons with sample CHEM113 text, formulas, one YouTube video, a test with 4 questions, 6 flashcards and a link material per lesson, plus a test for each unit and for the course. The demo student gets one finished lesson, one test result and a 3-day streak.

Set the four `DEMO_` variables in `.env` first. Passwords are read from `.env` and never printed. It writes to the database in `MONGODB_URI`.

- Safe to run twice: anything that already exists is left unchanged.
- `npm run seed:demo -- --reset` permanently deletes every course whose code starts with `DEMO`, everything inside them, and the two demo users with their progress. Nothing else is touched.

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
| POST | `/auth/register` | Public | Create a student and set the cookie. Optional `timeZone` (an IANA name such as `Africa/Accra`, sent by the browser) |
| POST | `/auth/login` | Public | Log in |
| POST | `/auth/logout` | Public | Clear the cookie |
| POST | `/auth/forgot-password` | Public | Body `{ email }`. Always answers 200 with the same message, whether or not the email has an account. If it does, a reset link (valid 30 minutes) goes to `sendEmail` |
| POST | `/auth/reset-password` | Public | Body `{ token, password }`. Single-use token. 400 when the token is wrong, used or expired |
| POST | `/auth/verify-email` | Public | Body `{ token }`. Single-use token valid 24 hours. Sets `emailVerified: true` |
| POST | `/auth/resend-verification` | Student | Sends a new verification link and cancels the old one. 200 with a note if already verified |
| GET | `/auth/me` | Student | Return `id`, `name`, `email`, `role`, `avatar`, `subscriptionEndsAt`, `hasAccess` and the current `streak` (so the top bar needs no second request) |
| PUT | `/auth/me/avatar` | Student | Body `{ "avatar": "beaker" }` or `{ "avatar": null }` |
| PUT | `/auth/me/email` | Student | Body `{ password, email }`. 401 wrong password, 400 same email, 409 address already used. Sends a link (valid 1 hour) to the NEW address and a warning to the old one. The account email does not change yet |
| POST | `/auth/confirm-email` | Public | Body `{ token }`. Single-use. Switches the account to the new email and marks it verified. 400 for a wrong, used or expired token, 409 if someone took the address meanwhile |
| PUT | `/auth/me/password` | Student | Body `{ currentPassword, newPassword }` (8 to 72 characters). 401 when the current password is wrong, 400 when the new one is the same. Logs out every other device and sets a fresh cookie on this one |
| GET | `/auth/me/export` | Student | The student's own data as JSON: profile, progress, test results, mistakes, flashcard progress, mastery, notes, bookmarks, positions, study time and exam answers. No password hash, no correct answers, no marked exam results. 3 per 15 minutes |
| DELETE | `/auth/me` | Student | Body `{ password, confirm: "DELETE" }`. Permanent, see below. 409 for the only remaining admin |
| PUT | `/auth/me/preferences` | Student | Any of `{ onboarded, examDate (ISO date or null), goalKind: "none"|"minutes"|"lesson", goalMinutes (5 to 240), timeZone (IANA name), notify: { review, lesson } (booleans) }`. `/auth/me` and login return `onboarded`, `examDate`, `dailyGoal`, `timeZone` (null until the browser reports it) and `notify`. New accounts start with `onboarded: false`; older accounts count as done |

Example avatar response:

```json
{ "data": { "id": "...", "name": "Ama", "email": "ama@example.com", "role": "student", "avatar": "beaker" } }
```

### Notifications

All routes need login. Messages are in-app only (no email).

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications` | Authenticated | `{ unread, items }`, newest 20 first. Each item has `id`, `type` (`lesson` or `review`), `title`, `body`, `link` (an app path), `read`, `createdAt`. For students it first creates today's "Review is ready" message if cards or mistakes are due |
| POST | `/notifications/read-all` | Authenticated | Mark every message read |
| POST | `/notifications/:id/read` | Authenticated | Mark one read. 400 bad id, 404 not yours |

### Reports

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/reports` | Student | Body `{ kind: "question" or "lesson", target (id), category: "wrong_answer", "typo", "unclear" or "other", note (up to 500 characters, optional) }`. 404 when the item is hidden from students, 409 when this student already has an open report on it. 10 per 15 minutes |

### Courses and lessons

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | Student | Published courses, each with `category` (`{ _id, name, slug }`, General when none) and `authors` (`displayName`, `bio`, `avatar`). `?category=<slug>` filters; `general` also matches courses with no category |
| GET | `/courses/categories` | Student | Categories that have a published course (General included when some course has none), for the filter |
| POST | `/events` | Student | Body `{ type: "video_started" | "focus_session_completed", props? }`. Answers 204. Only things the server cannot see itself. Ignored for admins |
| GET | `/home` | Student | Every published course (with `category` and `authors`) with this student's progress and the next lesson to open |
| GET | `/courses/:id` | Student | Course outline, tests and lesson progress |
| GET | `/lessons/:id` | Student | Visible lesson summary |
| GET | `/lessons/:id/hub` | Student | The lesson screen in one call: the lesson summary plus `completed` and the `materials` list |
| GET | `/lessons/:id/flashcards` | Student | Published flashcards and confidence summary |
| GET | `/lessons/:id/materials` | Student | Published lesson materials |
| POST | `/lessons/:id/mark-done` | Student | Mark a lesson done only when it has neither qualifying tests nor flashcards |

`GET /home` returns `{ count, data }`. Each course has `code`, `title`, `description`, `progress` (`completedLessons`, `totalLessons`) and `next` (`lessonId`, `label` such as `"1.1"`, `title`), or `next: null` when every lesson is done. It uses a fixed number of queries however many courses exist. `GET /lessons/:id/hub` returns the same fields as `GET /lessons/:id` and adds `completed` (has this student finished it) and `materials` (the same items as `GET /lessons/:id/materials`). Both are read-only and send no answers.

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
| POST | `/questions/:id/answer` | Student | Check one answer. A wrong answer also adds the question to the student's mistakes queue |
| GET | `/mistakes` | Student | Open mistakes as counts by course and unit (`{ total, data }`), no questions or answers |
| GET | `/review/due` | Student | `{ data: { cards, mistakes } }`: flashcards and mistakes due now |
| GET | `/review/session` | Student | Up to 20 due flashcards (`_id`, `front`, `back`, `lessonId`), soonest due first. Rate each with `POST /flashcards/:id/rate` |
| GET | `/topics` | Student | `{ data: { topics, sources, years } }`, each a list of `{ value, count }` for tagged questions the student may see |
| GET | `/topics/practice` | Student | Up to 20 answer-free questions across lessons, random order. Query `topic`, `source`, `year` (at least one; a bad year or no filter returns 400) |
| GET | `/study-sets` | Authenticated | The student's own sets, newest change first, each with `cardCount` and `quizCount`. `?q=` searches title, topic and description |
| POST | `/study-sets` | Authenticated | Body `{ title, topic?, description?, course? }`. Always private. Up to 100 sets per student |
| GET / PUT / DELETE | `/study-sets/:id` | Owner | Read, change or delete (soft delete) a set. Anyone else gets 404, admins included |
| GET / PUT | `/study-sets/:id/notes` | Owner | The notes as a Tiptap document (`{ content }`). Only a short list of node types (paragraph, headings 1 to 3, lists, quote, code, formulas) and marks (bold, italic, strike, code) is accepted, up to 60,000 characters |
| GET / POST | `/study-sets/:id/cards` | Owner | List or add a flashcard (`{ front, back }`, 500 characters each). Up to 500 per set |
| POST | `/study-sets/:id/cards/bulk` | Owner | Body `{ cards: [{ front, back }] }`, 1 to 200. All or none. For the paste-and-split helper |
| PUT / DELETE | `/study-sets/cards/:cardId` | Owner | Change or delete a card |
| GET | `/study-sets/:id/study` | Owner | The deck with the student's rating on each card (`?filter=review` for unrated, unsure and don't-know cards). Ratings go to `POST /flashcards/:id/rate`, which also works for set cards (owner only) |
| GET / POST | `/study-sets/:id/quizzes` | Owner | List or add a quiz (`{ title }`). Up to 20 per set |
| GET / PUT / DELETE | `/study-sets/quizzes/:testId` | Owner | The quiz with its questions and answers, rename it, or delete it |
| POST / PUT / DELETE | `/study-sets/questions`, `/study-sets/questions/:id` | Owner | Same bodies as the admin question routes, but only `mcq` and `true_false`, only in the student's own quiz, up to 100 per quiz |
| GET | `/study-sets/:id/materials` | Owner | Source material (no text), plus `usedBytes` and `limitBytes` |
| POST | `/study-sets/:id/materials/text` | Owner | Body `{ title, text }` (20 to 100,000 characters) |
| POST | `/study-sets/:id/materials/pdf` | Owner | Multipart field `file`: a PDF up to 10 MB (checked by type and `%PDF-` bytes). 30 uploads per 15 minutes. 400 when the PDF has no readable text |
| DELETE | `/study-sets/materials/:materialId` | Owner | Removes the row and the private file |
| GET | `/my-exams` | Student | The student's own exams: `{ upcoming, past }`. Each has `id`, `course` (`id`, `code`, `title`), `startsAt`, `type` and `daysLeft` (calendar days in the student's time zone). Upcoming is nearest first |
| POST | `/my-exams` | Student | Body `{ course, startsAt (ISO), type: "mid_semester" | "end_semester" | "quiz" }`. Up to 20 per student. 404 for an unpublished course |
| DELETE | `/my-exams/:id` | Student | Delete one of your exams |
| GET | `/hall` | Student | Study Hall: `{ focusing, joined, goal }`. `focusing` counts students with a heartbeat in the last 90 seconds. Never names anyone |
| POST | `/hall/heartbeat` | Student | Body `{ goal? }` (80 characters). Joins the hall or keeps the place. Send every 30 seconds |
| DELETE | `/hall` | Student | Leave the hall |
| POST | `/tests/:id/exam/start` | Student | Start a timed exam, or resume the open one. A test with `timeLimitMinutes` is always timed. Any other test is timed only when the body is `{ timed: true }` (one minute a question). The student's `extraTime` percentage (0, 25, 50 or 100, set with `PUT /auth/me/preferences`) is added when the attempt is created. Returns `attemptId`, `endsAt`, `serverNow`, saved `answers` and `flags`, and answer-free `questions`. If the time ran out while the student was away it marks the saved answers and returns `{ finished: true, result }` |
| PUT | `/exam-attempts/:attemptId` | Student | Save `answers` (`{ questionId: answer }`) and `flags` (question ids). `409` after submit or after the deadline |
| POST | `/exam-attempts/:attemptId/submit` | Student | Hand in the exam. Returns `score`, `correct`, `total`, `bestScore`, `attempts`, `passPercent`, `passed` and a `review` of every question with the right answer, explanation and worked solution. Repeating it returns the same result |
| GET | `/plan` | Student | Today's revision plan, or `{ data: null }` with no exam date or a past one. Returns `examDate`, `daysLeft` (today counts), `remainingLessons`, `perDay`, `doneToday`, up to 6 `lessons` for today, `moreLessons`, and `due: { cards, mistakes }`. The exam date is set with `PUT /auth/me/preferences` |
| GET | `/mistakes/practice` | Student | Up to 20 answer-free questions to practise, most-missed first. Optional `course` and `unit` query ids (invalid id returns 400) |
| POST | `/admin/tests` | Admin | Create a lesson-, unit- or course-scope test |
| GET | `/admin/tests/:id` | Admin | Full test and questions |
| PUT | `/admin/tests/:id` | Admin | Update title, order, publication or pass percent |
| DELETE | `/admin/tests/:id` | Admin | Soft-delete a test |
| POST | `/admin/questions` | Admin | Create a question |
| PUT | `/admin/questions/:id` | Admin | Update a question |
| DELETE | `/admin/questions/:id` | Admin | Soft-delete a question |

To create or update a multiple-choice question, send options (a list without ids) and correctIndex (the position of the correct option) together. The server saves the options, gives each an id, and stores the id of the correct one. A question's type and a material's kind cannot be changed after creation. A true/false question has no options or correctIndex and requires correctAnswer equal to `"true"` or `"false"`. Question and explanation images use `{ "url", "publicId", "alt" }` and may also carry `width` and `height` in pixels (the upload response returns them; send them back when saving, so the browser can reserve the space before the image loads). `alt` is required when a URL is present. Images saved without a size keep working.

Questions can also carry an optional `hint` (up to 500 characters, sent to students with the test so they can open it before answering) and an optional `workedSolution` (up to 12 steps of up to 1000 characters, each may use formulas). The worked solution is never sent with the test: `POST /questions/:id/answer` returns it as `workedSolution` (an empty list when there is none) after the student answers.

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
| GET | `/progress/overview` | Student | The progress screen in one call: `progress` rows, `streak` and every published course outline in `courses` |
| PUT | `/progress/position` | Student | Remember where the student is in a course: `{ lessonId, kind: "lesson"|"flashcards", position, total }`. 204. Home returns it as `last` on each course. `/home` also returns `goal: { kind, target, done, met }` for today. The streak counts any study day, whether or not the goal is met |
| POST | `/progress/study-time` | Student | Body `{ seconds }` (1 to 120). Adds study time for today; feeds the "minutes" daily goal |
| GET | `/search?q=` | Student | Search lesson titles and text (2 to 80 characters, best 20). Only visible lessons. Needs the `lesson_search` text index: run `npm run sync:search-index` once per database (it drops the old title-only index first) |
| GET | `/bookmarks` | Student | The saved list (lessons and questions). Hidden or deleted items are left out |
| PUT | `/bookmarks` | Student | Body `{ kind: "lesson"|"question", id }`. 204. Saving twice is fine |
| DELETE | `/bookmarks/:kind/:id` | Student | 204 |
| PUT | `/notes/:lessonId` | Student | Body `{ text }` (up to 2000 characters, private). Empty text removes the note. The lesson hub returns `note` and `saved` |

### Admin content

Create routes require an available parent. Delete routes are soft deletes.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/courses` | List all non-deleted courses |
| GET | `/admin/courses/:id` | Full editor tree with drafts, tests and lesson counts |
| POST | `/admin/courses` | Create a course. Optional `category` (id or null) and `authors` (up to 10 ids); 400 when one does not exist |
| PUT | `/admin/courses/:id` | Update a course (same optional `category` and `authors`) |
| GET | `/admin/dashboard` | The dashboard numbers: `computedAt`, 30 days of `trend` (dau, wau, mau, signups), `stickiness` (DAU divided by MAU, latest finished day), `latest`, `signupsThisWeek`, `openReports` (live) and `summary` (activation, retention, top lessons, drop-off, 7 and 30 day totals). `summary` is null until the stats script has run |
| GET | `/admin/categories` | Every category, by order then name |
| POST | `/admin/categories` | Body `{ name, order? }`. The slug is made from the name. "General" is reserved. 409 on a clash |
| PUT | `/admin/categories/:id` | Rename or reorder |
| DELETE | `/admin/categories/:id` | Delete. Its courses fall back to General |
| GET | `/admin/authors` | Every author |
| POST | `/admin/authors` | Body `{ displayName, bio?, avatar? }` (avatar is an uploaded image like other images) |
| PUT | `/admin/authors/:id` | Update an author |
| DELETE | `/admin/authors/:id` | Delete. The author is removed from every course |
| DELETE | `/admin/courses/:id` | Soft-delete a course |
| POST | `/admin/units` | Create a unit |
| POST | `/admin/units/:id/summary-pdf` | Body `{ lesson }` (optional: one of the unit's lessons, else the first). Makes a PDF of the unit's published lessons and saves it as an unpublished PDF material on that lesson. 409 when the unit has no published lessons. 30 per 15 minutes (upload limit) |
| PUT | `/admin/units/:id` | Update a unit |
| DELETE | `/admin/units/:id` | Soft-delete a unit |
| PUT | `/admin/units/reorder` | Reorder units with `{ "course", "ids" }` |
| POST | `/admin/lessons` | Create a lesson |
| GET | `/admin/lessons/:id` | Get a lesson with tests, flashcards and materials |
| PUT | `/admin/lessons/:id` | Update a lesson. A save that changes the title, explanation, image or video first keeps the old text as a version |
| GET | `/admin/lessons/:id/versions` | The saved versions of a lesson, newest first (up to 50), with the full old text |
| POST | `/admin/lessons/:id/versions/:versionId/restore` | Put an older version back. The current text is saved as a version first |
| GET | `/admin/preview/lessons/:id` | The lesson as a student gets it (same shape as `/lessons/:id/hub`), drafts included, with `isPublished`, `visibleToStudents`, a `draft` flag on tests, cards and materials, and the cards listed. Writes nothing |
| GET | `/admin/preview/tests/:id` | The test as the student player gets it, drafts included, no answers. A timed test is shown untimed. Writes nothing |
| POST | `/admin/preview/questions/:id/answer` | Body `{ answer }`. Graded like `/questions/:id/answer`, but records nothing (no mistake, mastery or statistic) |
| GET | `/admin/analytics/questions` | Query `minAttempts` (default 5) and `limit` (default 50, at most 200). Questions by lowest percent correct: `attempts`, `correct`, `percentCorrect`, `topWrong` (`{ label, count }`, multiple choice and true/false only) |
| GET | `/admin/reports` | The report inbox. Query `status` (`open` or `resolved`) and `page`. Returns `counts`, and for each report the kind, category, note, student name, reply and an `editorLink` |
| PUT | `/admin/reports/:id/resolve` | Body `{ reply }` (optional, up to 1000 characters). Marks it resolved and sends the student a notification with the reply. 409 if already resolved |
| GET | `/admin/questions/import-template` | The CSV template, one example row for each of the 8 question types |
| POST | `/admin/tests/:id/import` | CSV import. Send the file as the body with `Content-Type: text/csv` (up to 1 MB, 200 rows). `?dryRun=0` saves; otherwise it is a dry run that saves nothing. Returns `total`, `valid`, `errors` (`{ line, message }` per bad row) and `rows`. A real import saves all rows or none (409 when any row is bad) and adds the questions at the end of the test |
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
| GET | `/admin/users` | Paginated user list without password hashes. Query: `q` (name or email), `role`, `status` (`active`, `inactive`, `subscribed`, `expired`), `page`, `limit` |
| PUT | `/admin/users/:id` | Change `role`, `isActive`, `subscriptionEndsAt` (date or `null`) or `extendMonths` (1 to 12, from today or the current end date). Admins cannot demote or deactivate themselves, and the last active admin cannot be removed (`409`) |
| GET | `/admin/stats` | Counts for the admin home page: students, admins, subscriptions, courses, lessons, tests and the last 7 days of activity |
| GET | `/admin/trash` | Soft-deleted courses, units, lessons, tests, questions, flashcards and materials, newest first, with `blocked: true` when the parent is still deleted |
| POST | `/admin/trash/:type/:id/restore` | Restore one item. `type` is `course`, `unit`, `lesson`, `test`, `question`, `flashcard` or `material`. Returns `409` naming the parent to restore first |

## How it works

### Visibility, completion and soft deletes

A visible lesson requires a published lesson and course, an available unit, and no `deletedAt` on any parent. Tests count toward completion and outline counts only when published and containing at least one non-deleted question. Flashcards and materials use their own published, non-deleted filters.

`deletedAt` is set instead of removing records. Students receive 404 for hidden content. Cloudinary assets are not automatically deleted when content is soft-deleted.

Deleted items are listed at `GET /admin/trash` and put back with `POST /admin/trash/:type/:id/restore`. An item can only be restored when every parent is in place (a lesson needs its unit and course). A restored item goes to the end of its list and is **unpublished** (where it can be published), so nothing reappears for students until an admin publishes it. Course codes are unique ignoring case, and a course in the Trash still holds its code; creating or renaming a course to a taken code returns `409`.

### Subscriptions

`User.subscriptionEndsAt` is set by an admin (`PUT /admin/users/:id`). It does nothing until `REQUIRE_SUBSCRIPTION=true`. Then a student without a future `subscriptionEndsAt` gets `403` with `code: "SUBSCRIPTION_REQUIRED"` from lessons, tests, questions, flashcards and materials. Browsing courses, progress and settings stay open, and admins always have access. `GET /auth/me` returns `subscriptionEndsAt` and `hasAccess`.

### Question types

| Type | Fields | Rules |
| --- | --- | --- |
| `mcq` | `text`, `options`, `correctOption` | 2 to 6 option objects; each option has text or an image; correct option must be one option |
| `true_false` | `text`, `correctAnswer` | No options or `correctOption`; answer is `"true"` or `"false"` |
| `multi_select` | `text`, `options`, `correctIndexes` | 2 to 6 options; send `options` (no ids) and `correctIndexes` together; fully right or fully wrong. Answer: JSON list of option ids |
| `numeric` | `text`, `numeric: { value, tolerance, toleranceKind, unit }` | `toleranceKind` is `absolute` or `percent`. If `unit` is set the student must give it (case and spaces ignored). Answer: JSON `{ "value": "2.5", "unit": "mol/L" }`. A right number with a wrong unit returns `isCorrect: false` and `unitWrong: true` |
| `fill_blank` | `text`, `acceptedAnswers` | 1 to 20 answers; case and extra spaces ignored. Answer: the text |
| `matching` | `text`, `pairs: [{ left, right }]` | 2 to 8 pairs. Students get `left` and a shuffled `right` list and answer with a JSON list: for each left item, the position of the chosen right item |
| `ordering` | `text`, `items` | 2 to 8 items in the correct order. Students get them shuffled and answer with a JSON list of the shown positions in the order chosen |
| `balancing` | `text`, `equation: { species: [{ formula, side, coefficient }] }` | 2 to 8 species, `side` is `reactant` or `product`, coefficients are the lowest whole numbers (a common factor is rejected). Students get formulas and sides only and answer with a JSON list of coefficients |

The shuffle for matching and ordering is seeded by the question id, so the server rebuilds the order the student saw. Every type is graded by `utils/grading.js`, for both `POST /questions/:id/answer` and `POST /tests/:id/submit`. After answering, `correctAnswer` has the right answer in a shape that fits the type.

Student serializers omit correct answers. Scores are calculated on the server. An empty test cannot be submitted for credit. Unit tests and course tests record a result but never complete a lesson. Mark as done returns `409` for any lesson with a test that has questions or a published flashcard.

### Revision plan

A plain sum, not AI. Lessons not yet completed (every published course, in course code, unit and lesson order) are shared evenly over the days left until the exam, today included: today's share is `ceil((remaining + done today) / days left)`. Counting lessons already done today keeps the share steady while the student works through it. The list shows the first lessons still to do for today's share, with today's due flashcards and mistakes. With an exam today, everything left is today's share.

### Timed mock exams

(Any test can be taken timed: see `POST /tests/:id/exam/start` for the `timed` option and extra time. The server owns the clock: `endsAt` is fixed when the attempt is created, `PUT /exam-attempts/:id` is refused after it with 409, and a submit after it plus 5 seconds of grace marks only the answers saved before the deadline. An attempt left open past its deadline is marked the next time the student opens the test.)

An admin sets `timeLimitMinutes` (1 to 360) on a test with `PUT /admin/tests/:id`; `null` makes it ordinary again. For a timed test, `GET /tests/:id` returns `timed: true`, `timeLimitMinutes`, `questionCount` and no questions, so the exam is only taken through `/tests/:id/exam/start`. The server sets `endsAt` when the exam starts and the browser counts down to it. A submit that arrives within 5 seconds after `endsAt` uses the browser's final answers; a later one uses only the answers saved before the deadline. The first submit claims the attempt, so two submits cannot record two results. The result counts like a normal test (best score, attempts, lesson completion for a passed lesson test, mastery), and every question is passed to the mistakes queue. Feedback is only in the submit result. Known limit: a student who knows a question id can still call `POST /questions/:id/answer` during the exam, which only hurts their own mark.

### Question tags

Questions can carry optional `topic` and `source` (up to 60 characters each) and `year` (1900 to 2100, or `null`). They only matter for `GET /topics` and `GET /topics/practice`, which leave out questions whose test is unpublished or deleted.

### Mastery per lesson

Each student has a level per lesson (`Mastery`): none (Not started), 1 Attempted, 2 Familiar, 3 Proficient, 4 Mastered. `GET /courses/:id` returns it as `mastery` (0 to 4) on each lesson. Rules (`utils/mastery.js`):

- Any lesson test submit, flashcard rating or Mark as done: Attempted.
- Lesson test score of 70% or more: Familiar. 100%: Proficient.
- Mastered: from Proficient, 100% on the lesson test again, a right answer on a lesson question that was in the mistakes queue, or a flashcard marked Confident, each on a later day (the student's own) than the day Proficient was reached.
- A wrong answer on a lesson question drops one level, at most once a day, never below Attempted. A low test score by itself never lowers a level.
- Unit and course tests do not change lesson mastery, by design: they stay tied to their unit or course, and their questions are not linked to lessons. Unit-level and course-level mastery, built from those tests, is the planned next step.

### Spaced repetition

The `ts-fsrs` package schedules reviews at `request_retention` 0.9 with short-term steps off (a rating always schedules a day or more ahead). Don't know maps to Again, Unsure to Hard, Confident to Good. `POST /flashcards/:id/rate` stores the card state (`fsrs`) and `due` on the student's `FlashcardProgress`. Answering a mistake wrong schedules it as Again, right as Good (`Mistake.fsrs`, `Mistake.due`). Rows from before this feature have no `due`: an unsure or unknown card with no `due`, and a mistake with no `due`, count as due, so old confidence data keeps working. `GET /mistakes/practice?due=1` returns only due mistakes.

### Mistakes queue

Every graded answer through `POST /questions/:id/answer` updates the student's queue (`Mistake`: wrong count, last wrong date, correct streak). A wrong answer adds the question and resets its streak. A right answer counts once per day (the student's own), and the question leaves the queue after two right answers on different days. Questions whose test is unpublished or deleted are left out of both mistakes routes. Practice answers are graded by the same answer route and never submitted, so they do not change test scores.

### Event log

Every key action writes one row to `events` (`{ user, type, ts, props }`, indexed on `ts`, on `user` and `ts`, and on `type` and `ts`), for XP, achievements, leaderboards and the admin dashboard to be built from later. Types: signup, login, lesson_opened, lesson_completed, question_answered, test_submitted, review_done, flashcard_rated, focus_session_completed, video_started, set_created, set_studied, challenge_sent, challenge_played (the last four, and focus sessions, are not logged yet because those features are not built). Logging is fire and forget (utils/events.js): nothing waits for it and a failure only prints to the log. `props` keeps ids, numbers, booleans and short words only (never a name, email or free text). `lesson_completed` is written each time a test pass, a finished deck or Mark as done completes a lesson, so a dashboard counts distinct users and lessons. `review_done` is a due card rated or a mistake answered.

### XP and levels (Phase X5.1)

`utils/xp.js` holds the table. `awardXp(userId, source, { timeZone, key, amount })` writes one row to `xpentries` (the ledger) and adds to `User.xp`. It checks two rules first: a `key` makes an award happen once (unique index on user, source, key), and each source has a daily cap counted in the student's own day. It never throws, so a problem can never break the request that earned the XP. Levels are worked out from total XP and never go down: going from level N to N+1 costs `100 + 25 * (N - 1)` XP.

| Source | XP | Daily cap | Once per |
|---|---|---|---|
| `answer` | 2, or 3 on a first try | 100 | question per day (official tests only, not a student's own quiz) |
| `review` | 3 | 90 | card or mistake per day (due only) |
| `lesson` | 20 | 100 | lesson, ever |
| `mastery` | 15 | 60 | lesson and level, ever (Familiar and above) |
| `daily_goal` | 25 | 25 | day (given when Home loads with the goal met) |
| `focus` | 1 per counted minute | 30 | not keyed |

Not built yet because the features do not exist: weekly goals (X5.3), finishing a video (needs a player event), study sets used by others (needs community sets), and challenges (X5.5).

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/xp/me` | Student | `{ xp, level, into, next, pendingLevelUp }`. `pendingLevelUp` is the level to celebrate, or null |
| POST | `/xp/seen` | Student | Marks the current level as seen (204) |

### Study sets (the Study Lab)

A `StudySet` belongs to one student and is private (`visibility` also allows `link` and `community`, which Phase X7 will use; nothing sets them yet). It holds:

- **Notes** (`SetNote`): one Tiptap JSON document per set, checked by `utils/noteDoc.js` before it is saved.
- **Flashcards**: ordinary `Flashcard` rows with `set` instead of `lesson` (a card has exactly one of the two). `GET /review/due` and `/review/session` include a student's own set cards, so they join the normal spaced-repetition queue; the session card has `setId` and a null `lessonId`. Rating a set card never completes a lesson and does not touch mastery.
- **Quizzes**: `Test` rows with `scope: "set"` and `set` (always published). They are played in the normal test screens (`/tests/:id`, answers, submit, timed attempts), which now pass the student's id to `findVisibleTest(id, viewerId)`: a set quiz is visible only to its owner. Answers in a set quiz do not enter the mistakes queue or the question statistics (those are for official content), and admin counts leave them out.
- **Source material** (`SetMaterial`): a PDF or pasted text. PDF text is read once at upload with `unpdf` and stored; the file goes to the private Cloudinary folder `catalyst/private/study-sets` (`type: "private"`, no public link is kept or returned). A student may upload 50 MB in total and 20 materials per set. Material is not used by anything yet; Phase X6 will read it.

Everything is checked against the owner (`utils/ownSet.js`), so another student's set looks like a set that does not exist, and so does an admin's view of it. `GET /auth/me/export` includes a student's sets with notes, cards, quizzes (with the answers the student wrote) and material text. Deleting an account deletes the sets, cards, quizzes, questions, notes and materials for good, and the private files.

### Admin dashboard numbers

`scripts/compute-stats.js` (run `npm run stats` in `backend/`) reads the last 120 days of the `events` collection and fills two collections: `daily_stats` (one row per UTC day for the last 60 days: dau, wau, mau, signups, event counts) and `stat_summaries` (one row, key `latest`: activation, retention, top lessons, drop-off, totals). It is safe to run again at any time; each run replaces the rows it covers. Run it once a night. On Windows use Task Scheduler (action `npm run stats`, start in the backend folder). On a Linux host use cron, for example `5 0 * * * cd /path/to/backend && npm run stats`. It needs the same `.env` as the server.

- Days are UTC days (one clock for the whole platform). Admin accounts are left out of every number (their activity is still logged). "Active" means any logged event that day, so a login counts.
- **Retention:** students are grouped by the Monday of their sign-up week. Day 1, 7 and 30 are the share of the week's new students who were active exactly that many days after their own sign-up day. A student only counts for Day *n* once day *n* is over; a week with nobody eligible shows n/a.
- **Activation:** of students who signed up in the last 8 weeks and at least 48 hours ago, the share who completed a lesson and submitted a test within 48 hours of signing up. Only sign-ups in the event log count, so students from before the event log (X1) are not in it.
- **Lessons (last 30 days, each student counted once per lesson):** "most completed" ranks by students who completed; "drop off" lists lessons opened by 3 or more students, ordered by the share who did not complete.
- Study set, challenge and achievement counts are 0 until those features exist (achievements are not tracked at all yet).

### Focus timer, exam countdown and Study Hall

- `POST /events` with `focus_session_completed` and `props.minutes` answers `{ counted }`. The server counts only minutes the student was really active (their `StudyTime` for the day, reported by the page while a focus session runs), never more than 90 a day. The event stores the counted minutes and the day (`props.day`).
- `/my-exams` exams move to "past" once their day (in the student's time zone) has passed. `GET /plan` counts down to the nearest upcoming exam and returns `examCourse`; with none, it uses the exam date from Settings. `GET /notifications` makes a `type: "exam"` message at 14, 7, 3 and 1 days (one per exam per milestone; opened late, it makes the next milestone once with the real days left).
- Study Hall rows (`HallPresence`) delete themselves an hour after the last heartbeat.

### Streaks

A "day" is the student's own calendar day, from `User.timeZone` (utils/day.js; UTC when none is set or the name is unknown). Day keys saved before time zones existed were UTC days and stay as they are. The streak is calculated from distinct `YYYY-MM-DD` dates in lesson progress, test results and `FlashcardProgress.reviewedDays`. Consecutive activity ending today or yesterday is counted.

### Speed

The database is far from the server in development (a round trip is about 120 ms), so the number of sequential queries decides how fast an endpoint is. The course outline reads in 4 round trips (it was 9), and a lesson in 3 (it was 9): queries that do not depend on each other run together with `Promise.all`, and `findVisibleLesson` reads the lesson, unit and course with one `$lookup` instead of three populates. Responses are gzip-compressed by the `compression` package. `authenticate` keeps the logged-in user's role and status in memory for 15 seconds (`utils/authCache.js`), and an admin change to a user clears that entry at once. With several server processes a change can take up to 15 seconds to reach the others.

Indexes added for the queries that filter or sort: `Unit {course, deletedAt, order}`, `Lesson {unit, order}` and `Course {isPublished, deletedAt, code}`. Mongoose builds them when the server starts.

### Security

Login sets an HTTP-only `token` cookie. Authentication verifies the token and reloads the user on every request. Password hashes are excluded from auth responses. CORS requires the exact `CLIENT_URL` and credentials.

### Validation and rate limits

Joi validators trim strings, strip unknown fields and reject malformed IDs. Image and material URLs must use HTTPS, host `res.cloudinary.com`, and begin with `/<configured-cloud-name>/`.

| Limiter | Applies to | Limit |
| --- | --- | --- |
| General, per user | Every route, for signed-in users | 600/user/15 minutes (`RATE_LIMIT_USER`) |
| General, per IP | Every route | 5,000/IP/15 minutes (`RATE_LIMIT_IP`), a ceiling against floods that many students on one network will not reach |
| Strict, per account | Register and login failures | 20/IP and email/15 minutes (`RATE_LIMIT_AUTH_FAILS`) |
| Strict, per IP | Register and login failures | 200/IP/15 minutes (`RATE_LIMIT_AUTH_IP`) |
| Email, per account | Forgot password and resend verification (every request counts) | 5/IP and email, or 5/user, per 15 minutes |
| Email, per IP | Same routes | 30/IP/15 minutes |
| Account, per user | Change password, change email and delete account failures | 10/user/15 minutes |
| Export, per user | Download my data | 3/user/15 minutes |
| Report, per user | `POST /reports` | 10/user/15 minutes |
| Answer | `POST /questions/:id/answer` | 100/user/15 minutes |
| Submit | `POST /tests/:id/submit` | 60/user/15 minutes |
| Mock exam | Exam start, save and submit | 600/user/15 minutes |
| Mark done | `POST /lessons/:id/mark-done` | 60/user/15 minutes |
| Upload | Admin image and PDF uploads | 30/user/15 minutes |
| Flashcard rate | `POST /flashcards/:id/rate` | 300/user/15 minutes |

## Reference

<details>
<summary><strong>Data models</strong></summary>

All schemas have timestamps. Soft-deletable content has `deletedAt`.

| Model | Main fields |
| --- | --- |
| **AuthToken** | `user`, `type` (`reset` or `verify`), `tokenHash` (SHA-256, never the plain token), `expiresAt` (TTL index removes it) |
| **User** | `name`, `email`, hidden bcrypt `password`, `role`, `avatar`, `isActive`, `subscriptionEndsAt`, `emailVerified`, `passwordChangedAt`, `deletedAt` |
| **Course** | `code`, `title`, `description`, `isPublished`, `deletedAt` |
| **Unit** | `course`, `title`, `order`, `deletedAt` |
| **Lesson** | `unit`, `title`, `order`, `explanation`, `explanationMath` (formulas drawn by the server, hidden from reads unless asked for), optional `explanationImage`, `videoHost`, `videoId`, `isPublished`, `deletedAt` |
| **Test** | `scope`, one of `lesson`/`unit`/`course`, `title`, `order`, `isPublished`, `deletedAt` |
| **Question** | `test`, `type`, `text`, option objects, `correctOption`, `correctAnswer`, explanation images, `order`, `deletedAt` |
| **TestResult** | `user`, `test`, `bestScore`, `lastScore`, `attempts`, `completedAt`, `completedDays` |
| **Progress** | `user`, `lesson`, `completed`, best `score`, `completedAt`, `completedDays` |
| **Flashcard** | `lesson`, `front`, `back`, `order`, `isPublished`, `deletedAt` |
| **FlashcardProgress** | `user`, `flashcard`, `confidence`, `reviewCount`, `lastReviewedAt`, `reviewedDays` |
| **QuestionStat** | `question` (unique), `attempts`, `correct`, `wrong` (a count per wrong choice). No student id, so it is anonymous |
| **Report** | `user`, `kind`, `target`, `test`, `category`, `note`, `title`, `link`, `status`, `reply`, `resolvedAt`, `resolvedBy` |
| **LessonVersion** | `lesson`, the old `title`, `explanation`, `explanationImage`, `videoHost`, `videoId`, `savedBy`, `reason` (`edit` or `restore`) |
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

`helmet`, `compression`, `cors`, `express.json`, `cookie-parser` and `logger` are global middleware. Route middleware includes `generalLimiter`, `strictLimiter`, `answerLimiter`, `submitLimiter`, `markDoneLimiter`, `uploadLimiter`, `flashcardRateLimiter`, `authenticate`, `authorizeRole`, `validate`, `upload`, `materialUpload`, `notFound` and `error`.

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


### Password reset and email verification

Emailed links carry a random 32-byte token. Only its SHA-256 hash is stored in `AuthToken`, and the row is deleted when used, so a link works once. Asking for a new link cancels the older one. `utils/sendEmail.js` is the only place that sends mail: in development it prints the message, with the link, to the server console; in production it throws until real sending is built. Links point to `CLIENT_URL` (`/reset-password?token=...`, `/verify-email?token=...`). New accounts start with `emailVerified: false`; older accounts count as verified. Unverified students are only warned (a banner with a resend button): nothing is blocked. A password reset does not end sessions that are already logged in.

### Notifications

`Notification` rows hold one message for one student. A unique `key` per user stops repeats: `lesson:<lessonId>` (one per lesson) and `review:<date in the student's time zone>` (one per day). Two things create messages. (1) An admin saves a lesson with `isPublished: true` when it was hidden: every active student gets "New lesson" (only if the unit and course are visible; editing an already published lesson, or re-publishing after hiding, sends nothing new). This runs in the background after the save answers, so it can take a moment on a large student list. (2) The first `GET /notifications` of the student's day creates "Review is ready" when flashcards or mistakes are due. A student can switch off either kind with `notify.review` and `notify.lesson` (`PUT /auth/me/preferences`); both default to on. Messages delete themselves after 60 days (TTL index) and are removed when the account is deleted. A "report answered" message is not built because Catalyst has no reporting feature yet.

### Formulas drawn on save

When a lesson is created, edited or restored from history, `utils/math.js` finds every `$formula$` and `$$formula$$` in the explanation (the same splitting rules as `RichText.jsx` in the frontend), draws each with KaTeX (with mhchem, `trust: false`, the same options as the browser) and stores the HTML in `Lesson.explanationMath` as `[{ s: formula text, b: block?, h: html }]`. The lesson screen (`/lessons/:id/hub`, and the admin preview) returns it as `explanationMath`. A phone that gets it does not download or run the KaTeX script. The browser never sends this HTML: it is made only from the admin's text. Entries are matched by formula text, so a stale entry is never used, and a lesson or formula with no entry is drawn by the browser as before. A formula KaTeX cannot draw is stored with `h: null`, so the browser shows its plain text without downloading KaTeX to fail again.

- Lessons saved before this feature have no entry. Run `npm run render:math` once per database to fill them (`-- --all` redoes every lesson, for example after a KaTeX upgrade). Use the same KaTeX version as the frontend (`package.json` in both).
- Only the lesson explanation is pre-rendered. Questions, explanations of answers and flashcards are still drawn by the browser.
- The stored HTML adds bytes to the lesson response (about 1 to 2 KB per distinct formula before compression) in exchange for about 80 KB of script not being downloaded.

### Unit summary PDFs

`utils/summaryPdf.js` builds an A4 PDF with `pdf-lib` and its built-in fonts (no font files): a title block, then each published lesson of the unit in order, with a page footer. It is text only. Formulas are written as plain text (`H2O`, `x^2`, `(a)/(b)`, `->`), Greek letters as their names, and any other character the font lacks becomes `?`. Pictures and videos are not included. The PDF must start with `%PDF-` and be 10 MB or less, is uploaded to Cloudinary like any PDF material (`catalyst/materials`, raw), and becomes an unpublished `Material` on the chosen lesson. Making another one makes another material; the old Cloudinary file stays until orphaned files are cleaned up.

### Admin tools

**Preview as student** reads the same data as the student screens but ignores the published flags, and it never writes. The preview answer route grades with the same code as the student route and skips the mistakes queue, mastery and statistics. The preview test is never timed and never submitted.

**Question analytics.** `QuestionStat` is updated by `POST /questions/:id/answer` (every practice and test answer) and when a mock exam is marked. Preview answers are not counted. Only multiple choice and true/false record which wrong choice was picked; other types still count attempts and right answers. Counting began with this feature, so earlier answers are not in it. Deleting a question drops it from the table.

**Reports.** A student can have one open report per question or lesson. Resolving a report creates a `report` notification (key `report:<id>`) for the student, linking to the lesson or test. Reports are deleted with the account and included in "download my data".

**CSV import.** Every row becomes the same body the question form sends. It then goes through the question form's Joi rules and the model's own validation, so imported questions follow the same rules as typed ones. Pictures cannot be imported. `correct` is 1-based (or a letter) for multiple choice; list answers are separated by `|`; matching uses `left=right`; balancing uses `2 H2 + O2 -> 2 H2O`. Row numbers in errors count records in the file, with the header as row 1.

**Lesson history.** `LessonVersion` keeps the text a save replaced. Changing only order, unit or published state does not make a version. Restoring saves the current text first, so a restore can be undone. The newest 50 versions per lesson are kept.

### Account changes

`User.passwordChangedAt` is set by a password reset and by change password. `authenticate` rejects any login cookie issued before it, so those actions end sessions on other devices. **Delete account is permanent.** The user row is kept but renamed to "Deleted user", given the email `deleted-<id>@deleted.invalid` and a random unusable password, set inactive, and stamped with `deletedAt`. Notes, bookmarks, positions, study time, exam attempts and auth tokens are deleted. Progress, test results, mistakes, mastery and flashcard progress stay under the anonymous row so counts that read them keep working. The old email can register again. Admin user lists still show the row as "Deleted user". **Changing email** takes two steps: the signed-in student gives the new address and the current password, and the account email changes only when the link sent to the new address is opened (single use, 1 hour). The old address gets a warning message. The address is checked again at confirm time, so a race ends in 409 instead of a duplicate.
