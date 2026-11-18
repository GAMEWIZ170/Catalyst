# Catalyst design reset + AI feature roadmap

## Context
The owner added StudyFetch reference shots in `docs/expansion/references/`. The old UI was built by Copilot: plain CSS (top-level styles 1.5k lines + `styles/global/` 4.1k lines) plus Astryx loaded as prebuilt CSS. There is no StyleX Vite plugin. The owner allows tearing the old UI down. The owner also passed on Gemini's AI-feature ideas and asked for: the plan saved in the repo, research on the project and UI, the ui-ux-pro-max skill, and full use of the design and animation skills. The decisions below come from two quiz rounds (2026-11-18) and four research tracks.

## Owner decisions, 18 November 2026 (second round)
- **Fonts:** Atkinson Hyperlegible Next only. Fraunces was chosen first, then dropped on 18 November 2026 after the owner saw it in the shell.
- **Brand colour:** a gold brand accent, starting value `oklch(0.80 0.16 80)` with near-black text on it. The neutrals are warm, and only light and dark modes remain.
  - **Why gold:** it does not clash with the three rating tiles (rust red, purple, green), it nods to Ghana, and it stands out from StudyFetch's lime and Quizlet's blue.
  - **Contrast:** check AA on both modes in phase 1. Text on gold must be dark.
- **Mascot:** deferred until after the beta.
- **Achievements return:** they get custom images (one illustrated badge per achievement, same style) and an overhaul of their rules and screens. This reverses the pivot plan's "XP and achievements hidden" line for achievements only. XP and levels stay hidden. Scheduled as phase 7.
- **AI spend:** free tiers only until production. No paid model until students are ready to pay. This replaces "paid tier before beta" below.
  - **Consequence:** Google may use free-tier inputs to improve its products. The privacy page and the upload screen must say so plainly, and beta testers must agree to it.
  - **Rate limits:** the free tier has request limits, so the daily per-student cap and the platform cap matter even more.

## Step 0 — done 18 November 2026 (docs + ui-ux-pro-max install)
1. `git branch --show-current`, and confirm it is `feature/study-companion`.
2. Create `docs/redesign/`:
   - `docs/redesign/DESIGN_RESET_PLAN.md` = this plan.
   - `docs/redesign/RESEARCH.md` = the research findings: AI feature costs, competitor UI lessons, tooling, with source URLs.
3. Install ui-ux-pro-max at **project scope, as a lookup tool only**:
   - Read `SKILL.md` and `scripts/` from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill first. It is MIT and runs Python with the standard library only.
   - Pin a commit. Run `npx ui-ux-pro-max-cli init --ai claude` in the repo root, which writes `.claude/skills/ui-ux-pro-max/`.
   - Check that `py -3` works on Windows.
   - Allowlist only `search.py`.
   - Never let it write `design-system/` over our `DESIGN.md`.
4. Ask before committing. Add the files by name.

## Design decisions
| Topic | Decision |
|---|---|
| CSS base | Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui in JavaScript (`components.json` `tsx:false`, `@/` alias via `jsconfig.json` + vite `resolve.alias`). Old CSS goes into `@layer legacy` declared first (`@layer legacy, theme, base, components, utilities;`), so Tailwind utilities beat it. Preflight is left out until the cleanup phase. |
| Tokens | Semantic oklch variables (`--primary`/`--primary-foreground`…) mapped through `@theme inline`. Dark mode: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` keeps the existing `data-theme` attribute and the inline script in `index.html`. |
| Shell | StudyFetch layout: slim left rail, breadcrumb top bar (timer chip, share), right tutor panel docked at ≥1024 px that collapses to a button. Phones get bottom tabs and a slide-up tutor sheet. |
| Colour | Calm neutral base with bold solid accents on ratings, set covers, mastery and the heatmap. |
| Palettes | One brand palette, light and dark. Remove `data-palette`, `applyPalette` in `utils/appearance.js`, and the Settings swatches. Students can pick a small accent (timer colour). |
| Type | Atkinson Hyperlegible Next only, heavier weights for headings and card faces. |
| Shape/motion | Pill buttons, 16–24 px radii, Motion (`motion/react`) with `MotionConfig reducedMotion="user"`. CSS transitions for hover and press. |
| Flashcards | Top tracker strip (mode chip, card dots, shuffle, ⋯, pager). Thumbs up/down and bookmark. Prev / SPACE Flip / Next keycap pills. **3 colourful rating tiles** (keys 1–3, fixed positions), each showing its next review time. Thumbs down = "report / fix card". |
| Quiz | Immediate feedback with an "Explain more" button that opens the tutor on that question. Small "Finish test" pill under the feedback, not a full-width bar. |
| Tutor | **Guided (hint-first) by default, with a visible "Just explain" switch.** Suggested prompts depend on the screen. Citation chips once citations exist. |
| Home | One "Continue" card, due-reviews count ("12 due · ~4 min"), then set cover cards with progress rings. |
| Progress | Khan-style mastery per unit (Not started / Familiar / Proficient / Mastered). Year heatmap on Me only. Forgiving streak: one free rest day a week, earn a lost streak back, never paid, no guilt notifications. |
| Build flow | Visible steps: reading → outline → lesson n/N, each lesson openable as soon as it is ready. Warn that scanned PDFs work less well. |
| Timer | Pomodoro chip in the top bar, with a settings popover (segmented control, steppers, swatches). |
| Money UX | No ads, core study modes free, easy cancel. These are the top complaints about Quizlet and StudyFetch. |
| UI rules | The CLAUDE.md rules stay, and are reviewed one by one in the DESIGN.md rewrite. |
| Mascot | Deferred until after the beta. |
| Achievements | Custom badge images in one style, plus an overhaul of achievement rules and screens (phase 7). XP and levels stay hidden. |

## AI feature roadmap (Gemini's list, after research)
| Feature | When | Notes |
|---|---|---|
| Model switch | **Before beta** | 2.5 Flash-Lite is deprecated. Move to the newest free-tier Flash-Lite model, staying on free tiers until production. At production, budget on 3.5 Flash-Lite paid prices ($0.30 in / $2.50 out per 1M tokens), with a target of ≤ ~$0.50 per student a month. Tell beta testers that free-tier inputs may be used by Google. |
| FSRS spaced repetition | Beta (already built) | `backend/src/utils/scheduler.js` uses `ts-fsrs`. Map the 3 tiles to Again/Hard/Good. The v6 upgrade (FSRS-7) comes later, after checking its API. |
| Socratic tutor | Beta | Hidden solution in the system prompt, one hint per turn, answer after N tries or "Just explain". Daily turn cap. ~$0.33 per student a month at 200 turns. |
| Exam-grade practice | Beta | Bloom's Apply/Analyze/Evaluate, distractors from known misconceptions, a self-solve check pass. A `numeric` question type is an **owner decision** later. |
| Offline-first | Beta | Extend `frontend/public/sw.js`. Add IndexedDB (Dexie) for decks, notes, FSRS state and an outbox with client ids. `navigator.storage.persist()`. |
| Cross-source synthesis | Early production | Map step per source, then a reduce step into the exam guide. ~$0.06 per guide. |
| Page citations | Early production | Chunk ids per page via `pdfjs-dist`. The model returns `sourceIds`; the server rejects invented ids. Open the page in the viewer at `#page=N`. |
| Mermaid diagrams | Early production | Lazy-loaded, `securityLevel:'strict'` + a sanitiser (no-raw-HTML rule). |
| Live lecture capture | Later | ~$0.065 per lecture hour. Needs a monthly cap. Phones use camera frames, since they lack `getDisplayMedia`. |
| Podcast audio recaps | Later | ~$0.12–0.23 per 10-minute recap with Gemini TTS. Too costly for 50 cedis now. |

## Skill workflow (one direction skill per session)
direction (impeccable leads, frontend-design for the look) → palette and font lookup (ui-ux-pro-max `search.py`, results fed into DESIGN.md) → tokens (impeccable) → components (emil-design-eng) → motion (animate, choreograph, gestures; find-animation-opportunities for gaps) → mobile (mobile-native) → audit (unslop, impeccable critique, review-animations/remove-animations).

## Phases (one per session)
0. Step 0 above (done).
1. **Design docs (done 18 November 2026):** rewrite `PRODUCT.md` and `DESIGN.md` with impeccable plus the ui-ux-pro-max lookup, using Atkinson and the gold brand. Update CLAUDE.md (stack, themes, Astryx lines, Gemini model, free-tier rule) and `frontend/README.md`.
2. **Foundation (done 18 November 2026):** Tailwind + shadcn install, tokens file, legacy layer, fonts, Motion. Build passes, and old screens look unchanged.
3. **Shell (done 18 November 2026):** new `components/layout/AppShell.jsx`. Remove XP (`LevelUpDialog`, `useXp`) and palette UI. Hidden routes stay unmounted from the nav. Tutor dock reuses `components/lab/CompanionDrawer.jsx` and `components/learn/Companion.jsx`.
4. **Core components (done 18 November 2026):** shadcn Button, Dialog, Popover, DropdownMenu, Tabs, Toast/Sonner, Tooltip, plus our own Segmented, Stepper, Keycap and ProgressDots. Swap the internals of `components/ui/*` (Button, Field, Dialog, Tabs, Toast…) behind the same props so pages keep working.
5. **Screens, in order (in progress, flashcards `pages/learn/Flashcards.jsx` done 18 November 2026; quiz player `pages/learn/Test.jsx` question screen done 18 November 2026 (intro, results, timed exam and the editor `LabQuiz.jsx` still old); Library `pages/lab/Lab.jsx` done 18 November 2026; set frame `pages/lab/LabSet.jsx` done 18 November 2026 (its tab contents SetNotes, SetCards, SetQuizzes, SetMaterials, SetSharing and GenerateMore are still Astryx inside `AstryxTheme`); Review.jsx still uses the old flashcard CSS, so `10-flashcards.css` stays until it is ported):** flashcards (`pages/learn/Flashcards.jsx`) → quiz (`pages/lab/LabQuiz.jsx`, `pages/learn/Test.jsx`) → Library (`pages/lab/Lab.jsx`) → set outline and lesson (`pages/lab/LabSet.jsx`) → Home (`pages/learn/Courses.jsx`) → Me and Progress (`pages/learn/Progress.jsx`, heatmap) → build flow (`components/lab/NewSetDialog.jsx`) → editors → settings → auth. Each port deletes that screen's old CSS file in `styles/global/`.
6. **Cleanup:** remove `@astryxdesign/*`, `@stylexjs/stylex` and `components/astryx/`, delete the legacy layer, turn on Preflight, run `graphify update .`.
7. **Achievements:**
   - Review the achievement list and rules: forgiving, no guilt, tied to real study (reviews done, units mastered, streak weeks).
   - Make one badge image per achievement in a single style. Locked and earned states. Light and dark safe. Small WEBP files for low data.
   - Rebuild the achievements screen and the unlock toast with the new components. XP and levels stay hidden.

## Verification
- `npm run build` in `frontend/` after every phase. Step 0: the skill appears in the skill list, and `py -3 .claude/skills/ui-ux-pro-max/scripts/search.py "education" --domain style` returns results.
- For each ported screen, run Playwright at 320, 360, 390, 768 and 1280 px, light and dark, and print `innerWidth`.
- Keyboard pass: keys 1–3 rate, SPACE flips, arrows navigate. Check visible focus and reduced motion.
- Real-backend checks via the `verify` skill against `catalyst_test`.
- Report `CHECK name => result`, and `NOT RUN` for anything skipped.

## Open for owner
- `numeric` question type for multi-step problems.
- Offline quizzes: the pivot plan ships answers for the student's own sets. Confirm this still stands.
