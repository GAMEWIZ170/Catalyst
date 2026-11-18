# Catalyst Frontend

The Catalyst frontend is a React application powered by Vite. It provides the student learning experience and the admin content workspace for the Catalyst API.

## Design reset (in progress)

The UI is being rebuilt screen by screen (plan: `docs/redesign/DESIGN_RESET_PLAN.md`). `DESIGN.md` in the repo root is the source of truth for the new look: one gold brand palette in light and dark, Atkinson Hyperlegible Next as the only font, Tailwind v4 and shadcn/ui, and Motion for animation.

Until a screen is ported, it keeps the old system described below (plain CSS layers, Astryx, the five palettes). Phase 2 (done) added Tailwind v4, shadcn config (`components.json`, `@/` alias), Motion, and moved the old CSS into `@layer legacy`. `src/styles/app.css` is the only stylesheet entry: layer order is Astryx, Tailwind theme, legacy, new tokens, utilities. New tokens are in `src/styles/tokens.new.css`; four names carry a `-ui` suffix (`--muted-ui`, `--success-ui`, `--warning-ui`, `--info-ui`, `--accent-ui`) because the old `tokens.css` uses the plain names. Preflight is off until phase 6. New styles go in utilities, never in the legacy files. Phase 6 removes Astryx, the palettes and the legacy layer. Notes below that mention palettes or Astryx describe the old system and are removed as each part goes.

## Requirements

- Node.js and npm
- The Catalyst backend running locally or at a reachable API URL

## Installation

From the frontend directory:

```powershell
cd frontend
npm install
```

## Environment configuration

Copy `.env.example` to `.env` when the frontend is hosted separately from the API.

```env
VITE_API_URL=
```

Leave `VITE_API_URL` empty during local development. Requests use `/api/v1` and are forwarded by Vite to the backend configured in [`vite.config.js`](./vite.config.js).

When deploying the frontend separately, set `VITE_API_URL` to the public API base URL, including `/api/v1`, for example:

```env
VITE_API_URL=https://api.example.com/api/v1
```

The frontend uses HTTP-only cookies for authentication. The API must allow credentialed CORS requests from the frontend origin.

## Running locally

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The Vite proxy currently targets `http://localhost:3000`. If the backend uses another port, update the proxy target or set the backend `PORT` to match it.

## Production build

```powershell
cd frontend
npm run build
npm run preview
```

The generated files are written to `frontend/dist/`, which is ignored by Git.

`npm run preview` sends two caching rules (`cacheHeaders` in `vite.config.js`): files in `/assets/` have a hash in their name and are cached for a year (`immutable`), and `index.html` and the page routes are `no-cache` so a new build is picked up at once. Whatever serves `dist/` in production needs the same two rules.

## Speed

- **Lazy routes.** Tests, flashcards, progress, settings and the admin pages load their code when opened. Login, register, the course list, the course outline and the lesson are in the first bundle (a separate file for them cost one more round trip on a slow connection). KaTeX and mhchem load only when a page has a formula the server has not already drawn, and the KaTeX stylesheet loads with them. Lesson explanations come with their formulas already drawn by the server (`explanationMath`, see the backend README), so on a lesson saved after that feature only the stylesheet loads and the 80 KB KaTeX script does not.
- **The streak** comes with `GET /auth/me` and lives on the user in `AuthContext`; it is refreshed after login and after the `catalyst:refresh-streak` event.
- **One call per screen.** Home uses `GET /home`, the lesson screen `GET /lessons/:id/hub`, the progress screen `GET /progress/overview`.
- **Data starts early.** `ProtectedPage` in `App.jsx` starts the screen's requests the moment the route matches, while its code is still downloading.
- **Read cache.** `src/api/cache.js` keeps student reads for 60 seconds and shares one request between callers. Finishing a lesson, submitting a test and rating a card clear it (`changed()` in `api/client.js`), and login, register and logout clear it too. Tests and flashcards are kept for 5 seconds only, enough for the page to reuse the request started when the route matched.
- **Prefetch.** `src/api/prefetch.js`: hovering, touching or focusing a link to a lesson or course starts loading its data. Spread `nearToPrefetch(...)` onto a link to add it.
- **Images.** `ResponsiveImage` serves 400, 800 and 1200 px versions through `srcset` and uses the stored `width` and `height` to reserve space. The lesson video is a small still and a play button; the player loads only after a tap.

## App shell

- **Places.** Home, Courses, Review, Study Lab and Me are in a sidebar on laptops (768 px and up) and in a bar along the bottom on phones. Never both. Admins see neither: they use the admin navigation. The sidebar collapses to icons; the choice is saved on the device (`catalyst-sidebar`). Both are `<nav aria-label="Main">`, the open page has `aria-current="page"`, and the collapse button has `aria-expanded`.
- **Search.** The top bar has a search field (`HeaderSearch`). `/` or Ctrl+K focuses it (never while typing in another field). From 2 letters it shows lessons (the existing `/search` API) and pages, or recent searches when empty. Arrow keys move, Enter opens, Esc closes. Under 640 px it is an icon that opens a full-screen search. "See all results" opens `/search?q=...`.
- **Tools.** The top bar holds the notification bell, a gear, the streak and the avatar menu. Only one popover is open at a time; Escape closes it and returns focus to its button. On phones the bell and gear panels open across the screen under the bar. The streak number is hidden under 380 px wide, and the brand name under 640 px, to make room.
- **Focus timer.** An idle timer is a quiet icon; while a session runs it becomes a pill with the time left. The popover shows a big monospace countdown, length chips (15, 25, 50, 90 and Custom with a minus and plus stepper), one Start button, a break link and a gear that opens the default lengths in Settings. There is no Study Hall: it was removed (route, nav link, backend endpoints). Top bar icon buttons are 38 px, borderless (`styles/topbar.css`).
- **Palettes on Astryx.** `components/astryx/astryx-fonts.css` points Astryx's accent tokens (`--color-accent`, `--color-accent-muted`, `--color-on-accent`, text and icon accent) at our `--accent`, `--accent-soft` and `--on-accent`. Astryx buttons, links and selected states therefore follow the five palettes (lagoon, indigo, ember, orchid, graphite) and light or dark. Astryx's own greys, radius and spacing are unchanged.
- **Learning screens polish.** `styles/learning-polish.css`: the Home Continue card is as wide as the courses grid; the notification and profile popovers scale and fade in like the search panel; the flashcard flip is a longer ease-out turn and the 1/2/3 rating buttons are tinted (Don't know, Unsure, Confident); test options press down slightly. All motion is off under reduced motion.
- **Gear panel.** Dark mode, colour theme, text size, low-data mode, the two notification switches, and a link to the full Settings page.
- **Text.** The text for the shell and Settings is in `src/i18n/en.js`, read through `t("key")`. Another language is a sibling file added to `src/i18n/index.js`. Screens outside the shell still carry their own English text.
- **Time zone.** Register sends the browser's time zone. An account with none (made before time zones existed) reports it once on the first visit. Students can change it under Settings, Account.
- **Focus timer.** The timer button in the top bar (students) starts a focus session or a break. Lengths are in Settings, Study (saved on the device). `TimerContext` stores `endsAt` and the phase in `localStorage`, never a counter: the screen shows `endsAt` minus now, ticks every second, wakes at the exact end and re-checks when the tab becomes visible, so a hidden tab stays accurate. It survives page changes and reloads, and works across tabs. At the end it plays a short sound, shows a browser notification (permission is asked only when the student first starts a timer) and sets a message that screen readers hear ("Focus session complete"). The countdown itself is hidden from screen readers. While a focus session runs the study timer reports active seconds, so the server can count focus minutes.
- **Notes editor.** Tiptap (`@tiptap/react`, `starter-kit`, `extension-mathematics`) is loaded only when a student opens a set's Notes tab (a separate file of about 134 KB compressed), so the rest of the app is unchanged. The Mathematics extension asks for KaTeX 0.16 to 0.18 and the app uses 0.19, so it was installed with `--legacy-peer-deps`; formulas draw correctly. Run `npm install --legacy-peer-deps` if npm complains. Notes are saved as Tiptap JSON and never as HTML.
- **Level and XP.** The avatar menu shows the level and Me shows a level card with a thin bar (`components/profile/XpBits.jsx`). `useXp` loads `/xp/me` after each page change, so a level reached during a test shows its small panel only on the next page change, never mid-test. The panel is a plain dialog with one button; no confetti.
- **Achievements.** Me has two tabs, Overview and Achievements (`?tab=achievements`). A new achievement shows a small success toast (`useAchievementToasts`, sent by `/xp/me`) and is then marked as seen. Hidden ones show as locked until earned.
- **Weekly goal.** Settings, Study has a weekly goal (off, or 3 to 6 study days a week). Home shows a thin "This week" bar under the daily goal. The text is only encouraging ("Weekly goal met. Enjoy your rest days.") and never mentions missed days.
- **Friends.** `/friends`: your code as a chip with copy and share buttons, "Add friend" in a small popover, the friends list first (a ⋯ menu removes a friend), incoming and waiting requests, and privacy rows (click the display name to change it; a switch hides your level). Capped at 760 px; changes save by themselves.
- **Challenges.** The test results screen has a Challenge a friend button (full tests only, not practice runs). It opens `/challenge/:id`, which plays up to 10 questions one at a time with no feedback (it reuses `QuestionInputs`), then shows the score and a friendly comparison once both have played. `/challenges` lists them. Sharing uses `components/shared/ShareButton.jsx`: the phone's own share menu first, then a WhatsApp link and Copy link.
- **Sharing.** `components/shared/ShareButton.jsx` opens the phone's own share menu (`navigator.share`) first. Where there is none it shows WhatsApp and Copy link. It is used on a lesson (`/s/l/:id`), on the Friends page for the invite (`/s/i/:code`) and on a challenge you made (`/s/c/:id`). The links go through the backend so chat apps get a preview; see the backend README.
- **Study circles.** `/circles` (linked from Friends) lists circles, invites, a combined weekly bar per circle and an invite box (friends by display name). There are no scores per person, and the text never names a member who studied less.
- **AI drafts.** Drafts are made in two places: the "Generate more" button on each set tab (`components/lab/GenerateMore.jsx`, which wraps `AiDrafts.jsx` for one kind), and the review screen after "drop in your notes". The AI makes drafts only; the student edits and saves them.
- **Study companion.** `components/learn/Companion.jsx` is on every lesson (not in the admin preview) and on the AI tab of a study set. It sends the last few turns with each message, shows a log (`role="log"`, polite live region), the sources each answer came from, the note "AI can make mistakes. Check with your lesson.", and a Flag this answer form that goes to the report inbox. It shows "Free beta, fair-use limits apply", the messages left today, and "AI is resting until tomorrow" when the daily limit or global cap is reached. It is not placed on test or exam screens.
- **Community sets.** The Study Lab has a Community sets button. `/community` is the shelf (search, category, course, topic, sort, saved sets, paging), `/community/:id` shows a shared set read only with Save, Copy to my Study Lab, Share, Report, flashcard study, notes as text, quizzes (Practise, Timed, and a Leaderboard with this week and this month) and `/community/boards` has "Most studied sets" and "Top creators". A set's owner uses the Sharing panel on the set page (who can see it, the originality declaration, status and any reviewer note). Admins have Community in the admin More menu: approve, reject with a note, take down. A Timed quiz link carries `?timed=1&board=1` when the student chose the leaderboard.
- **Read aloud.** Lessons have a Read aloud button (play, pause, stop and speed 0.75x to 1.5x) that uses the browser's own voice. Formulas are read as "formula". Nothing is sent anywhere, and the button is hidden in browsers with no speech voice.

## Offline use, install and low-data mode

**Install and offline.** The built site is a PWA: `public/manifest.webmanifest`, the icons in `public/icons` and the service worker `public/sw.js`, with no extra package. The worker is registered only in the built site (`import.meta.env.PROD`), never in `npm run dev`. To test it, run `npm run build` then `npm run preview`.

- It keeps the app itself (page shell, script, style, fonts) from the first visit, so the app opens with no network.
- It keeps the two reads a student opened: a lesson screen (`/api/<version>/lessons/:id/hub`) and a course outline (`/api/<version>/courses/:id`). They are fetched from the network first; a saved copy is shown when offline, on error, or after 4 seconds without an answer.
- **It never stores** answers, tests and their questions, login, notifications, review, progress, admin routes, or any request that is not a GET. Everything outside the two reads above goes straight to the network. Pages other than the ones opened before, and the lazy page files not yet visited, are not available offline.
- With no network the app cannot ask who is logged in, so the last profile (no password, no token) is kept in `localStorage` as `catalyst-offline-user` and used only when the request fails for lack of a network. A 401 still means logged out.
- Saved lessons and the remembered profile are removed on log in, register, log out and account deletion, so the next person on the same phone sees nothing of the last.
- A banner says "You are offline" while the browser reports no connection.
- `public/icons` is made by `node scripts/make-icons.mjs` (a white C on the lagoon accent). The manifest colours are the default lagoon values, because a manifest cannot read CSS variables.
- **Hosting needs:** HTTPS (localhost is exempt), `sw.js` and `manifest.webmanifest` served with `Cache-Control: no-cache` (the preview server in `vite.config.js` does this), `/assets/*` cached for a year, and an API path of the form `/api/<version>/...` on the page's own address or behind the same rules. Change `VERSION` in `sw.js` when its rules change.
- Settings has an Install section. The button shows when the browser offers installing; otherwise it explains the browser menu.

**Low-data mode.** The gear panel or Settings, Appearance, "Use less data". It turns on by itself when the browser's Save-Data setting is on and the student has not chosen yet; a saved choice always wins. Saved on the device (`catalyst-lowdata` in `localStorage`, applied as `data-lowdata` before the page paints), not on the account. It serves pictures at 320 and 640 px wide with Cloudinary's low-quality setting (instead of 400, 800 and 1200), skips the video preview picture (the Play button stays), and stops loading lessons ahead when a link is hovered or touched.

## Application routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/register` | Public | Create a student account |
| `/confirm-email` | Public | Opened from the link sent to a new address. Confirms an email change (`?token=`) |
| `/privacy`, `/terms` | Public | Plain-English privacy and terms pages. Linked in the footer and on Register |
| `/home` | Authenticated | Home: continue where you left off, today's plan, daily goal, due review, your courses with their authors |
| `/courses` | Authenticated | The course list with a category filter (`?category=<slug>`), author names and a category label on each card. The category and authors are plain properties of the course, edited in the course editor |
| `/me` | Authenticated | Me (capped at 760 px): a compact header (picture, name, level bar and XP inline) and one grouped list with dividers: Progress, My exams, Friends, Saved items, Settings. An Achievements tab. Progress, Saved and Settings keep Me highlighted |
| `/exams` | Authenticated | My exams: the list comes first (upcoming, then past); "Add exam" opens a dialog with a course picker, a type control, quick chips (Tomorrow, In a week, In a month), a date picker and a time picker. Delete is in each row's ⋯ menu and asks first. Home shows the nearest exam and Today's plan counts down to it |
| `/tests/:id/exam?timed=1` | Authenticated | Any test taken timed: a "Take it timed" button on the test intro. Timed quizzes add the extra time from Settings, Study |
| `/lab` | Authenticated | Study Lab: a grid of my sets with tabs All, Processing, Ready and Issue, and a compact search. New set opens one dialog (drop a PDF or paste text); the AI names the set and builds drafts in the background, and the list refreshes every 3 seconds while anything is processing |
| `/lab/:id/review` | Authenticated | Review the AI drafts (flashcards, quiz questions, notes): edit or delete each, click the title, topic or course to change it, then Save to my set. "Start empty" skips the drafts. Shows a calm waiting state while processing and Try again after an issue |
| `/lab/:id` | Authenticated | One set (content capped at 900 px), tabs Notes, Flashcards and Quizzes (`?tab=notes\|cards\|quizzes`). Click the title to rename it; Share and Delete are in the ⋯ menu (delete asks first). Notes: a Tiptap editor with an attached sticky toolbar, a small muted save state and an "Add source" dialog (PDF drop zone or pasted text). Flashcards: "Add card" opens a blank card in edit mode, cards save when you leave them, drag the handle to reorder, ⋯ for Edit, Delete and Paste a list. Quizzes: "New quiz" makes "Untitled quiz" with its name open. Each tab has "Generate more" (AI drafts of that kind, edited before saving). A floating chat button opens the study companion in a side panel |
| `/lab/:setId/study` | Authenticated | The deck player for a set (the lesson flashcard player, run on a set). Ratings feed Review |
| `/lab/quizzes/:testId` | Authenticated | Edit a quiz. Click the name to rename. "Add question" asks for the type from two cards (Multiple choice, True or false), then a dialog; the right answer is chosen by tapping it. Taking a quiz uses `/tests/:id`, including "Take it timed" |

| `/courses/:id` | Authenticated | Course outline with lesson progress |
| `/lessons/:id` | Authenticated | Lesson hub: explanation, formulas, practice tests, flashcards, materials, Mark as done, next lesson |
| `/tests/:id` | Authenticated | Take a test, one question at a time, with feedback after each answer. Lesson tests show their pass percent and whether the student passed |
| `/admin/tests/:id` question form | Admin | Also has Hint and Worked solution (one step per line) with previews. Students see a Show hint button before answering and numbered steps after |
| Test player, extra types | Authenticated | Numeric (with unit), multi-select, fill in the blank, matching (a select per item), ordering (tap items in order) and equation balancing (a number box before each formula). The admin question form has a Type menu with a form for each |
| `/courses/:id` mastery | Authenticated | Each lesson row ends its meta line with the mastery level as plain text (Attempted, Familiar, Proficient or Mastered). Not started shows nothing |
| `/topics` | Authenticated | Practise by topic: choose a topic, source and year, then `/practice/topic` runs up to 20 questions from every lesson in the test player without submitting. Home links here once questions are tagged. The admin question form has Topic, Source and Year |
| `/tests/:id/exam` | Authenticated | Timed mock exam for a test with a time limit (`/tests/:id` shows the intro). Countdown from the server's deadline, a question-number grid, flag for review, answers saved as you go, auto-submit at zero, then a review of every question with its worked solution. The site navigation is hidden during the exam. The admin test page has a Time limit field |
| `/home` Today's plan | Student | When an exam date is set, Home shows Today's plan: days left, the lessons to do today (links) and a link to review. Set or clear the date under Settings, Exam date |
| `/review` | Authenticated | Today's review: due flashcards (Space flips, 1 to 3 rate), then a link to practise due mistakes. Home shows a Due today chip that links here. Review is one of the five places in the navigation |
| `/practice/mistakes` | Authenticated | Practise questions from the mistakes queue (`?course=` and `?unit=` narrow it), using the test player without submitting. Home and each course page show a Mistakes panel; test results offer Practise the ones I missed |
| `/lessons/:id/flashcards` | Authenticated | Study a flashcard deck: tap the card to turn it over, then rate it (`?filter=review` shows cards still to review) |
| `/progress` | Authenticated | View scores, completed lessons, and streak |
| `/settings` | Authenticated | Four tabs, kept in the address (`?tab=account\|appearance\|notifications\|study`). Rows have the label and one line of help on the left and the control on the right: switches, segmented controls, pickers. Every change saves by itself and a small "Saved" shows at the top; there are no Save buttons. Account: profile picture, time zone, and rows that open dialogs for email, password and download; Delete my account is in a ⋯ menu and asks for the password and the word DELETE. Appearance: colour theme, text size, low data, install. Notifications: two switches. Study: focus and break lengths, extra time, daily and weekly goal, exam date (date picker), link to My exams |
| `/admin/dashboard` | Admin | DAU, WAU, MAU, stickiness, new sign-ups, activation, open reports, a 30 day trend chart (with a table of the same numbers), retention by sign-up week, top and drop-off lessons, and activity totals. Shows "Not worked out yet" until `npm run stats` has run in the backend |
| Notification bell | Authenticated | Top bar bell with an unread count. The panel lists new-lesson and review-due messages, each linking to its page, plus Mark all as read. On phones the panel spans the screen under the top bar |
| `/admin` | Admin | One summary line (students, active, published and draft courses), category chips and a search, then the course list as rows: a publish switch and a ⋯ menu (Delete, with a confirmation). "New course" makes "Untitled course" with a temporary code at once and opens its editor |
| `/admin/users` | Admin | Find users, change roles, deactivate accounts and manage subscriptions Filters are chips (role, status) plus a search; each user is a row with a ⋯ menu; confirmations and the end-date picker are dialogs. UI polish step 8. |
| `/admin/trash` | Admin | Deleted content, with a Restore button for each item |
| `/admin/reports` | Admin | Report inbox with Open and Resolved tabs. Each open report has a reply box and Mark as resolved, which notifies the student Built with Astryx tabs (Open, Resolved); each report has a reply box and Mark as resolved. |
| `/admin/analytics` | Admin | Question analytics table, lowest percent correct first, with a link to each question's test editor The minimum-answers filter is chips (Any, 5+, 10+, 20+, 50+). |
| `/admin/tests/:id/import` | Admin | CSV import: template download, file check with a result per row, then Import |
| `/admin/preview/lessons/:id`, `/admin/preview/tests/:id` | Admin | The lesson or test as a student sees it, drafts included. Opened with Preview as student in the editors. Nothing is saved |
| `/admin/courses/:id` | Admin | Course editor (capped at 900 px, no bordered cards). Course details are rows that save by themselves: click the title, code, category or an author to change it; the description saves when you leave it; "Add author" opens a new row for typing. "Add unit" makes "Untitled unit" with its name open; "Add lesson" makes "Untitled lesson" and opens it. Units, lessons, unit and course tests below |
| `/admin/lessons/:id` | Admin | Lesson editor: explanation, image, video, tests, flashcards, materials Details save by themselves when you leave a field (no Save button); the video host is a chip choice; "Add test" creates "Untitled test" and opens it (it used to fail with a missing scope). |
| `/admin/tests/:id` | Admin | Test editor: questions and, for lesson tests, the pass percent needed to complete the lesson Pass percent and time limit save when you leave the field; the question type and numeric tolerance and equation side are chip choices. The CSV import page has a drop zone. |

Unknown routes redirect to `/home` for signed-in users or `/login` for signed-out users.

## Admin workflow

Content is written in the in-app builder. Create content in this order:

1. Create a course on `/admin` and open it.
2. In the course editor, add units, then lessons inside each unit. Rename and reorder them in place.
3. Open a lesson to write its explanation (with chemical formulas), add an image or video, and add its tests, flashcards and materials.
4. Open a test to add its questions. Multiple-choice and true or false are supported.
5. Publish the course, lesson, test and flashcards when they are ready for students. Unpublished or deleted parents hide their children.

Pages ask before you leave with unsaved changes. Images are JPEG, PNG or WEBP up to 2 MB, and PDF materials are up to 10 MB.

**Users and access.** On `/admin/users`, search by name or email and filter by role or status. For a student, "Add 1 month" extends their subscription from today (or from the current end date if it is still in the future), and the menu can add 3 months, set an end date or clear it. The menu also makes someone an admin or student and deactivates or reactivates the account. You cannot change your own role or deactivate yourself. Subscriptions only matter when the backend has `REQUIRE_SUBSCRIPTION=true`; then a student without one sees "Your access has ended" on lessons, tests and flashcards, while courses and progress stay open.

**Preview, reports, analytics, import, history.** Lesson and test editors have Preview as student, which reuses the student lesson and test screens with a banner and with Save, notes, Report and Mark as done removed. Students get a Report a problem button on every lesson and question. The test editor has Import CSV. The lesson editor has a History tab with Restore.

**Trash.** Deleting content hides it from students but keeps it. On `/admin/trash` press Restore to bring an item back. It returns at the end of its list and unpublished, so publish it again when ready. An item whose parent is also deleted says "Restore the lesson first" (or unit, or course).

## Frontend structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── api/client.js          # API requests and credential handling
    ├── api/cache.js           # Short read cache for student screens
    ├── api/prefetch.js        # Start loading a lesson or course on hover or touch
    ├── components/
    │   ├── ui/                # Primitives. Button and SelectField render Astryx (Button, Selector) behind the old props. Also fields, Card, Badge, Tabs, Progress, Dialog, EmptyState, Skeleton, Toast
    │   ├── astryx/            # Astryx theme and wrappers
    │   ├── layout/            # App shell, header search, quick settings, notifications, route guard
    │   ├── shared/            # Used across areas: RichText, ResponsiveImage, ShareButton, ReportButton
    │   ├── learn/             # Lesson, test and flashcard pieces: question inputs, deck summary, companion
    │   ├── profile/           # Avatar, XP, achievements, account section
    │   ├── lab/               # Study Lab set tabs and dialogs
    │   └── admin/             # Builder components: breadcrumbs, switch, dialogs, image field
    ├── context/               # AuthContext, TimerContext
    ├── hooks/                 # useUnsavedChanges, useStudyTimer
    ├── pages/
    │   ├── auth/              # Login, register, password reset, email verify, onboarding
    │   ├── learn/             # Courses, outline, lesson, test, flashcards, review, exams, progress, search
    │   ├── lab/               # Study Lab
    │   ├── community/         # Community sets, boards, challenges, circles, friends
    │   ├── account/           # Me, Settings
    │   └── admin/             # Admin screens and editors
    ├── styles/tokens.css      # Neutrals, per-palette accent, status colours, type, space and radius tokens
    ├── assets/fonts/          # Self-hosted Atkinson Hyperlegible Next (WOFF2) and its licence
    ├── styles/global.css      # Only a list of @imports
    ├── styles/global/         # The global styles in 14 numbered layers. The numbers are the cascade order: do not reorder
    ├── utils/                 # Cloudinary image URLs, course cache
    ├── App.jsx                # Client-side routes
    └── main.jsx               # React entry point
```

## Design system

The look is described in `DESIGN.md` at the repository root. Shared components live in `src/components/ui/` and use `lucide-react` for icons. While the dev server runs, `/dev/components` shows every component in every state (it is not in the production build). Five palettes (`data-palette`: lagoon, indigo, ember, orchid, graphite) and two themes (`data-theme`: light, dark) are chosen in Settings and saved in the browser (`catalyst-palette`, `catalyst-theme`). Colours come only from tokens in `tokens.css`; never write a colour value in a component. Palettes change only the accent; neutrals and status colours are shared. Text must reach WCAG 2.1 AA contrast in all ten palette and theme combinations: run `node scripts/contrast.mjs` in `frontend/` after any change to `tokens.css`. Chemical formulas use KaTeX with mhchem, loaded only when a lesson contains one.

Phase 3 (done) replaced `components/layout/AppShell.jsx` with the new shell: a slim left rail (bottom tabs below 768 px), a breadcrumb top bar with the timer chip, and a tutor panel. A page opts in with `useTutorTarget("set", id)` from `context/TutorContext.jsx`; the panel docks on the right at 1024 px and up and is a bottom sheet below that. XP and level UI is gone from the shell and Me, and the palette pickers are gone from the gear panel and Settings. The old shell CSS (`.topbar`, `.sidebar`, `.tabbar`) is now unused and is removed in phase 6.

## Core components (design reset phase 4)

`components/ui` now sits on Radix primitives and Tailwind tokens. Button, Dialog, Tabs and Toast keep their old props, so pages did not change. New: `Popover`, `DropdownMenu` (the "..." menu), `Tooltip`, `Segmented`, `Stepper`, `Keycap` / `KeycapButton` and `ProgressDots`. All come from `components/ui` (index). Toasts use Sonner behind the same `useToast()`; pass `action: { label: "Undo", onClick }` for undo. Screens that import Astryx directly keep it until they are ported (phase 5). Old `.ui-dialog`, `.ui-tab*` and `.ui-toast*` CSS is now unused and goes in phase 6.

## Flashcards screen (design reset phase 5, first screen)

`pages/learn/Flashcards.jsx` uses `components/learn/FlashCard.jsx` (flip card) and `RatingTiles.jsx` (three tiles, keys 1 to 3, fixed positions). Tracker strip: mode chip, card dots, shuffle, "..." menu. Keys: Space flips, arrows move, 1 to 3 rate. Not built yet: thumbs up/down, bookmark and the next-review time on each tile, because the API has no endpoint for them (the tile time needs a preview of the three FSRS outcomes).

## Quiz player (design reset phase 5, second screen)

The question screen of `pages/learn/Test.jsx` uses `components/learn/QuizOption.jsx` (tick or cross plus words, wrong = warning colour), `ProgressDots`, and a feedback panel under the options. The main button is a normal pill; on the last question it reads "Finish test". Intro, results, timed exam (`Exam.jsx`), the other answer types (`QuestionInputs.jsx`) and the editor `LabQuiz.jsx` are still old. Not built: "Explain more" (the AI tutor only knows set and lesson contexts, and the tutor panel is hidden on test screens).

## Library (design reset phase 5, third screen)

`pages/lab/Lab.jsx` is plain Tailwind plus `components/ui` (Tabs, Button, EmptyState, Badge). Set covers are one solid token colour picked from the title (`rate-again`, `rate-hard`, `rate-good`, `info`), so a set keeps its colour. Processing and issue sets stay as small cards. `NewSetDialog` is still Astryx and keeps its `AstryxTheme` wrapper until the build-flow screen is ported. Not built: progress rings on covers, because the list API has no progress number per set.

## Set page frame (design reset phase 5, fourth screen)

`pages/lab/LabSet.jsx`: editable title (`components/ui/EditableTitle.jsx`, same props as the Astryx `ClickToEdit`), `Tabs`, a "..." `DropdownMenu`, and `Dialog`s for share and delete. The tab contents and the share form are still Astryx and sit inside `AstryxTheme` until their own ports. The tutor panel is already in the shell.

## Home (design reset phase 5, fifth screen)

`pages/learn/Courses.jsx`: one Continue card, today and weekly goal bars, the small legacy panels (due, plan, mistakes, topics, exam), a "Your sets" row of cover cards, and the course list. `components/lab/SetCard.jsx` is shared with the Library. `ui/Progress` (gold fill) and `ui/Badge` now use tokens, so every screen that uses them changed colour. Not built: progress rings on set covers (no progress number in the sets API).

## Me and Progress (design reset phase 5, sixth screen)

`pages/account/Me.jsx` (header, `Tabs`, link list) and `pages/learn/Progress.jsx` (stat tiles, unit bars, scores) are Tailwind and `components/ui`. The year heatmap is not built: it needs a per-day activity endpoint in the backend. The unit mastery labels (Not started, Familiar, Proficient, Mastered) wait for a rule from the owner.

## Authentication behavior

The frontend does not store JWTs in local storage. Login and registration receive an HTTP-only `token` cookie from the backend, and API requests include credentials automatically. On startup, `AuthContext` calls `/auth/me` to restore the current session.

## Troubleshooting

- **`Failed to fetch`**: confirm the backend is running, verify the Vite proxy port, and check that the backend `CLIENT_URL` matches the frontend origin.
- **Redirected to login**: the authentication cookie may be missing, expired, or blocked by a CORS/origin mismatch.
- **No courses appear**: courses must exist and be published; deleted courses are hidden.
- **Admin page redirects away**: the authenticated user must have the `admin` role.
- **Unit, lesson, or question creation fails**: create parent records first and use the selector populated by the admin page.
