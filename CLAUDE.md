# Catalyst: project memory for Claude Code

Read this at the start of every session. It is the short version of how this project works and how the owner likes to work.

## What this project is

Catalyst is a low-cost learning platform for University of Ghana students (target price about 50 cedis a month). The first course is CHEM113. Students get lessons (explanation, video, images, chemical formulas), named tests, flashcards, materials, progress and streaks. One admin (the owner) writes all content through an in-app builder.

Structure: course > unit > lesson. Tests can belong to a lesson, a unit or a course.

## How to work with the owner

- He is learning as we build. Explain simply and clearly, and say why, not just what. Short analogies are welcome.
- Be honest. If something was not run or not seen, write `NOT RUN`. Never claim a check passed unless you saw it pass.
- Spend as little as you can. Do not re-read big files without need. Do not rewrite things that were not asked for.
- No hidden or unrequested additions. Only change what was asked. Mention anything else you noticed instead of doing it.
- Never read or print `.env` or any credential. Scripts load `.env` with dotenv at runtime only.

## Stack

- Backend: Node 24, Express 5, MongoDB with Mongoose 9, Joi (via the `validateWith` helper), bcrypt, jsonwebtoken (httpOnly cookie named `token`), cookie-parser, cors, helmet, express-rate-limit, multer (memory storage), cloudinary, ms. All CommonJS.
- Frontend: React and Vite, react-router data router (`createBrowserRouter`, `useBlocker`), plain CSS with tokens, KaTeX plus mhchem loaded lazily (`RichText`), `Avatar.jsx` for profile pictures.
- Themes: `data-palette` (lagoon, indigo, ember, orchid, graphite) and `data-theme` (light, dark). Storage keys `catalyst-palette` and `catalyst-theme`. No colour literals outside `tokens.css` and `Avatar.jsx`.

## Layout and naming

- Repo root: `C:\Users\Professor\Desktop\API\Catalyst` with `backend/` and `frontend/`.
- Backend files: `x.models.js`, `x.controller.js`, `x.routes.js`. Folder is `middlewares`.
- Windows with PowerShell. Use PowerShell syntax in commands.

## Run commands

- Backend: `npm run dev` in `backend/` (port 3000).
- Frontend: `npm run dev` in `frontend/` (port 5173, Vite proxies `/api` to `http://127.0.0.1:3000`).
- Frontend build check: `npm run build` in `frontend/`.

## Git rules

- Run `git branch --show-current` before any change. Stop if it is not the branch you were told.
- Branches: `main` is stable. The work branch is `feature/ui-overhaul`, made from `main`. Older branches (`feature/tests-and-media`, `feature/frontend-v2`, `backup/frontend-v2-before-merge`) are history.
- Never `git add .` or `git add -A`. Add files by name.
- Never commit `.env`, `todo.txt`, screenshots or verification scripts.
- Never push or merge to `main` unless asked. Never `reset --hard` without a backup branch and approval.
- Small commits with clear messages. Ask before rewriting history.

## Domain rules (do not break these)

- Grading is server-side only. Students never receive `correctOption`, `correctAnswer`, `explanation` or `explanationImage` before they answer.
- Question types: `mcq` or `true_false`. For MCQ the admin sends options without ids plus `correctIndex`; the server stores option ids and the correct option id.
- Soft deletes with `deletedAt`. A deleted or unpublished parent makes children return 404.
- A lesson completes by passing its test, finishing a flashcard deck, or Mark as done. Mark as done works only when the lesson has no test with questions and no published flashcards. Unit and course tests never complete a lesson.
- Empty tests return 409 on submit. Streaks count UTC days.
- Avatar keys: beaker, flask, atom, test-tube, microscope, flame, molecule, magnet, crystal, dna, leaf, periodic-tile.

## Backend conventions

- Validate ids before limiters. Use `returnDocument: "after"`. Mongoose hooks do not use `next`.
- Reorder routes are declared before `/:id` routes.
- Limiters (15-minute windows): general 1000 per IP, strict 20 failed per IP, answer 100 per user, submit 60, mark-done 60, flashcard rating 300, upload 30.
- Uploads: images are JPEG, PNG or WEBP up to 2 MB, checked by real bytes, no SVG. PDFs up to 10 MB and must start with `%PDF-`. Cloudinary URLs must be https on `res.cloudinary.com` with the right path.
- Admin routes always run `authenticate` then `authorizeRole("admin")`.

## Frontend conventions

- Keep pages thin. Reuse shared components in `components/admin` and `components`.
- Use the data router and `useUnsavedChanges` for leave-without-saving prompts.
- Every interactive control must work by keyboard and have a label.
- Check layouts at 320, 360, 390, 768 and 1280 px in all five palettes and both modes when you change styles.
- Rich text goes through `RichText`. Never inject raw HTML.

## Verification protocol

When asked to verify against the real backend:

1. Use a launcher kept outside the repo that loads `backend/.env` at runtime and points at the `catalyst_test` database. Never print the URI.
2. Create throwaway users. Delete them afterwards.
3. Use Playwright with a fresh context per viewport and print `innerWidth` to prove the size.
4. Print one `CHECK name => result` line per check with the actual values. Use `NOT RUN` for anything you did not do.
5. Clean up: test data, Cloudinary assets you uploaded, temporary scripts, running servers.
6. At most two retries on a failing check, then one fix commit. Report what is still failing.

## Reporting style

Short report: commits (hash and message), files changed, CHECK lines, what is `NOT RUN`, and anything the owner must decide. No long recaps.

## Documentation duties

- One README per area (backend `README.md`, frontend `README.md`). Do not split into many files.
- When a route, rule or env variable changes, update the README in the same piece of work.

## Current status

- Backend v2 done and pushed: tests, questions, flashcards, materials, uploads, avatars, admin course tree (`GET /admin/courses/:id`) and reorder routes.
- Frontend done and pushed on `feature/frontend-v2`: palettes, top bar and profile menu, settings, admin course list, course editor, lesson editor, test editor, rich text and formulas, student course list, outline, lesson hub, test flow, flashcard study flow, progress page.
- Not yet verified on a real backend: student screens, flashcard flow, progress page, the latest visual fixes, the lesson editor load time, image upload, and the full responsive matrix.
- Current work: UI overhaul on `feature/ui-overhaul` (made from `main`), following `UI_OVERHAUL.md`. One phase step per session.
- Next: finish the overhaul phases in `UI_OVERHAUL.md`, then run the unverified checks above, then merge into `main` when the owner says so.

## Roadmap (owner may do some himself)

Hosting and production cookie and proxy settings (`trust proxy`), subscriptions and payments (start manually with mobile money), expiring material links, password reset, restore for deleted content, saving theme on the account, notifications, deactivating users, an automated test suite, backups (Atlas free has none), deleting orphaned Cloudinary assets, an Enrollment model, a unique course code index, an admin promote route, email verification.
