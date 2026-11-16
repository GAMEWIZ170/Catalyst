# Catalyst roadmap: functionality and quality of life

This is the plan for the next stage of Catalyst. The focus is making the app faster, more useful for revision, and nicer to use. Everything runs locally with free tools.

Claude Code: read this file, CLAUDE.md, PRODUCT.md and DESIGN.md at the start of every session. Do **one step per session**. Stop at every **OWNER DECIDES** and wait for the owner's answer. If `design/SITE_REPORT.md` exists, read it before Phase 1.

## Not now (do not build, plan or propose)

Hosting and deployment, payments and passes, real email sending, SMS, and legal registration. These come later, when the owner says so. If a step seems to need one of them, stop and say so.

## Rules for every step

- Follow CLAUDE.md: check the branch first, add files by name, never commit `.env`, screenshots, scripts, Impeccable files or `settings.local.json`, and never push or merge to `main` unless asked.
- Each phase gets its own branch from `main`: `feature/speed`, `feature/quality-of-life`, `feature/learning`, `feature/accounts`, `feature/admin-tools`, `feature/extras`. **OWNER DECIDES** before each phase whether the previous branch is merged first.
- **Free tools only. New dependencies need the owner's approval first.** Name the package, its size, and why. Expected: `rollup-plugin-visualizer` (dev only), `compression`, `ts-fsrs`, and later `vite-plugin-pwa`. TanStack Query is optional; ask first.
- Plain CSS and tokens, no Tailwind, no UI library, WCAG 2.1 AA, and the Study Desk design: calm, with no coins, hearts, flames, confetti or streak-guilt messages. XP, levels and achievements are allowed in the quiet form decided in `EXPANSION.md` (a thin bar, one small panel, a toast), and leaderboards only on community study sets. Colour follows `DESIGN.md`: palettes change only the accent.
- **Grading stays on the server.** Students never receive answers, tolerances, accepted answers or worked solutions before they answer. Every new question type is graded on the server.
- Schema changes are allowed, but old data must keep working (new fields optional, with defaults). Add indexes where you filter or sort, and update the backend README in the same step.
- For UI, use the frontend-design skill to build, Impeccable `critique` before and `polish` after, and Playwright screenshots at 390 and 1280 px in light and dark.
- Use the demo accounts and DEMO113 for checks. Extend `npm run seed:demo` when a feature needs sample data.

## Session recipe

1. The owner runs `/clear` and pastes "Do ROADMAP.md step X".
2. Check the branch.
3. Plan in five lines or fewer, then build that step only.
4. Run `npm run build` and the relevant checks. Use real numbers or `NOT RUN`.
5. Make one commit, with the files added by name.
6. Reply in caveman mode: commits, CHECK lines, NOT RUN, OWNER DECIDES. Then stop.

---

## Phase 1: speed (local)

Measure on a **production build** (`vite build` then `vite preview`), not the dev server.

**Targets:**
- Student entry JavaScript under about 170 KB gzipped.
- LCP of 2.5 s or less on the lesson page and 2 s or less on the course home, using Lighthouse Mobile (Slow 4G, 4x CPU).
- No more than 2 API calls before the main content shows.
- Lesson page under 500 KB before the video is played.
- No COLLSCAN on the main queries.

**1.1 Baseline (no code changes).**
- Lighthouse on the course list, outline, lesson, test and flashcards pages.
- The bundle visualiser's five biggest chunks.
- A `Server-Timing` header showing database time against total time, and the 5 slowest endpoints.
- `.explain("executionStats")` on the main queries.
- API calls per page, with waterfalls and duplicates flagged.
- The current Atlas region, reported only.
- Write it all to `docs/archive/PERF_BASELINE.md` (not committed).

**1.2 Route code splitting.** Lazy-load every route. Admin code, KaTeX and editor code never load for students.

**1.3 Stop waterfalls.** Route loaders with `Promise.all`, plus one combined endpoint per heavy screen, for example `GET /api/v1/lessons/:id/hub` returning the lesson, progress, and test and flashcard summaries, with no answers.

**1.4 Media.**
- YouTube facade: a thumbnail plus a play button, with the player loading only on tap.
- Cloudinary `f_auto/q_auto` plus a width and a `srcset` (400, 800, 1200) on every image, and `width` and `height` on every image.
- KaTeX CSS only on pages with formulas.

**1.5 Backend.**
- Indexes for every field you filter or sort by.
- `.lean()` and `.select()` on read-only queries.
- `$in` or an aggregation instead of per-item queries.
- One reused Mongoose connection.
- `compression`, after approval.

**1.6 Caching and prefetch.** Hashed assets served as immutable and `index.html` as `no-cache` in the preview and production config. A small client cache for repeat visits to courses and outlines (**OWNER DECIDES** whether to use TanStack Query instead). Prefetch the next lesson and the "Continue" target on hover or touch.

*Done when* the targets are met and `PERF_BASELINE.md` shows before and after numbers.

---

## Phase 2: quality of life (quick wins students feel)

**2.1 Continue card.** Save the last lesson and position per course. Home shows one card at the top, for example "Continue: 2.3 Molar mass, flashcards 12/30". Nothing else competes with it above the fold on a phone.

**2.2 Mobile navigation.** On phones, a bottom tab bar (Home, Courses, Review, Progress, Profile). On laptops, keep the top bar or a sidebar. Tap targets at least 44 px.

**2.3 Keyboard shortcuts.** 1 to 4 choose an answer, Enter checks or continues, Space flips a card, 1 to 3 rate a card, and `?` shows the list. Shortcuts never fire while typing in an input.

**2.4 Text size and motion.** A text-size setting with three steps, changing the root font size. Reduced motion respected everywhere.

**2.5 Onboarding.** Three short screens for new students: choose a course, an optional exam date, an optional daily goal. Then straight to the first lesson.

**2.6 Daily goal.** Opt-in, either minutes or "1 lesson plus due cards", shown as a thin bar. A streak day counts when the goal is met. **OWNER DECIDES** whether the streak should require the goal or any activity.

**2.7 Empty and error states.** Every list and page has an empty state with one sentence and one next action, and an error state with retry. No blank pages.

**2.8 Search, bookmarks and notes.** A search across lesson titles and text (a MongoDB text index). A "Save" bookmark on lessons and questions, with a Saved list. A short private note per lesson.

*Done when* a returning student lands on Home and reaches their next task in one tap, and every new flow works by keyboard.

---

## Phase 3: learning features (the core of the product)

**3.1 Mistakes queue.**
- Save each wrong answer: user, question, wrong count, last wrong date and correct streak.
- A question leaves the queue after two correct answers on different days.
- Home and course pages get a "Mistakes" panel by unit and a "Practise my mistakes" button that reuses the test player.
- The results screen gets "Practise the ones I missed".

**3.2 Spaced repetition (FSRS).**
- `ts-fsrs` on the server, after approval.
- Don't know maps to Again, Unsure to Hard, and Confident to Good.
- Store card state and due date per user and card, with request_retention 0.9. The same scheduler spaces out mistakes.
- Home gets a quiet "Due today: N cards, M mistakes" chip and a Review session (the Review tab from 2.2).
- Old confidence data keeps working.

**3.3 Hints and worked solutions.**
- Optional `hint` on questions, shown on request before answering.
- Optional `workedSolution`, as numbered steps with KaTeX, shown after answering as numbered Lab Notebook panels.
- The admin editor gets both fields with a preview.

**3.4 New question types**, in this order. Each is graded on the server and has admin editor support.
- **Numeric with units:** a value, a tolerance (absolute or percent) and a unit. Separate feedback for "right number, wrong unit".
- **Multi-select:** fully right or fully wrong.
- **Fill in the blank:** a list of accepted answers, ignoring case and extra spaces.
- **Matching** and **ordering:** tap to select, no drag.
- **Equation balancing:** a number box before each species, checked against the lowest whole-number coefficients.

**3.5 Mastery per lesson.**
- Levels: Not started, Attempted, Familiar (70% or more on the lesson test), Proficient (100%, or correct on that lesson's questions in a unit test), Mastered (correct again later in a unit or course test or a review).
- A later wrong answer drops one level. Unit and course tests still never *complete* a lesson, but they move mastery.
- Show it as a small text label or a thin four-segment bar, never badges.
- **OWNER DECIDES:** confirm these rules before building.

**3.6 Question tags and topic practice.** Optional `topic`, `source` and `year` tags on questions. A "Practise by topic" screen that pulls questions across lessons.

**3.7 Mock exams.**
- A timed test mode: the end time is set on the server, no feedback until the end, flag for review, a question-number grid, and auto-submit when time runs out.
- The results screen shows a review of every question with its worked solution.

**3.8 Revision plan.** The student enters an exam date. Catalyst spreads the remaining lessons and due reviews across the days left, and shows "Today's plan" on Home. It is a simple list, not AI.

*Done when* a student can revise for a test using only Home ("Continue", "Due today", mistakes, today's plan) and a mock exam, without hunting through menus.

---

## Phase 4: accounts (local, no real email)

**4.1 Password reset and email verification.**
- Single-use tokens, stored hashed, that expire after 30 to 60 minutes. Endpoints rate-limited.
- A `sendEmail()` function that, in development, prints the link to the server console. Real sending comes later.
- Pages: forgot password, reset password, verify email, resend.
- **OWNER DECIDES** whether unverified users are blocked or only warned.

**4.2 Account settings.** Change password, change email (re-verify), download my data (JSON), and delete account (with confirmation; soft-delete and remove personal data).

**4.3 Notification bell.** In-app notifications only, for things like a new lesson published, a report answered, or review cards due. Unread count and mark-all-read.

**4.4 Privacy and terms pages.** Plain English: what is collected, why, how long it is kept, how to delete it. Linked in the footer and on register.

*Done when* a student can recover a forgotten password and manage their account without contacting the owner.

---

## Phase 5: admin tools

**5.1 Preview as student.** Show any lesson or test exactly as a student sees it, including drafts, without recording progress.

**5.2 Report a problem.** A button on every question and lesson (wrong answer, typo, unclear, other, plus a note). An admin inbox with open and resolved status, and a reply that reaches the student as a notification.

**5.3 Question analytics.** Per question: attempts, % correct and the most common wrong option. A table sorted by lowest % correct first, linking to the editor.

**5.4 CSV question import.** A downloadable template covering all question types and tags, a dry-run screen with the errors per row, then import.

**5.5 Lesson history.** On each save, keep the previous version. A history list with Restore.

*Done when* the owner can find the 10 most-failed questions, fix them, and bulk-load a set of past-style questions from a CSV.

---

## Phase 6: extras (free, when wanted)

- A PWA: install to home screen, and offline caching of the app shell and opened lessons (never cache answers).
- KaTeX pre-rendered on save, so phones do less work.
- A low-data mode setting: no video thumbnails, smaller images.
- Unit summary PDFs as downloadable materials.

---

# Part 2: Catalyst expansion plan (was EXPANSION.md)

Start this only after Part 1 above is finished, unless the owner says otherwise. The rules, session recipe, branch habits and design rules in Part 1 and CLAUDE.md all apply here. Do **one step per session**, and stop at every **OWNER DECIDES**.

## Owner's decisions (follow these)

- **One free AI model with low limits, for now.** No paid AI key until the owner declares production. Keep the models in config as a **list**, never hard-coded, so a model picker and a paid AI subscription can be added later.
- **Built for any student, anywhere.** Catalyst should one day work for students anywhere. Nothing tied to one country or school is hard-coded in code or UI text, and there is **no institution or university field for now** (that comes later). Store each user's time zone (streaks and goals use the user's own day, not UTC), and keep UI text in one place so other languages can be added later.
- **No school-system features for now.** No class groups, and no official past-paper bank. Students can add past-style questions to their own study sets. Class groups wait for teacher accounts, later, and must not try to replace a university's learning system (for example Sakai) or WhatsApp groups.
- **Engaging XP, achievements and leaderboards, kept fair.** XP, levels and achievements make progress feel rewarding. Leaderboards live on **community study sets** (weekly and monthly per set) and on a "top sets and creators" board. There is no board ranking every student by total XP, unless the owner asks for it later.
- **Friend challenges are for fun**, in the style of Gizmo: casual, opt-in, between friends.
- **No money flows and no paperwork yet.** No payments, payouts, paid courses or paid services. Anything that would need business, tax or payment registration waits. Mark it "Later" and do not build it.
- **Students do not create courses.** Students create **study sets** in the Study Lab, which can be shared as community sets. Course creation by selected students comes later, through a **Catalyst Creators programme**, in production. The admin course builder stays for official courses.
- **Courses get categories and authors** now, to prepare for more subjects and for the creators programme.

## Feature groups

**Development (free, build now)**
- Study tools: Study Lab and study sets, AI generation on the free model, tutor hint mode, mistakes queue, spaced repetition, mock exams, exam countdown.
- Motivation: XP, levels, achievements, friend challenges, community sets and their leaderboards.
- Study Hall (X2.4), read-aloud (X1.5), AI answers that cite their source (X6.3).
- Basics: admin dashboard, low-data mode, accessibility, categories and authors.

**Production (needs payments, hosting, paid AI or paperwork). See "Later".**
- Catalyst Pass (prepaid monthly, semester and yearly passes), premium AI, Exam Prep Packs, certificates for general courses (never academic credit), Creators programme, live bootcamps, tutor marketplace, trust and legal steps, regional pricing.

## Layout decision (changes ROADMAP step 2.2)

- **Sidebar (laptop) and bottom bar (phone)** hold the *places*: Home, Courses, Review, Study Lab, Me. "Me" holds Progress, Achievements, Profile and account settings. If ROADMAP 2.2 already built a bottom bar with Progress and Profile, change it to these five.
- The sidebar collapses to icons, and the collapsed state is remembered. On phones it is never shown together with the bottom bar.
- **Top bar** holds the *tools*: search, the Pomodoro timer, the notification bell, a settings gear and the avatar menu.
- **Gear** opens a small quick-settings panel (theme, palette, text size, **low-data mode**, notification toggles) with a link to the full Settings page.
- **Low-data mode** is a one-tap switch. It turns on automatically when the browser's `Save-Data` setting is on, and it hides video thumbnails, loads smaller images and shows text first.
- **Settings page** has tabs: Account, Appearance, Notifications, Study. It is the one home for all settings.
- Accessibility: `<nav>` landmarks with labels, `aria-current="page"`, `aria-expanded` on the collapse button, and the bottom bar must never cover content.

---

## Phase X1: app shell, event log, categories, authors and time zones

**X1.1 Sidebar, bottom bar, top bar, gear panel and tabbed Settings**, as described above. Use the frontend-design skill, with Impeccable `critique` first and `polish` last.

**X1.2 Event log.**
- An `events` collection with `{ user, type, ts, props }`, indexed on `ts` and `user`.
- Log the key actions: signup, login, lesson_opened, lesson_completed, question_answered (correct or not), test_submitted, review_done, flashcard_rated, focus_session_completed, video_started, set_created, set_studied, challenge_sent, challenge_played.
- Logging must never slow down or break a request.
- Store no personal data in `props`.
- XP, achievements, leaderboards and the admin dashboard are all built from these events.

**X1.3 Course categories and authors.**
- A `Category` model (name, slug, order) with admin management.
- Each course gets a `category` and an `authors` list. An author has a display name, an optional short bio and an avatar, and can later be linked to a user for the Creators programme.
- Old courses keep working, with a default "General" category.
- Course list: filter by category, and author names on course cards and the course page.
- Admin builder: category and author fields.

**X1.4 Time zones.**
- Add a time zone to each user (detected from the browser, editable in Settings). Streaks and daily goals use the user's own day.
- Update PRODUCT.md's Users line to "university students" with no specific school named.

**X1.5 Read-aloud.** Lessons and notes can be read aloud using the browser's built-in, free speech voice. Play, pause and speed controls. No paid voices.

*Done when* navigation works by keyboard and screen reader, events appear for every key action using the demo accounts, DEMO113 shows a category and an author, and streaks follow the user's own time zone.

---

## Phase X2: focus tools

**X2.1 Pomodoro timer in the top bar.**
- Store `endsAt`, never a ticking counter, in a top-level context plus localStorage. Show `endsAt - now`.
- It survives page changes and reloads.
- Work and break lengths come from the Study settings tab.
- A short sound and a browser notification at the end. Ask for notification permission only when the student first starts a timer.
- Screen readers hear only "Focus session complete", not every second.
- Counted focus minutes need real activity in Catalyst and are capped per day (for example 90).

**X2.2 Timed quizzes.**
- Any test, and any study-set quiz, can be taken timed.
- The **server owns the clock**: it creates an attempt with `startedAt` and `deadline`, and checks every answer against server time, with a few seconds' grace.
- Late answers are rejected, and the attempt auto-submits.
- An "extra time" setting and an untimed practice mode.

**X2.3 Exam countdown.**
- A student adds an exam: course, date and time, and type (mid-semester, end of semester, quiz).
- Home shows a quiet countdown card, for example "CHEM113 exam in 18 days", linked to today's revision plan from the roadmap.
- Notifications in-app at 14, 7, 3 and 1 days before.
- Several exams are allowed; the nearest one shows first.
- After the date passes, the exam moves to "Past exams".

**X2.4 Study Hall.** A quiet "study together" room. Everyone sets a goal and runs the Pomodoro timer at the same time. No chat, no ranking, just a count of who is focusing now. Brings students back daily.

*Done when* the timer stays accurate after 10 minutes in a hidden tab, the server rejects an answer sent after the deadline, and a demo exam shows the right countdown and today's plan.

---

## Phase X3: admin dashboard

**X3.1 Nightly stats.** A `daily_stats` collection filled from `events` once a night, by a script you can also run by hand.

**X3.2 One admin screen** (admin only):
- DAU, WAU and MAU, with a 30-day trend.
- Stickiness (DAU Ã· MAU).
- New signups this week.
- Activation: the share of new users who complete one lesson and one test within 48 hours of signup.
- A D1, D7 and D30 retention table by signup week.
- Top lessons, and the lessons where students drop off.
- Study sets created and studied, challenges sent and played, and achievements earned.
- Open problem reports.
- Later: AI usage against quotas.

**OWNER DECIDES** whether to also add PostHog's free tier for funnels. If added, send no names or emails, and keep session recording off.

*Done when* the numbers for the demo accounts match a hand-checked sample.

---

## Phase X4: Study Lab and study sets

A **study set** is the student's own container. One set holds notes, flashcards and quizzes on one topic. The Study Lab is where students list, create and open their sets.

**X4.1 Study set model and Lab screen.**
- A set has a title, an optional course or topic link, a description, and visibility: **private** (the default), **link**, or **community**.
- The Lab screen lists "My sets" with search, and has a "New set" button.
- Inside a set there are three tabs: Notes, Flashcards and Quizzes.

**X4.2 Notes in a set.**
- Use the Tiptap editor, after approval, with its Mathematics extension (KaTeX, with mhchem enabled).
- Notes autosave.

**X4.3 Flashcards and quizzes in a set.**
- Reuse the existing flashcard and question components.
- A set's flashcards feed the normal FSRS Review queue.

**X4.4 Paste-and-split helper.** Pasted lines in the form "term â€“ definition" become cards. The student edits them before saving.

**X4.5 Private material upload.**
- PDFs or pasted text, attached to a set, as material for AI generation (X6).
- At most 10 MB per file, with a total cap per student.
- File type checked on the server, files stored in a private Cloudinary folder.
- Text extracted once and stored.
- Upload terms state that students must only upload material they have the right to use.

*Done when* a student creates a set, writes a note with a chemistry formula, turns pasted text into 20 cards, reviews them in Review, builds a short quiz, and nothing is visible to anyone else.

---

## Phase X5: XP, achievements and friends

**X5.1 XP and levels.**
- **XP comes from learning, not idle time.** Award it for:
  - correct answers, with a bonus for first-try answers;
  - reviews done when due;
  - lessons completed;
  - mastery level-ups;
  - daily and weekly goals met;
  - a one-time credit for finishing a video;
  - capped focus minutes;
  - study sets created and used by others;
  - challenges played.
- No XP for minutes watched or idle time.
- Daily caps on each source, so nothing can be farmed.
- Levels never go down. A level-up gets a short, tasteful moment (a small panel, no confetti storm). Show the level on Me and in the top bar avatar menu.
- **OWNER DECIDES:** confirm the XP table and the level curve before building.

**X5.2 Achievements.**
- A set of about 20 to 30 achievements based on learning milestones. Examples: "First lesson", "First unit mastered", "100 reviews", "7 study days in a month", "Perfect test", "First study set", "Your set was studied 50 times", "First challenge won".
- A few hidden "surprise" achievements.
- An Achievements tab on Me, and a small toast when one is earned.
- No achievement for losing streaks, and none that only reward grinding hours.
- **OWNER DECIDES:** the final list.

**X5.3 Daily and weekly goals with rest days.** One missed day never wipes progress. No guilt messages.

**X5.4 Friends.**
- Friend requests that both sides must accept.
- Display names and avatars only; no full names, and no scores shown to non-friends.
- Anyone can remove a friend or hide their activity.

**X5.5 Friend challenges (Gizmo-style fun).**
- Pick a deck, a quiz or 10 questions from a lesson or a set, and send a link (with a WhatsApp share button).
- The friend plays the same set within 48 hours, and both see a friendly comparison.
- Async only for now: no live rooms.

**X5.6 Study circles** (optional). Groups of 2 to 6 friends sharing a weekly goal. Co-operative, not ranked.

**X5.7 WhatsApp sharing with link previews.**
- Short share links for sets, challenges, lessons and invites, for example `/s/:id`.
- A share button that uses the phone's own share menu first (the Web Share API, which includes WhatsApp, Telegram and others), with a direct WhatsApp option and copy link as fallbacks.
- The app is a single-page app, so WhatsApp can't see page titles by itself. Add a small Express route for share links that returns the right preview tags (title, description, image) and then sends the person into the app.
- Previews never reveal answers or private content. A private set's link shows "Sign in to view".

*Done when* XP cannot be earned by idling, achievements unlock correctly on the demo accounts, and a challenge link works end to end on a phone.

---

## Phase X6: AI in the Study Lab (free model)

**X6.1 Provider layer.**
- One `ai` service with the provider, model and limits in config.
- Use **one free model with low limits** for now, by default Cloudflare Workers AI's free daily allowance. **OWNER DECIDES** if another free provider is preferred.
- Store models as a list in config (name, provider, limits), with one marked as the default, so a **model picker** can be added later without rewriting the service.
- Note in the report which free tiers may use prompts for training.
- Keys live in `.env` only.
- Send no names or emails to the provider.

**X6.2 Generate inside a set.**
- From the set's uploaded material, notes or pasted text, generate **draft notes, flashcards and quiz questions**.
- Drafts appear for the student to edit or delete before saving.
- Cache results per document.

**X6.3 Study companion.**
- Available inside a lesson or a set, using that lesson's or set's text as context. No vector database yet.
- Tutor style: ask what the student tried, then give one hint at a time.
- Answers cite their source: the lesson, section or set they came from, so the student can check them.
- Never give final answers to graded tests or timed quizzes, and it is **off during timed quizzes and mock exams**.
- Every answer carries the note "AI can make mistakes. Check with your lesson." and a "Flag this answer" button that feeds the report inbox.

**X6.4 Limits.**
- Per-student daily quotas (for example 20 messages and 3 generations), capped output length.
- A global daily cap that shows "AI is resting until tomorrow" when free capacity runs out.
- Usage is shown on the admin dashboard.
- The label "Free beta, fair-use limits apply."

*Done when*, on 30 CHEM113 test questions, the companion gives correct hints without handing over final answers, generation produces editable drafts, and the quotas and the global cap trigger correctly.

---

## Phase X7: community sets and leaderboards

**X7.1 Publishing.**
- A set's owner can change its visibility from private to link, or submit it to community.
- Community sets need a quick admin approval at first, plus an originality declaration when publishing.

**X7.2 Community shelf.**
- Browse and search community sets by course, category and topic, separate from official courses.
- Each set shows its author's display name, times studied and saves.
- Students can save a set, or copy it into their own Lab.

**X7.3 Per-set leaderboards.**
- Each community set's quiz has **weekly and monthly** leaderboards of the best scores.
- Opt-in when playing, using display names only.
- It resets on schedule, and shows your position plus the people near you.
- Only first attempts in the period count, and a timed mode is used, so scores are comparable.

**X7.4 Top sets and creators.** A weekly and monthly "most studied sets" board and a "top creators" board, ranked by how much others use their sets.

**X7.5 Safety.** A report button on every set, an admin takedown queue (aim for action within 48 hours), and the author can delete their set at any time.

*Done when* a set can go from private to community after approval, its weekly and monthly boards reset correctly, a reported set can be taken down, and community content never appears inside official courses.

---

## Later (do not build until the owner says so)

- **"Learn How to Learn" course (was X8.1):** a free, official course of short lessons on revision technique, exam skills and planning. Built with the normal course tools and published as a free course. No payment, no certificate. The `isFree` course flag and the access bypass are already built (commit `e2ff805`), so only the lessons are missing.
- **Catalyst Pass:** prepaid monthly, semester and yearly passes (a test of GHS 25 to 30 a month first). Needs payments.
- **Premium AI:** higher limits, "photo of my problem" (finds the first wrong step), audio recaps and mind maps, and AI writing feedback (feedback only, never writes the work).
- **Exam Prep Packs:** original mock exams per course, included in the Pass or sold one at a time in exam season.
- **Certificates** for general courses (for example coding), with a verification link and a LinkedIn share button. Never academic credit.
- **Live exam bootcamps:** a creator runs a course on fixed dates for a group, with live sessions and daily practice, then it ends. Builds on the Creators programme.
- **Tutor marketplace:** students book one-to-one paid lessons with tutors, and Catalyst takes a commission. Hardest to run, so it comes last.
- **Trust and legal steps** before any charging, and **regional pricing** for other countries.
- **Institutional licences** for schools.
- **Catalyst Creators programme:** selected students or tutors invited to build official-style courses, using the `authors` link from X1.3.
- A paid AI key, a **model picker** in the chatbot (choose from several models), and an **AI subscription** with higher limits.
- Teacher accounts, and class groups created by teachers, without replacing the school's own learning system.
- Institutions (choosing your university), more countries, and other languages.
- Live multiplayer quiz rooms (Socket.IO), which need hosting that supports WebSockets.
- Web push.
- A board ranking all students by XP (only if the owner asks for it, and opt-in).
- Paid courses, payouts and a revenue share.
- Payments and passes.
- Any business, tax or data-protection registration steps.
