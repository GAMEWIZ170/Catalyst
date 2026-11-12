---
name: Catalyst
description: Calm study-desk and lab-notebook interface for University of Ghana students. Shared warm neutrals, one accent per palette, five palettes and two modes.
colors:
  paper: "#FAF8F4"
  surface: "#FFFFFF"
  sunken: "#F2EEE6"
  line: "#E4DED2"
  control-line: "#857C6D"
  ink: "#1F1B16"
  muted: "#5E574B"
  accent: "#0E7490"
  accent-hover: "#0A5C73"
  accent-soft: "#E0F0F4"
  on-accent: "#FFFFFF"
  success: "#047857"
  warning: "#8F5A00"
  error: "#BE123C"
  info: "#1D5FA8"
typography:
  font: "Atkinson Hyperlegible Next, system-ui, sans-serif"
  scale: "12, 14, 16, 19, 23, 28, 33 px"
  weights: "400, 600 (700 only for rare emphasis)"
  body-line-height: 1.55
  heading-line-height: 1.25
rounded:
  control: "6px"
  panel: "12px"
  pill: "999px"
spacing:
  scale: "4, 8, 12, 16, 24, 32, 48, 64 px"
---

# Design System: Catalyst

Last updated in Phase 1 of the UI overhaul (`UI_OVERHAUL.md`). Tokens live in `frontend/src/styles/tokens.css`. Component sections below describe the current build and are rewritten in Phases 2 to 4.

## Direction

**The Study Desk, with a Lab Notebook layer.** A calm, warm, paper-like surface for daily revision: off-white paper, near-black ink, few borders, generous space, one readable column. Lessons, formulas and tests sit in clean ordered panels. Formulas go in lightly tinted (`--sunken`) panels. Streaks are a light touch: a small chip and thin progress bars.

Banned: gradients, glow, glassy effects, decorative animation, confetti, flames, leaderboards, coins, 3D buttons, mascots, all-caps eyebrow labels, cards inside cards, an icon on every heading. Motion only in response to a user action, and it must respect `prefers-reduced-motion`.

## Colour: three layers

1. **Neutrals, shared by every palette.** `paper` (page), `surface` (raised panels, topbar, dialogs), `sunken` (formula panels), `line` (panel borders), `control-line` (borders of anything you press or type in, 3:1 against paper and surface), `ink`, `muted`. Warm off-white and near-black in light mode; deep warm grey and soft off-white in dark mode. Dark mode raises surfaces with a lighter background, not a shadow.
2. **Accent, the only thing a palette changes.** `--accent`, `--accent-hover`, `--accent-soft` (selected rows, soft fills), `--on-accent` (text on a filled accent: white in light mode, dark ink in dark mode). Palettes: lagoon (default), indigo, ember, orchid, graphite. Settings swatches show only the accent.
3. **Status, fixed across palettes.** `success`, `warning`, `error`, `info`, each with a `-tint` background. A wrong test answer uses `warning` (amber), never `error`; red is for system and form failures. Colour never carries meaning alone: pair it with words or an icon.

Accent marks what can be pressed, what is selected, and progress. It is not decoration.

**The Token Only Rule.** No colour literal outside `tokens.css` and `Avatar.jsx`. Every screen must work in all 10 palette and mode combinations.

**Contrast.** `node frontend/scripts/contrast.mjs` prints the ratio of 30 text and UI pairs in all 10 combinations (text 4.5:1, borders, icons and focus rings 3:1). It must print `0 fail`. Run it after any change to `tokens.css`. Last run: 300 of 300 pass.

## Type

One family, Atkinson Hyperlegible Next, self-hosted as one Latin WOFF2 variable file (`src/assets/fonts/`, `font-display: swap`). It was chosen because look-alikes such as Cl, CI, C1 and O, 0 stay distinct, which matters for chemistry. Formulas stay in KaTeX's own serif; lesson prose is the same sans as the rest of the app. KaTeX fonts load as WOFF2 only (see `katexWoff2Only` in `vite.config.js`).

Only these sizes exist: `--text-xs` 12, `--text-sm` 14, `--text-md` 16, `--text-lg` 19, `--text-xl` 23, `--text-2xl` 28, `--text-3xl` 33. Weights 400 and 600. Headings: h1 33 (28 on phones), h2 23, h3 19, line height 1.25. Body line height 1.55. Lesson reading column is `--measure` (68ch). Never use `word-break: break-all`; body wraps with `overflow-wrap: break-word`; buttons never break inside a word.

Known gap: the Ghana cedi sign (U+20B5) is not in the Latin subset. Write "GHS" or "cedis" in text until a symbol subset is added.

## Space and layout

Only these spacing values: `--space-1` to `--space-8` = 4, 8, 12, 16, 24, 32, 48, 64 px. Space between groups is larger than space within a group. Phone edges 16 px, laptop 24 px. Page container `--content-max` (72rem). Minimum touch target `--control-height` (44 px).

## Shape and elevation

Radius: `--radius-control` 6px (inputs, badges, buttons), `--radius-panel` 12px (cards, dialogs), `--radius-pill` 999px. An object gets a 1px border or a soft shadow (`--shadow-sm`, `--shadow-md`), never both. In dark mode shadows are `none`. Keyboard focus is a 2px accent outline with 2px offset; `--focus` is a 3px soft ring for selected items.

## Components (current build, to be rebuilt in Phase 2)

- **Buttons:** 44 px minimum height, 600 weight. Primary is filled `accent` with `on-accent` text, one per screen. Secondary is `surface` with a `control-line` border. Danger is filled `error`. Disabled is 55% opacity.
- **Cards and panels:** `surface` with a 1px `line` border, 12px corners.
- **Formula panel (lessons):** `sunken` background, no border, scrolls sideways when long.
- **Test answers and feedback:** 64 px minimum rows, 2px borders, feedback panel tinted by state with a heading and the explanation.
- **Dialogs:** native `dialog`, scrim backdrop.
- **Status badge, switch, deck summary, skeleton:** as built; unchanged in Phase 1.

## Do and don't

- Do use only tokens for colour, type size and spacing. Every `var(--name)` must exist; an undefined token fails silently.
- Do keep 44 px touch targets, one primary action per screen, text at 4.5:1 and control borders at 3:1.
- Do respect `prefers-reduced-motion`.
- Don't hard-code a colour, add shadows to bordered panels, add a second font family, or use `--surface` for text on a filled accent (use `--on-accent`).
- Don't use error red for a wrong answer.
