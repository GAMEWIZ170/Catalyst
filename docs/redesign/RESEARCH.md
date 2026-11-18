# Design reset research (18 November 2026)

Research for the design reset and the AI feature roadmap. All costs are estimates, not measurements. Check the official pages again before you build anything that depends on a price.

## 1. AI features suggested by Gemini

### The model comes first
Google lists `gemini-2.5-flash-lite`, our current default, as deprecated. No shutdown date is announced yet. Its successors cost more (prices per 1M tokens):

| Model | Input text | Input audio | Output | Notes |
|---|---|---|---|---|
| 2.5 Flash-Lite | $0.10 | $0.30 | $0.40 | Deprecated |
| 3.1 Flash-Lite | $0.25 | $0.50 | $1.50 | Earliest shutdown 2027-05-07 |
| 3.5 Flash-Lite | $0.30 | $0.30 | $2.50 | Plan on this one |

- Batch mode is half price but has no free tier.
- On the free tier, Google may use what we send to improve its products. **Owner decision (18 November 2026):** stay on free tiers until production, and tell beta testers plainly on the privacy page and the upload screen.
- 50 cedis is about US$4–5. Keep AI under about $0.50 per student per month.

Sources: https://aistudio.google.com/docs/pricing · https://aistudio.google.com/docs/deprecations

### Feature by feature

| Feature | When | Rough cost | Key points |
|---|---|---|---|
| FSRS spaced repetition | Beta (already built) | $0 | `backend/src/utils/scheduler.js` already uses `ts-fsrs`. ts-fsrs 6.0.0 (FSRS-7) changes the API (`DefaultScheduler`, `scheduler.review`). Check its card fields before upgrading. In the benchmark, per-user parameters beat the defaults (log loss 0.340 vs 0.362). |
| Socratic tutor | Beta | about $0.33/student/month at 200 turns | Bastani et al., PNAS 2025, about 1,000 students: plain GPT-4 raised practice scores 48% but lowered exam scores 17%. A hint-first tutor raised practice 127% and left exam scores unchanged. Put the hidden solution in the system prompt and give one hint per turn. |
| Exam-grade practice | Beta | about $0.017 per 20 items | Use Bloom's Apply, Analyze and Evaluate levels. Each wrong option comes from a named misconception. A second "solve it yourself" check pass removes items whose key is wrong. Multi-step numeric answers would need a new `numeric` type. |
| Offline-first | Beta | $0, saves data | Service worker plus IndexedDB (Dexie) for decks, notes and FSRS state. An outbox with client-generated ids prevents double counts on replay. Call `navigator.storage.persist()`. Safari has no Background Sync. |
| Cross-source synthesis | Early production | about $0.06 per guide (300 pages) | Extract text once. Run one map step per source, then one reduce step into the guide. |
| Page citations | Early production | +5–10% tokens | Gemini returns no citation metadata for PDFs. Give each page's chunks ids with `pdfjs-dist` (`S2:p14`), have the model return `sourceIds`, and reject made-up ids on the server. Open the cited page with `#page=N`. |
| Mermaid diagrams | Early production | about 500 tokens | Render on the client, lazy-loaded. Use `securityLevel:'strict'` plus a sanitiser so the no-raw-HTML rule holds. The package is large, so load only the diagram types we use. |
| Live lecture capture | Later | about $0.065 per lecture hour | Record with MediaRecorder at Opus 16 kbps, about 7 MB per hour. On laptops capture slides with `getDisplayMedia`; on phones use camera frames. Drop duplicate slides with a dHash (Hamming distance ≤ 8). A heavy user could cost about $3.90 a month, so it needs a cap. |
| Podcast audio recaps | Later | $0.12–0.23 per 10-minute recap | Gemini TTS is priced per audio token (32 tokens per second). Too costly for 50 cedis. The browser's `speechSynthesis` is a free stopgap. |

Sources: https://github.com/open-spaced-repetition/ts-fsrs · https://github.com/open-spaced-repetition/srs-benchmark · https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/ · https://ai.google.dev/gemini-api/docs/tokens · https://aistudio.google.com/docs/document-processing

## 2. Competitor study apps: lessons

- **Flashcard ratings.** Anki has 4 buttons (Again, Hard, Good, Easy) and shows the next interval on each. Its users complain most about too many buttons and about key meanings changing between card states. Lesson: fixed button positions, and the next review time shown on each tile. (We keep 3 tiles, the owner's choice.)
- **Swipe.** AnkiDroid users report short swipes being missed. If we add swipe later, make the threshold forgiving and keep the buttons.
- **Quiz feedback.** NotebookLM has an "Explain" button that says why your answer was wrong, with citations. Quizlet's top grading complaint is that typed answers are graded too strictly.
- **Tutor.** NotebookLM uses three panels (Sources, Chat, Studio) and numbered citations that open the exact passage. Its "Learning Guide" asks probing questions instead of answering. StudyFetch's tutor (Spark.E, now "Sparky") answers from your uploads, with Tutor Me, Call (voice) and Live Lecture modes.
- **Home.** Anki's due counts per deck are the clearest "what to do now" signal of any app here.
- **Mastery.** Khan Academy uses Not started, Attempted, Familiar, Proficient and Mastered. Mastered needs a perfect unit test, and mistakes can lower a level.
- **Streaks.** Duolingo's 2025 "Streak Revival" let users earn a lost streak back for free. Paid streak repair is listed as a dark pattern, and guilt notifications draw complaints. Lesson: a forgiving streak, never paid.
- **Complaints to avoid.** Quizlet: modes moved behind a paywall, a chatbot pushed over flashcards. StudyFetch: surprise charges and hard cancellation. Knowt: ads covering buttons. AI cards: wordy or wrong (so give a "fix card" action).

Sources: https://docs.ankiweb.net/studying.html · https://faqs.ankiweb.net/frequently-asked-questions-about-fsrs.html · https://blog.google/technology/google-labs/notebooklm-student-features/ · https://support.khanacademy.org/hc/en-us/articles/5548760867853 · https://www.deceptive.design/articles/when-a-user-uses-duolingo-on-a-series-of-consecutive-days-this-is-called-a-streak-if-users-miss-a-day-they-can-pay-to-repair-it · https://uk.trustpilot.com/review/studyfetch.com

## 3. Tooling

### ui-ux-pro-max skill
- **Repo:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. MIT licence. Python, standard library only, no network calls.
- **What's inside:** style, palette, font-pairing and UX-guideline CSV files, searched by `scripts/search.py`.
- **Overlaps:** impeccable and frontend-design. We use it **only as a lookup tool**. impeccable leads design decisions, and DESIGN.md stays the single source of truth.
- **Installed (18 November 2026):**
  - Location: `.claude/skills/ui-ux-pro-max/`, from upstream commit `f984fcd`.
  - Contents: only that skill's folder. The repo's other skills and the test files were left out.
  - Review: the scripts were checked for network calls, subprocess calls and file deletes. None found apart from one temp file cleanup.
  - Its description was narrowed to "lookup only", so it does not compete with impeccable.
  - Git: `.claude/skills/` is gitignored, so the install stays local, like impeccable.
- **Use:** `py -3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain color|typography|style|ux`. Never use `--persist`.

### Tailwind v4 + shadcn on Vite (JavaScript)
- **Install:** `npm i tailwindcss @tailwindcss/vite`, add `tailwindcss()` to the Vite plugins, and add the `@` alias in `vite.config.js` and `jsconfig.json`.
- **shadcn setup:** in `components.json`, set `tsx:false`, `rsc:false`, `tailwind.config:""` and `cssVariables:true`.
- **Theme:** oklch variables in `:root` and the dark block, mapped to Tailwind with `@theme inline`.
- **Dark mode on our attribute:** `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
- **Running beside the old CSS:** unlayered CSS always beats layered CSS. Put the old CSS in `@layer legacy`, declared first. Leave Preflight out until the old CSS is gone.
- **Motion:** `npm install motion`, `import { motion } from "motion/react"`. Use `MotionConfig reducedMotion="user"`.

Sources: https://ui.shadcn.com/docs/installation/vite · https://ui.shadcn.com/docs/javascript · https://ui.shadcn.com/docs/theming · https://tailwindcss.com/docs/preflight · https://tailwindcss.com/docs/dark-mode · https://motion.dev/docs/react

### Current frontend (map, 18 November 2026)
- **Styles:**
  - Top level: `styles/` holds 1,472 lines in 9 files.
  - `styles/global/`: 15 numbered files, 4,086 lines. Biggest: `09-admin` 791, `06-admin-editor` 577, `08-shared-states` 565.
- **Astryx:** loaded as prebuilt CSS through `components/astryx/AstryxTheme.jsx`. There is no StyleX Vite plugin. About 30 files import `@astryxdesign`.
- **Theme attributes:** set before first paint by an inline script in `frontend/index.html`, and at runtime by `utils/appearance.js` and `ThemeToggle.jsx`.
- **Offline:** `frontend/public/sw.js` caches the app shell and course lesson reads only. No study-set data is cached, and IndexedDB is not used.
- **Shell:** `AppShell.jsx` still carries XP (`LevelUpDialog`, `useXp`), which the pivot hides.

## Not checked
- The full card fields and browser support of ts-fsrs v6.
- Current versions of `vite-plugin-pwa` and Dexie.
- Whether newer shadcn CLIs ask you to choose Radix or Base UI.
- StudyFetch's real tutor layout: no public docs.
- The current cedi exchange rate.
