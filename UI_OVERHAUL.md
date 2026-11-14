# Catalyst UI overhaul plan/

This file is the plan for overhauling the Catalyst frontend. Claude Code: read this file, CLAUDE.md, PRODUCT.md and DESIGN.md at the start of every overhaul session. Work one whole phase at a time (changed by the owner on 2026-11-12: no longer one step per session). Report after each phase. Stop at every point marked **OWNER DECIDES** and wait for the owner's answer, unless the owner has already answered it (for example through reference images or a message).

## Why the UI looks unprofessional

The problem is consistency, not talent. The app has too many font sizes and weights with no clear "look here first", spacing values chosen by eye, boxes and borders around everything, the accent colour used in too many places, and components (buttons, badges, cards) that each look slightly different. Known symptoms: badges stretching full width, button text breaking mid-word, all-caps eyebrow labels, an awkward footer, and generic cards and lists.

The fix is to lock down a small set of design rules first, rebuild the shared components on those rules, and then redesign the student screens one at a time.

## Design direction (do not drift from this)

"The Study Desk, with a Lab Notebook layer."

- **Study Desk is the base:** a calm, warm, paper-like surface for daily revision. Off-white paper, near-black ink, few borders, generous space, one readable column.
- **Lab Notebook shapes the content:** lessons, formulas and tests sit in clean, ordered, numbered panels. Formulas go in lightly tinted formula panels.
- **Daily Streak is a light touch only:** a small streak chip in the top bar and thin progress bars.

Banned: gradients, glow, glassy effects, decorative animation, confetti, flames, leaderboards, coins, 3D buttons, mascots, all-caps eyebrow labels, cards inside cards, an icon on every heading, purple-on-white defaults. Motion is allowed only in response to a user action, and must respect `prefers-reduced-motion`.

## Which tool does what

- **frontend-design skill (the builder):** use it whenever you design or build something new: fonts, tokens, components, and every screen redesign. It knows how to make interfaces look crafted instead of generic. Say "use the frontend-design skill" in each build step so it is loaded.
- **Impeccable (the reviewer and finisher):** `critique` and `audit` before building, to find what is wrong; `typeset`, `layout`, `extract` and `distill` for sweeps; `polish` and `harden` at the end.
- **Playwright MCP (the eyes):** screenshots, so the result is seen, not guessed.

The order is always: **Impeccable finds the problems, frontend-design builds the fix, Playwright checks it, Impeccable polishes it.**

The frontend-design skill pushes towards bold, surprising designs. Where it conflicts with this brief, **this brief wins**. Give it the brief, PRODUCT.md, DESIGN.md and the reference screenshots every time, and tell it the direction is calm and quiet, not bold.

## Fixed rules

- Plain CSS with tokens in `tokens.css`. No Tailwind, no shadcn, no Mantine, no new UI library.
- The only new dependency allowed is `lucide-react` for icons, and only after the owner approves in Phase 2. Use the native `<dialog>` element for dialogs (ConfirmDialog already does).
- No raw hex colours or off-scale pixel values outside `tokens.css` (Avatar.jsx artwork is the only exception).
- WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and for borders, icons and focus rings that carry meaning, checked in all 5 palettes and both modes (10 combinations).
- Students never see answers before answering. Do not change any API calls or backend behaviour while restyling.
- Follow the git rules in CLAUDE.md: add files by name, never commit screenshots, never commit Impeccable's files or `settings.local.json`, and never push or merge to `main` unless asked.
- Phones on limited data: no second web font, no large PNGs, no autoplaying video.

## Session recipe (use for every step)

1. Start of phase: read this file, CLAUDE.md, PRODUCT.md and DESIGN.md. A fresh session (`/clear`) between phases is optional.
2. Check the branch with `git branch --show-current`. It must be `feature/ui-overhaul`.
3. Run `/impeccable critique <screen>` or `/impeccable audit <area>` first. It changes nothing. Show the owner the top findings.
4. Build the change with the **frontend-design skill**, for that one step only, using the brief above, DESIGN.md and the references in `design/references/`. Don't touch other screens.
5. Take screenshots **once** with Playwright MCP at 390 px and 1280 px, in light and dark. Fix everything seen in one batch. Use a fresh browser context per width and print `innerWidth`.
6. Run `/impeccable polish <screen>` on finished screens.
7. Run `npm run build` in `frontend/`. It must pass.
8. Make one commit, with the files added by name.
9. Report: commits, files, CHECK lines, `NOT RUN` items, and anything the owner must decide.
10. Write any rule that had to be repeated into DESIGN.md.

Screenshots go in `design/screens/` (outside git: `design/screens/` is in `.git/info/exclude`). `design/references/` and `design/DIAGNOSIS.md` may be committed.

The seed and screenshot harness lives outside the repo (scratchpad `h/`: `launch.js`, `seed.js up|down`, `shots.js`). It uses `catalyst_test` and throwaway users `uiseed.*@example.test`.

## Phase 0: setup and baseline

**Step 0.1: tools and branch.**
- Install the official frontend-design skill by running in the shell: `claude plugin install frontend-design@claude-plugins-official`. Tell the owner to run `/reload-plugins` (or restart) afterwards, then confirm it with `/plugin`.
- Create the branch from the current frontend branch: `git switch feature/frontend-v2`, then `git switch -c feature/ui-overhaul`.
- Confirm that Playwright MCP and Impeccable are available.

**Step 0.2: baseline screenshots.** Write a small Playwright script, kept outside the repo, that screenshots every student route at 320, 360, 390, 768 and 1280 px in light and dark, using the `catalyst_test` launcher from the CLAUDE.md verification protocol and throwaway users with seeded test content. Save the screenshots to `design/screens/baseline/`.

**Step 0.3: diagnosis.**
- Run `/impeccable critique` on the lesson hub and the test flow, and `/impeccable audit` on the app shell.
- Run `npx impeccable detect` once, and list the rules that fire most often.
- Write `design/DIAGNOSIS.md` with a short list of the problems that really apply, each with one example screen.

**OWNER DECIDES:** the owner collects 3 to 5 reference screenshots (for example a Duolingo question, Quizlet flashcards, a Khan Academy lesson, a Notion page) into `design/references/`, with one sentence each on what exactly he likes.

*Done when:* the baseline screenshots, DIAGNOSIS.md and references exist.

## Phase 1: foundations (biggest improvement, done once)

**Step 1.1: font.** Use the frontend-design skill to propose the font, with a screenshot of a lesson page in each option:
- Atkinson Hyperlegible Next (recommended: keeps look-alikes like Cl / CI / C1 distinct)
- Source Sans 3
- IBM Plex Sans

**OWNER DECIDES** which font to use. Then self-host it as one WOFF2 variable file, subset to Latin plus the needed symbols, with `font-display: swap`. Configure KaTeX to load only WOFF2. KaTeX's own serif keeps the notebook contrast for formulas.

**Step 1.2: tokens.** Use the frontend-design skill to rewrite `tokens.css` with:
- **Type scale (only these):** 12, 14, 16, 19, 23, 28, 33 px, with line height about 1.5 to 1.6 for body text and 1.2 to 1.3 for headings. Weights 400, 600, and 700 only for rare emphasis. Lesson text max width `68ch`.
- **Spacing (only these):** 4, 8, 12, 16, 24, 32, 48, 64 px. Space between groups must be larger than space within a group. Phone edges 16 px, laptop content 24 to 32 px, with a sensible max content width.
- **Radius:** about 6 px for inputs, badges and small buttons, 10 to 12 px for cards and dialogs, 999 px for pills and avatars.
- **Elevation:** each object gets a 1 px light border or a soft shadow, never both. Two or three shadow tokens. In dark mode, raise surfaces with a lighter background instead of shadow.
- **Colour, in three layers:**
  1. Shared neutrals: paper, raised surface, sunken surface (formula panels), border, muted text, ink. Warm off-white and near-black in light mode; deep warm grey and soft off-white in dark mode.
  2. Accent per palette: `--accent`, `--accent-hover`, `--accent-soft`, `--on-accent`. **This is the only thing a palette changes.**
  3. Status colours, fixed across palettes: success, error, warning, info.

**Decided and built:** palettes change only the accent. Paper, surface, sunken, line, ink and muted are the same in all five palettes, and status colours are fixed. The real values live in `frontend/src/styles/tokens.css` (the single source) and are described in `DESIGN.md`. Accents as shipped:

| Palette | Light accent | Light hover | Light soft | Dark accent | Dark on-accent |
|---|---|---|---|---|---|
| lagoon (default) | `#0E7490` | `#0A5C73` | `#E0F0F4` | `#5DD3EE` | `#0B1A1F` |
| indigo | `#2B5CE6` | `#1F46BF` | `#E7EDFD` | `#8FA8FF` | `#0E1530` |
| ember | `#B63A08` | `#932F0D` | `#FBEADF` | `#FF9B78` | `#2A1208` |
| orchid | `#7E3FC4` | `#6430A0` | `#F0E8FA` | `#C19BEA` | `#1F1030` |
| graphite | `#334155` | `#1E293B` | `#E7EAEE` | `#A9B9D2` | `#10151C` |

Light mode uses `--on-accent: #FFFFFF` for every palette. Dark mode uses a dark ink so text on the lighter dark-mode accent passes. Shared neutrals: light paper `#FAF8F4`, surface `#FFFFFF`, sunken `#F2EEE6`, line `#E4DED2`, control-line `#857C6D`, ink `#1F1B16`, muted `#5E574B`. Dark paper `#1B1916`, surface `#262320`, sunken `#141210`, line `#3B362F`, control-line `#8C8475`, ink `#F4F0E8`, muted `#B8B0A2`. Status (light): success `#047857`, warning `#8F5A00`, error `#BE123C`, info `#1D5FA8`; each has a `-tint` background. A wrong test answer uses warning, never error.

**Step 1.3: contrast script.** Write a small script, kept outside the repo or under a dev-only folder, that reads `tokens.css` and prints the contrast for every text and UI pair in all 10 palette and mode combinations. Fix any failures, for example by making `--on-accent` dark ink for bright palettes. *Status:* done. A re-run on 2026-11-14 checked 23 pairs in each of the 10 combinations (ink, muted and accent on paper, surface and sunken; on-accent on accent and hover; control-line and focus accent at 3:1; each status colour on its tint and on surface) and all 230 pass.

**Step 1.4: base styles and sweep.**
- Global base: body text, headings, links, a visible focus ring, `overflow-wrap: anywhere` only where needed and never `word-break: break-all`, and a page shell where the main area grows so the footer sits at the bottom.
- Replace hard-coded values across the CSS with tokens. Use `/impeccable typeset` and `/impeccable layout`.
- Re-run `/impeccable document` so DESIGN.md describes the new system.

*Done when:* a grep finds no raw hex or off-scale px outside `tokens.css` and Avatar.jsx; the contrast script passes in all 10 combinations; and re-taken baseline screenshots already look calmer.

## Phase 2: core components

**OWNER DECIDES:** approve adding `lucide-react` (one icon set, 16 and 20 px, one stroke width).

Use the frontend-design skill to build or rebuild these, using only tokens:
- **Button:** primary, secondary, tertiary and danger. One height of 40 to 44 px. Sizes to its content and never breaks words. Wraps as whole buttons on phones. Visible focus ring.
- **Inputs:** text, select, checkbox and radio. Labels above, error text below.
- **Card:** one style, with header, body and footer slots.
- **Badge:** inline size, never stretches (`display: inline-flex` or `align-self: flex-start`). Sentence case.
- **Tabs, progress bar (thin, rounded), dialog (native `<dialog>`), empty state (illustration, one sentence, one button), skeleton loader, toast.**

Make a hidden dev route, `/dev/components`, that shows every component in every state.

*Done when:* the components page looks consistent in all 5 palettes, light and dark, at 320 and 1280 px; every component works by keyboard alone (Tab, Enter, Space, Esc, arrows); and `/impeccable audit` on that page shows no P0 or P1 issues.

## Phase 3: student screens (one per session, in this order)

For each screen: `/impeccable critique` first, then redesign it with the **frontend-design skill** following the description below, then screenshots, then `/impeccable polish`.

1. **Lesson hub.** On a laptop: a slim left sidebar with the unit's lessons (current highlighted, done ticked) and a central reading column of about 68ch. Formulas sit in tinted formula panels that scroll sideways when long. Video at 16:9, loaded only when tapped (thumbnail plus play button). Images have captions. At the end: Previous and Next lesson, plus a primary "Take the test" or "Practise flashcards" button. On a phone: the sidebar becomes a "Lesson 3 of 8" selector at the top, the text is full width with 16 px edges, and the action buttons stack full width.
2. **Test flow.** Hide the site navigation and keep only a close button and a thin progress bar. One question in the centre, with large, fully tappable answer options; the selected one gets `--accent-soft`. One primary button fixed at the bottom: "Check" (disabled until something is chosen), then "Continue". After answering, a feedback panel slides up: success tint, check icon and "Correct", or error tint, icon, the correct answer and the explanation. Never colour alone. On a laptop: a centred column of about 640 px, and keys 1 to 4 pick answers. Results screen: a large score, a short message, the missed questions (expandable), and two buttons, "Review mistakes" and "Back to lesson".
3. **Flashcards.** One large centred card. "Tap or press Space to reveal" in muted text. After the reveal, three equal, neutral buttons appear: Don't know, Unsure, Confident (keys 1, 2, 3), with small icons rather than three loud colours. A "12 / 40" counter and a thin progress bar at the top. End summary: "Confident on 28 of 40, 12 to revisit".
4. **Course outline.** Numbered units ("Unit 2 · Stoichiometry") with lesson rows beneath: a status icon (not started, in progress, done), the title, and a quiet meta line ("1 test · 20 cards"). One card per unit, not per lesson. A "Resume: Lesson 2.3" button at the top. Units collapse on phones.
5. **Home and course list.** A greeting line, then one prominent "Continue where you left off" card with a progress bar, then a small streak chip, then the course cards. With only one course, show it plus a quiet "More subjects coming soon" line, not an empty grid.
6. **Progress.** Per-unit progress bars, test scores in a simple list with tabular numbers, and a 14-day row of dots for studied days. No complex charts.
7. **Login and register.** A centred form of about 400 px on the paper background, the wordmark above, and one value line, e.g. "Structured revision for students". Labels above inputs, one primary button, and a link to switch between login and register. An optional illustration beside the form on laptops.
8. **Settings and top bar.** Palette choices as 5 named swatches, avatars in a tidy grid. Top bar: wordmark on the left; streak chip, notifications and avatar on the right, all aligned at 40 px.

*Done when (per screen):* screenshots at 320, 360, 390, 768 and 1280 px, light and dark, show no horizontal scroll, no broken words and no overlaps; long formulas scroll inside their panel; a keyboard walk-through passes; the critique score has improved on the baseline; and only shared components and tokens are used.

## Phase 4: admin consistency

Use the frontend-design skill to replace one-off admin styles with the shared components. Run `/impeccable extract`, then `/impeccable distill` on the editor pages.

*Done when:* the admin screens use the same buttons, inputs, tabs and cards as the student side, and nothing looks like a different app.

## Phase 5: polish

Use the frontend-design skill for the empty states, skeletons, motion and wordmark, and Impeccable for the final checks.

- Empty states with illustrations from one source only (unDraw, recoloured to ink plus accent, served as SVG): login, empty lists and the end of a test.
- Skeleton loaders on course, lesson and progress pages.
- Small motion only for user actions: button press, card reveal, the feedback panel. Respect reduced motion.
- **OWNER DECIDES:** a wordmark ("Catalyst" set in the chosen font, optionally a simple flask mark) as an inline SVG using `currentColor`, plus a favicon. Show 2 or 3 options.
- Run `/impeccable harden` (long names, long formulas, offline and error states), then `/impeccable polish` app-wide, then a final `/impeccable audit`.

*Done when:* throttled "Slow 4G" shows readable text quickly and skeletons instead of blank screens; fonts, icons and illustrations add only tens of kilobytes; and someone new can finish a lesson, a test and a flashcard set on a phone without help.

## After the overhaul

Run the full real-backend verification from CLAUDE.md on the student screens (still never verified). Then the owner decides when to merge into `main`.
