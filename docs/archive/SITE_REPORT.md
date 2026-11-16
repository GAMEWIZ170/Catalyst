# Catalyst site report (for an outside reviewer)

Date: 2026-11-13. Branch `feature/ui-overhaul` at `5d4464f`. No code was changed. This file is not committed.

## 0. How this was measured

- Backend: `node src/server.js` on port 3000, real MongoDB Atlas (remote, so every query pays network time). Database is the default one that `npm run dev` uses (it holds `DEMO113` and the demo users). `catalyst_test` has no demo course, so I did not use it.
- Frontend: production build (`npm run build`) served by `vite preview` on port 4173, proxying `/api`.
- Accounts: demo student and demo admin. **Demo login does not work through the login form** (see 4.1). I signed a session cookie in a scratch script using `JWT_SECRET` at runtime (never printed) so the pages could be driven as those users.
- Browser: Playwright driving installed Chrome. Fresh context per viewport. `innerWidth` printed: 390 and 1280. Theme light, palette lagoon.
- Read-only: I did not submit tests, rate flashcards or press Mark as done, so the demo student's data was not changed.
- Screenshots: `design/screens/report/` (390 and 1280, light). The admin users screenshot was deleted because it showed real email addresses.
- Local-machine caveat: page load times below (3 to 6 s) include a remote database and an unthrottled laptop browser. Lighthouse numbers are simulated Slow 4G.

## 1. Features

### 1.1 Student screens

| Route | What it does | Missing or half-done |
|---|---|---|
| `/login`, `/register` | Email and password. Cookie session (httpOnly). Redirect to `/courses` when logged in. | No password reset, no email verification, no "show password". Register submit with empty fields shows no inline errors (only the hint text). |
| `/courses` (home) | "Hello, name" with streak badge, dismissible "How Catalyst works" panel, "Continue where you left off" card with Resume button and progress, list of course cards with progress bar. | No enrolment (every published course shows to every student). Progress bars need one extra API call per course (see 3.4). |
| `/courses/:id` (outline) | Course title, lessons-complete bar, Resume button, collapsible unit cards, numbered lessons with status icon (done, next, not started), meta line (tests, cards, materials, video), best score, unit tests, course tests. | No search. No "locked" or ordering enforcement. Unit 2 is collapsed on phones, expanded on desktop. |
| `/lessons/:id` | Explanation (rich text, KaTeX and mhchem formulas, optional image), click-to-play YouTube video, Practice (lesson test, best score, Retake), Flashcards (counts by confidence, Study all, Review unsure), Materials (links and PDFs), Completed badge, Mark as done (only when there is no test or deck). | No previous or next lesson. No table of contents. Video host is YouTube only in the demo (the editor has a host field). No notes, bookmarks or comments. |
| `/tests/:id` | Intro (question count, pass mark), then one question at a time, thin progress bar, large answer rows, keyboard keys 1 to 4, Check button, feedback with explanation, result summary. Server-side grading. Works for lesson, unit and course tests. | Feedback panel and result screen: **NOT RUN** (needs a submit that changes demo data). No timer, no question review list, no retake history. |
| `/lessons/:id/flashcards` | Study deck: tap or Space to reveal, rate Don't know, Unsure or Confident (keys 1, 2, 3), "unsure" cards form a review deck, end summary. | Rating and end summary: **NOT RUN**. No spaced repetition (confidence only). |
| `/progress` | Streak, lessons completed, average score, per-course per-unit progress bars, test score list. | Average score came from one test only in the demo. No charts, no history by day. Unit bars show counts only. |
| `/settings` | Colour palette (5), profile picture (12 avatars or initials). Light/dark is in the top bar. | Theme and palette are saved in the browser only, not on the account. No change of name, email or password. No delete account. |
| Top bar | Logo, notifications icon, theme toggle, streak chip, profile menu (Settings, My progress, Log out). | Notifications opens a "No notifications yet" panel. Nothing creates notifications. It is a placeholder. |
| Unknown URL | Redirects to `/courses` (or `/login`). | No real 404 page. |

### 1.2 Admin screens (admin role only; students see "You do not have access")

| Route | What it does | Missing or half-done |
|---|---|---|
| `/admin` | Course list with status, counts, create course. A stats call exists (`/admin/stats`). | Stats call is the slowest request measured (3.3). |
| `/admin/courses/:id` | Edit code, title, description, publish toggle. Units and lessons list with reorder arrows, publish toggles, rename, add lesson, add unit, add unit test, course tests, "..." menu (delete). | Reordering is arrow buttons only, no drag. No duplicate lesson. No bulk publish. |
| `/admin/lessons/:id` | Tabs: Details (title, explanation with live formula preview and Formula help, image upload, video host and link), Tests, Flashcards, Materials (links and PDF upload). Publish toggle, Discard and Save, leave-without-saving prompt. | Explanation is a plain textarea with raw `$...$` and `\ce{}`; no toolbar. Image and PDF upload **NOT RUN** (they write to Cloudinary). |
| `/admin/tests/:id` | Edit test title, pass percent, questions (MCQ or true/false, correct answer, explanation, explanation image), reorder, publish. | Question import (CSV or paste) does not exist. Question bank or reuse: none. |
| `/admin/users` | Search, role and status filters, paginated list, "Add 1 month" subscription button, "..." menu (role, deactivate). Banner says subscriptions are not enforced yet. | Payments are manual only. No export. Subscription is not enforced until `REQUIRE_SUBSCRIPTION=true`. |
| `/admin/trash` | Lists soft-deleted courses, units, lessons, tests and more, with restore. | Restore flows beyond list view: **NOT RUN**. No permanent delete, no auto-purge. |

### 1.3 Backend routes (summary)

Public: courses list and detail (both need login in practice). Student: lesson, test, answer, submit, mark-done, flashcards, rate, materials, progress, streak. Admin: full CRUD plus reorder for units, lessons, tests, questions, flashcards, materials; uploads; users; stats; trash and restore. Limiters per README.

## 2. Design (student screens)

Shared look: warm off-white paper, teal (lagoon) accent, Atkinson Hyperlegible Next for UI, KaTeX serif for formulas, one thin border on rounded cards, 16 px side gutters on phones. Top bar is on every page except test-taking.

Weak points that repeat across screens:

1. **Desktop column alignment is inconsistent.** Top bar spans about 64 to 1214 px. Home, lesson and progress content sits left at about 115 px and ends near 820. Outline is centred (256 to 1024). Admin is centred at 160 to 1120. The eye jumps between pages. Roughly one third of the screen on the right is empty on home and lesson.
2. **Cards everywhere.** Welcome, resume, each course, each practice and materials row are all bordered boxes. Nothing has more weight than anything else.
3. **Filler footer** "Keep learning with momentum." on every page.
4. **Top bar has two bordered square icon buttons (notifications, theme) next to a pill and an avatar.** Four styles in a row. The notifications button leads to an empty panel.
5. **Phone layouts do not use the width well after the header** (large vertical gaps on test intro and flashcards).

Per screen:

- **Login / register** (`login-390-light.png`). Centred card, logo, tagline "Structured revision for UG students", labelled fields, one primary button. Clean. Weak: card is plain, no value line beyond the tagline, theme button floats alone at top right.
- **Home** (`courses-390/1280`). Greeting plus streak badge, then a long "How Catalyst works" card (about 280 px tall on a phone) before the Resume card and the courses. Weak: on a first screen the student must scroll past instructions to reach their course. Course cards show code in small grey above the title, a two-line description and a bare progress bar with no number. Resume card repeats the same bar.
- **Outline** (`outline-390/1280`). Best screen. Course title, count, bar, Resume, unit cards with numbered rows, quiet status icons, single meta line, score on the right, current lesson tinted. Weak: "Unit tests" and "Course tests" are small subheads with a lone row, so they look unfinished. "Not taken yet" under tests is low value. Header block spends 330 px before the first lesson on desktop.
- **Lesson** (`lesson-390/1280`). One long column: title, Completed badge, text, video poster, Practice, Flashcards, Materials, separated by hairlines. Video is click to play (no iframe load). Weak: no sticky next action; the student must scroll to find the quiz. No previous or next lesson link. Text line spacing is loose (about 2) so a short explanation takes a full phone screen. Formulas are in a serif face next to a sans body. Flashcard card shows three zero counts ("Confident 0, Unsure 0, Don't know 0") before any study. Practice and Flashcards use different button styles (outlined small vs full-width outlined). On desktop the Retake button sits beside the text instead of right-aligned.
- **Test intro** (`test-intro-390`). A card with title, count, pass rule and Start. The rest of the screen is empty. No top bar (focus mode), only a Back link.
- **Test question** (`test-question-390`). Close X, thin bar, "1 / 4", large question, four answer rows with number keys, sticky disabled Check button. Strong. Weak: the helper "Choose an answer. Keys 1 to 4." is shown on phones where there is no keyboard. Progress bar is very thin.
- **Flashcards** (`flashcards-390`, `flashcards-revealed-390`). Back link, thin bar, "1 / 6", a white card with "Question" label and the front text, hint "Tap the card or press Space to reveal". After reveal: answer plus three rating buttons. Weak: card is small and sits high; half the phone screen is empty; the page title says "Flashcard 1 of 6" and the bar also says 1 / 6 (duplicate). Top bar returns here (unlike tests), so focus mode is inconsistent.
- **Progress** (`progress-390`). Three stat cards stacked (streak, lessons, average) taking about 400 px on a phone, then per-course unit bars, then test scores. Weak: stat cards could sit in a row; no sense of change over time; test scores list is a bare table.
- **Settings** (`settings-390`). Palette radio cards and a 12-avatar grid. Weak: the avatar grid is long (about 800 px). It says "use the sun and moon button" for dark mode instead of offering it here. Only two settings exist.
- **Error states** (`error-api-down-390`, `error-lesson-404-390`). Amber box, "We couldn't load this.", raw message, Retry. Functional but the raw message is shown (see 4.3).

## 3. Speed

### 3.1 Production build (`npm run build`, Vite 6.4.5, 2156 modules, 44.55 s)

| Chunk | Size | Gzip |
|---|---|---|
| `index-*.js` (whole app, student and admin) | 341.87 kB | 103.97 kB |
| `katex-*.js` (lazy) | 262.11 kB | 77.96 kB |
| `mhchem-*.js` (lazy) | 33.28 kB | 8.24 kB |
| `index-*.css` | 58.93 kB | 10.70 kB |
| `katex-*.css` | 27.68 kB | 7.64 kB |
| `atkinson-hyperlegible-next-latin-wght-normal-*.woff2` | 34.00 kB | n/a |
| 18 KaTeX font files (woff2) | 4.9 to 28.1 kB each, about 270 kB in total | n/a |
| `index.html` | 1.34 kB | 0.59 kB |

Notes: there is **no route splitting**. Every page, including all six admin pages and the editors, is in the one 342 kB chunk that every student downloads. Only KaTeX and mhchem are lazy. The dev-only gallery is correctly excluded.

### 3.2 Lighthouse (mobile, simulated Slow 4G, 4x CPU, 390 px, logged-in student, 3 runs each, performance only)

| Page | Score (3 runs) | LCP ms | FCP ms | TBT ms | CLS | Transfer |
|---|---|---|---|---|---|---|
| Course list `/courses` | 83, 100, 100 | 1601, 1376, 1294 | same as LCP | 624, 34, 28 | 0.002 | 156 kB |
| Outline `/courses/:id` | 99, 97, 98 | 2111, 2126, 2123 | about 780 | 69, 152, 116 | 0.023 | 152 kB |
| Lesson `/lessons/:id` | 82, 85, 81 | 2160, 2182, 2126 | about 775 | 432, 347, 472 | **0.151** | 289 kB |
| Test intro `/tests/:id` | 100, 100, 96 | 776, 778, 788 | same as LCP | 58, 90, 233 | 0.003 | 152 kB |

Reading: the lesson page is the weakest. Its 0.151 CLS is over the 0.1 "good" limit, and TBT is about 400 ms (formula rendering plus KaTeX download, 289 kB vs 152 kB elsewhere). The first course-list run scored 83 with TBT 624, so cold-start variance is large. Outline LCP (about 2.1 s) is bound by its API call (see 3.3), not by assets. What causes the lesson layout shift: **NOT RUN** (not isolated). LCP element name: not captured (blank in the audit output).

Lighthouse here is simulated on top of real local requests; it was **not** run against a deployed host, with real gzip or a CDN. Slow 4G with a remote database in another region: **NOT RUN**.

### 3.3 Slowest API calls (Playwright, unthrottled, remote Atlas, response end time from request start)

Baseline: trivial calls (`/auth/me`, `/progress`, `/progress/streak`) take 280 to 800 ms, which is mostly the round trip to Atlas.

| Call | Page | ms |
|---|---|---|
| `GET /admin/stats` | admin courses | 3265 (also 1286 on users page) |
| `GET /lessons/:id` | lesson (plain, 1280) | 2401 |
| `GET /courses/:id` | outline 390 | 2282 |
| `GET /lessons/:id/flashcards` | flashcards 1280 | 2245 |
| `GET /courses/:id` x2 | progress 1280 | 2100, 1957 |
| `GET /courses/:id` | outline 1280 | 2075 |
| `GET /admin/courses/:id` | admin course editor | 1947 |
| `GET /lessons/:id` | lesson 390 | 1936 |
| `GET /courses/:id` x2 | home 1280 | 1440, 1468 |
| `GET /lessons/:id/materials` | lesson | 1042 to 1405 |
| `GET /tests/:id` | test intro | 952 to 1053 |

Every page load makes `/auth/me` and `/progress/streak` first. Roughly 300 to 800 ms each. Whole-page "network idle" time was 2.0 to 6.0 s in this setup (lesson pages 5.0 to 6.0 s, tests 3.0 to 3.4 s, settings 2.9 s).

### 3.4 Repeated or duplicate requests per page

| Page | What repeats |
|---|---|
| Home `/courses` | `GET /progress/streak` **twice** (top bar and the page both fetch it). `GET /courses/:id` once **per course** (2 here) just to compute progress and the Resume card. |
| Progress | Same: streak twice, `GET /courses/:id` once per course. |
| Admin users | `GET /admin/users?limit=20&page=1` **twice** on one load (production build, so not a dev StrictMode effect). |
| Every logged-in page | `/auth/me` then `/progress/streak` in sequence, plus one DB read of the user inside `authenticate` on every API call. |

With 2 courses that is 6 calls on home. With 20 courses it would be 24+ (one per course), each costing 1.4 to 2.3 s here. A student list endpoint that returns progress per course would remove this.

### 3.5 Backend queries that look like N+1 (read from controllers; no query profiler was run, so counts are from reading code)

- **No classic loop of queries per row was found.** Counts use `$in` plus `aggregate`, which is good.
- **Serial, not parallel.** `getCourseByID` (`course.controller.js` lines 50 to 135) awaits about 9 queries one after another: course, units, lessons, tests, question counts, flashcard counts, material counts, test results, progress. The last five are independent and could use `Promise.all` (the admin tree version at line 334 already does this for three). Each is one Atlas round trip, which matches the 1.4 to 2.3 s measured.
- `getLessonByID`: `findVisibleLesson` (lesson with unit and course populated, 3 reads), then tests with question counts, results, flashcards plus flashcard progress, material count. About 8 serial reads. Measured 1.6 to 2.4 s.
- `authenticate` runs `User.findById` on every request (one extra read per call).
- Client-side N+1: one `/courses/:id` per course on home and progress (3.4).
- **Missing indexes** (from `models/`): none on `Unit.course`, `Lesson.unit`, `Question.test` has one but `Lesson`/`Unit` queries filter on `unit`/`course` plus `deletedAt`, `isPublished`. Fine at demo size; will scan as content grows.
- `/admin/stats` runs 10 `countDocuments` in parallel on collections without supporting indexes (`createdAt`, `subscriptionEndsAt`, `updatedAt`). Slowest call measured (3.3).

## 4. Rough edges

### 4.1 Bugs

1. **Demo accounts cannot log in through the app.** `seed-demo.js` creates users with a `.test` email domain. `POST /auth/login` validates with Joi `.email()`, which rejects `.test` (`400 "email" must be a valid email`). Registration uses the same rule, so the demo users could only have been made by the seed script. Anyone following the seed instructions will be locked out of the demo.
2. **Keyboard focus lands inside formulas.** On the lesson page the Tab order is: top bar, Back to course, then about 6 stops inside the KaTeX output (`12 C X 12 ...`) before reaching Play video. Rendered math should not be focusable. This breaks the "every interactive control works by keyboard" rule and slows keyboard users.
3. **Not-found shows a Retry button.** For a missing lesson, test or course the error box says "This lesson is not available" plus Retry. Retrying a 404 can never work.
4. **Raw server and browser text in errors.** Course 404 shows `Course with ID 000000000000000000000000 not found`. Network failure shows `Failed to fetch`. A bad lesson id shows `Invalid lesson ID`. A forced 500 showed the server message `boom`.
5. **Unknown URLs silently redirect to `/courses`.** `/nothing-here` gives no 404 page.
6. **Lesson CLS 0.151** (3.2).
7. **Admin users page loads its list twice** (3.4).
8. Console: `/auth/me` returns 401 on `/login` and `/register` when logged out, which shows as a red console error on every visit to those pages (expected, but noisy).

### 4.2 Confusing steps

- A new student sees "How Catalyst works" first, and "Got it" dismisses it, but the screen has no hint that dismissal is remembered (**remembering: NOT RUN**).
- The notifications button opens an empty panel. It looks like a feature, but nothing sends notifications.
- Settings says "use the sun and moon button in the top bar" instead of putting the control on the page. The choice is stored only in this browser, so a student who logs in on another phone gets the default again.
- "Mark as done" does not appear on a lesson with a test or deck (by design). Nothing on the page explains why, so a student looking for it will not find it. (The button's presence and text: **NOT RUN**, since the demo lessons all have tests.)
- A lesson with a 60% pass mark says "You need at least 60% to complete the lesson" on the intro. A unit or course test intro: the text was not compared in detail.
- Test taking hides the top bar. Flashcards keep it. The two study flows feel different.
- Admin course page: lesson rows show "Published" twice (badge plus toggle label).

### 4.3 Missing feedback

- Saving in the editors shows a toast (existing); success and failure wording: **NOT RUN** (no save done).
- Course cards show a progress bar without a number or "not started" label, so an empty bar and an unknown bar look the same.
- The streak chip shows a number only. There is no explanation of what counts as a study day (UTC days) anywhere in the UI.
- Login failure shows only "Invalid credentials" (good for security). There is no lock-out message after 20 failed attempts (limiter wording: **NOT RUN**).
- Loading: skeleton loaders exist (Phase 5). Pages took 3 to 6 s to settle here, so skeletons are visible for a long time. Slow-network skeleton screenshots: **NOT RUN**.

### 4.4 Error states seen

| Case | Result |
|---|---|
| Logged out opening `/courses` | Redirect to `/login` (correct). |
| Wrong password | Inline "Invalid credentials". |
| Student opening `/admin` | "You do not have access to this page" with Back to courses (correct, `student-on-admin-1280`). |
| Missing lesson, course, test | Error box with raw message and Retry (4.1). |
| API down on home | "We couldn't load this. Failed to fetch. Retry" below the "How Catalyst works" panel; the rest of the page stays (`error-api-down-390`). |
| Lesson API 500 | Same box with server message. |

### 4.5 Not measured (NOT RUN)

- Test answer feedback, result screen, pass and fail paths, and Mark as done (all write demo data).
- Flashcard rating and the end summary.
- Image and PDF upload (Cloudinary).
- Dark mode and the other four palettes (the report is light, lagoon only). Widths 320, 360, 768. No horizontal overflow at 390 or 1280 (`scrollWidth` equals `innerWidth` on every page checked).
- Lighthouse accessibility, SEO and best-practice scores. Lighthouse on a deployed host.
- Query timings from the database profiler. Memory and CPU on the server.
- Behaviour with many courses or many lessons (the demo has 6 lessons).
- Concurrent users and rate limiter behaviour.

## 5. Short list for the reviewer

Highest value first:

1. Return per-course progress from `GET /courses` (or one batched endpoint) so home and progress do not call `/courses/:id` per course. Fetch streak once.
2. Run the independent queries in `getCourseByID` and `getLessonByID` in parallel.
3. Split admin pages out of the main bundle with route-level lazy loading.
4. Fix demo login (accept the demo domain or use a valid one in the seed).
5. Make formulas non-focusable, show a proper not-found page, and stop showing raw errors and Retry on 404.
6. Align desktop columns and give the lesson page a next action and previous and next links.
