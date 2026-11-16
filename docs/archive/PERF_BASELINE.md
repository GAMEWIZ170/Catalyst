# Perf baseline (ROADMAP step 1.1, before any Phase 1 change)

Date: 2026-11-13. Branch `feature/speed` (from `main` at `f139714`). No repo code was changed to take these numbers.

## How it was measured

- Frontend: production build (`npm run build`) served by `vite preview` on port 4173.
- Backend: normal `src/server.js`, started by a launcher kept outside the repo. The launcher pointed it at `catalyst_test` and added timing: a `Server-Timing` header (`db` and `total`) and a per-request log. `db` is the sum of Mongoose operation times, so parallel queries add up and can exceed real wall time.
- Data: `DEMO113` seeded by `seed:demo` into `catalyst_test`. The seeded demo accounts cannot log in (the address in `.env` fails the API's email check), so a throwaway student was used. Deleted afterwards.
- Lighthouse 12, mobile preset (Slow 4G, 4x CPU), performance only, one run per page, logged in through a cookie header. Every run printed one warning: "tested device appears to have a slower CPU than Lighthouse expects". Treat scores as slightly pessimistic. One run per page is noisy.
- API calls: Playwright at 390 px, cold navigation to each page.

## Targets vs now

| Target | Now | Result |
|---|---|---|
| Student entry JS under ~170 KB gzip | 83.8 kB JS (94.2 kB with CSS) | met |
| LCP <= 2.5 s on lesson | 2.2 s | met |
| LCP <= 2 s on course home | 2.7 s (course list), 2.1 s (outline) | NOT met |
| <= 2 API calls before main content | 3 to 9 calls per page | NOT met |
| Lesson page under 500 KB | 271 KB | met |
| No COLLSCAN on the main queries | 2 COLLSCANs | NOT met |

## Lighthouse (mobile)

| Page | Score | FCP | LCP | TBT | CLS | Weight |
|---|---|---|---|---|---|---|
| Course list `/courses` | 92 | 2.1 s | 2.7 s | 150 ms | 0.014 | 138 KB |
| Outline `/courses/:id` | 97 | 1.5 s | 2.1 s | 130 ms | 0.026 | 134 KB |
| Lesson `/lessons/:id` | 81 | 1.7 s | 2.2 s | 400 ms | 0.163 | 271 KB |
| Test `/tests/:id` | 97 | 1.8 s | 2.3 s | 40 ms | 0 | 140 KB |
| Flashcards | 95 | 1.6 s | 2.8 s | 0 ms | 0.002 | 272 KB |

- Lesson LCP element is `.lesson-explanation`. Lesson page loads KaTeX (77 KB) and mhchem because the demo lesson has formulas.
- Lesson CLS 0.163 (above the 0.1 limit). Shifts come from `.video-frame` and `.footer`. The video frame has no reserved size.
- Flashcards LCP 2.8 s is over 2.5 s.

## Five biggest chunks (gzip)

| Chunk | Raw | Gzip |
|---|---|---|
| `index-*.js` (entry: React, router, lucide, app shell) | 265.6 kB | 83.8 kB |
| `katex-*.js` (lazy) | 256.0 kB | 76.1 kB |
| `index-*.css` | 57.6 kB | 10.5 kB |
| `mhchem-*.js` (lazy) | 32.5 kB | 8.0 kB |
| `katex-*.css` (lazy) | 27.0 kB | 7.5 kB |

Measured from `dist/` with gzip, not with `rollup-plugin-visualizer`. No dependency was added. The visualiser would show what is inside the entry chunk, which is not known yet.

## Database

- Round trip to the database: median 119 ms (min 111, max 187) for a `ping`. The host is Atlas (`mongodb.net`). The region is NOT AVAILABLE from the connection string; read it in the Atlas dashboard. A 119 ms round trip suggests the cluster is far from this machine.
- Every endpoint's time is almost all database time, and it scales with the number of sequential queries (about 120 ms each).

## Endpoints (mean over the test run)

| Endpoint | Calls | Mean total | Mean db | Queries |
|---|---|---|---|---|
| `GET /courses/:id` (outline) | 95 | 1385 ms | 1382 ms | 9.7 |
| `GET /lessons/:id/flashcards` | 3 | 390 ms | 387 ms | 3 |
| `GET /progress/streak` | 24 | 324 ms | 622 ms | 4 |
| `GET /progress` | 6 | 280 ms | 279 ms | 2 |
| `GET /tests/:id` | 3 | 263 ms | 261 ms | 2 |
| `GET /lessons/:id` | 3 | 258 ms | 254 ms | 2 |
| `GET /auth/me` | 20 | 256 ms | 254 ms | 1.8 |
| `GET /courses` | 8 | 241 ms | 238 ms | 1.8 |

The outline count (95) is inflated by Lighthouse runs, so the mean is the useful number. Its queries are already batched with `$in`, but they run in about six sequential stages. The `register` endpoint also appears slow (775 ms, one call); it is bcrypt and not a student read path.

Every authenticated request starts with a `users.findOne({_id})` (162 times in this run) for the role and subscription check. A page that makes 3 calls pays it 3 times.

## Query plans (`explain("executionStats")`)

All main queries use an index except these two:

| Query | Plan | Docs examined | Returned |
|---|---|---|---|
| `units.find({course, deletedAt:null}).sort({order})` | **COLLSCAN** + SORT | 29 | 1 |
| `lessons.find({unit:{$in}, isPublished, deletedAt}).sort({order})` | **COLLSCAN** + SORT | 43 | 1 to 4 |

- Existing indexes: `users` (_id, email), `courses` (code, text), `progresses` (user+lesson), `testresults` (user+test), `flashcardprogresses` (user+flashcard), `units` (_id, text), `lessons` (_id, text), `tests` (lesson, unit, course), `questions` (test+order), `flashcards` (lesson+order), `materials` (lesson+order).
- Missing: `units` on `course`+`order`, `lessons` on `unit`+`order`.
- `courses.find` for the list uses `code_1` and examines every published course (27 in this test database, 18 returned). Fine at this size.
- `tests.find` uses an `$or` of three index scans plus an in-memory sort. Fine at this size.
- Aggregate plans for counting questions, flashcards and materials use indexes (keys examined equals docs examined). Their plan text was not printed by the script.
- The collections are small, so COLLSCAN costs little today. It will grow with content.

## API calls per page (cold, 390 px, production build)

| Page | Calls | Duplicates | Notes |
|---|---|---|---|
| Course list | 9 | `/courses` x2, `/progress/streak` x2, `/courses/:id` x2 | Calls repeat. Cause not investigated. |
| Outline | 3 | none | `/auth/me`, `/courses/:id`, `/progress/streak` |
| Lesson | 5 | none | `/lessons/:id` and `/progress` run in parallel; `/lessons/:id/materials` starts about 1.7 s later (a waterfall) |
| Test | 3 | none | |
| Flashcards | 3 | none | |
| Progress | 7 | `/progress/streak` x2, `/courses/:id` x2 | `/courses/:id` starts about 0.7 s after the first batch (a waterfall) |

`/auth/me` and `/progress/streak` run on every page and are not part of the page's own content.

## What this says for the next steps

1. The biggest cost is database round trips (119 ms each), not bundle size. The entry JS target is already met.
2. Fewer sequential queries and fewer calls per page (step 1.3 and 1.5) will help most. The outline endpoint is the first one to look at.
3. Course list has duplicate calls (9 calls for one screen). Worth removing before adding caching.
4. Lesson page: reserve the video frame's size (CLS 0.163) and start the materials request with the lesson request.
5. Add indexes on `units` (`course`, `order`) and `lessons` (`unit`, `order`).
6. Atlas region: check the dashboard. If the cluster is far from Ghana, that is a hosting decision, not a code change (hosting is "Not now" in the roadmap).

## Not run

- Lighthouse on the progress page (not in the 1.1 list).
- Lighthouse on a phone or on a real network. These runs were local.
- More than one Lighthouse run per page.
- Server-Timing as a permanent header in the repo. It was added only through the launcher. Step 1.1 says no code changes.

---

# After Phase 1 (steps 1.2 to 1.6)

Date: 2026-11-14. Branch `feature/speed`, commit `5a96db4`.

## Correction to the baseline above

While taking the baseline, several backend processes were listening on port 3000 at once on this machine (on Windows two Node servers can share a port), so some of the baseline numbers may have come from a different backend than the one with the timing hook. The "before" figures below were measured again, side by side with the "after" ones, in one session: `main` at `f139714` against `feature/speed`, same machine, same `catalyst_test` database, same data. Use these for comparison. The baseline tables above are only a rough guide.

The `catalyst_test` database holds 18 published courses (17 left over from earlier test runs) plus DEMO113. Anything that loops over courses (the old course list and progress page) is slower here than it would be with one course. Real CHEM113-only numbers will be better on both sides.

## How the after numbers were taken

- Both builds served by `vite preview` (production build), each proxied to its own backend started by a launcher outside the repo (ports 3101 for `main`, 3100 for `feature/speed`), both on `catalyst_test`.
- Lighthouse 12 mobile (Slow 4G, 4x CPU), logged in by cookie header, 3 runs per page where noted, median reported. Lighthouse printed a "CPU slower than expected" warning, so absolute values are pessimistic, and run-to-run spread is about 0.2 to 0.4 s.
- Lighthouse's simulated throttling barely sees server speed (it models the request graph, size and connection setup). Server time is shown separately from the instrumented backend log.
- API calls: Playwright, 390 px, cold navigation, median of 3.

## Targets

| Target | Before | After | Result |
|---|---|---|---|
| Student entry JS under ~170 KB gzip | 83.8 kB | 86.3 kB | met |
| LCP <= 2.5 s on lesson | 2.2 s | 2.0 s | met |
| LCP <= 2 s on course home | 6.5 s | 1.9 s | met (before is inflated by the 18 courses) |
| <= 2 API calls before content | 3 to 23 | 2 on all six pages | met |
| Lesson page under 500 KB | 271 KB | 268 to 277 KB | met |
| No COLLSCAN on the main queries | 2 | 0 | met |

Not met or unchanged: flashcards LCP (2.9 s before, 3.0 s after; over 2.5 s) and lesson CLS (0.163 both; over 0.1).

## Lighthouse mobile, LCP (median of the runs listed)

| Page | Before | After | Runs |
|---|---|---|---|
| Course list | 6.5 s | 1.9 s | 3 each (before 6.3, 6.8, 6.5; after 1.9, 1.9, 2.2) |
| Outline | 2.2 s | 2.2 s | 3 each |
| Lesson | 2.2 s | 2.0 s | 6 before, 3 after the last change (after 2.0, 2.0, 2.3) |
| Test | 2.45 s | 2.15 s | 2 each |
| Flashcards | 2.9 s | 3.0 s | 3 each (both over target) |

## API calls and content time (Playwright, 390 px, no throttling)

First paired run, `main` then `feature/speed`, median of 3:

| Page | Calls before content, before to after | Content visible, before to after |
|---|---|---|
| Course list | 22 to 3 | 4924 ms to 878 ms |
| Outline | 3 to 3 | 1899 ms to 884 ms |
| Lesson | 5 to 3 | 1921 ms to 899 ms |
| Test | 3 to 3 | 1398 ms to 1394 ms |
| Flashcards | 3 to 3 | 1919 ms to 875 ms |
| Progress | 23 to 3 | 4958 ms to 2415 ms |

After the streak moved into `/auth/me` the calls before content are 2 on every page (`/auth/me` plus the page's own call). A later after-only run showed 1162, 1315, 1394, 1664, 1916 and 5252 ms for the same six pages, because the machine and the remote database were slower at that moment. Time numbers move by a factor of two between runs here, so trust the call counts and the paired run more than any single timing.

## Server time per endpoint (median, instrumented backend, same run)

| Endpoint | Before | After |
|---|---|---|
| Outline `GET /courses/:id` | 1263 ms | 683 ms |
| Lesson: `GET /lessons/:id` then `GET /lessons/:id/materials` | 1513 ms then 1057 ms | `GET /lessons/:id/hub` 488 ms |
| Flashcards | 1117 ms | 888 ms |
| Home: `GET /courses` plus one outline per course | 246 ms plus 18 x 1263 ms | `GET /home` 521 ms |
| Progress | `GET /progress` plus one outline per course | `GET /progress/overview` 3886 ms with 18 courses |

`/progress/overview` still builds a full outline for each course, so it grows with the number of courses. With one course it should be close to one outline (about 700 ms).

## What changed

- 1.2: lazy routes were already in `142397f`. In this phase `CourseOutline` and `Lesson` were made lazy and then put back in the first bundle, because Lighthouse showed the extra file making the lesson slower (LCP 2.2 s to about 3 s). Tests, flashcards, progress, settings and admin stay lazy.
- 1.3 and 1.5: `GET /home`, `GET /lessons/:id/hub`, `GET /progress/overview`. Outline in 4 round trips (was 9), lesson in 3 (was 9). `findVisibleLesson` uses one `$lookup`. Indexes on units, lessons and the course list. gzip with `compression`. 15 second user cache in `authenticate`. The streak comes with `/auth/me`.
- 1.4: images carry optional `width` and `height`, served at 400, 800 and 1200 px with `srcset`. The video facade shows a still, loaded 2 seconds after the page so the lesson text gets the connection first (loading it at once put a connection to another site in the LCP window and made Lighthouse's LCP 0.8 s worse). KaTeX CSS already loaded only on pages with formulas.
- 1.6: cache headers in `vite preview`, a 60 second read cache, data requests start when the route matches, and prefetch on hover, touch and focus.

## Not run

- A real phone, a real network, or a deployed server.
- The other four palettes and dark mode were not checked (no style change beyond the video still).
- Lighthouse on the progress page.
- Old images (saved before sizes were stored) still have no `width` and `height`, so they do not reserve space until an admin saves them again.
- Whether the flashcards LCP can reach 2.5 s. The chain is page code, data, then KaTeX (about 93 KB) and fonts; loading KaTeX early would cost data on pages with no formulas.
