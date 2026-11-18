---
name: Catalyst
description: Warm study desk with a gold accent. Calm neutrals, bold solid colour only where it carries meaning, serif headings, soft rounded shapes. One palette, light and dark.
colors:
  background: "oklch(0.985 0.008 85)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.955 0.012 85)"
  border: "oklch(0.90 0.014 85)"
  input: "oklch(0.60 0.02 80)"
  foreground: "oklch(0.22 0.015 70)"
  muted-foreground: "oklch(0.48 0.02 75)"
  primary: "oklch(0.80 0.16 80)"
  primary-foreground: "oklch(0.22 0.03 70)"
  brand-ink: "oklch(0.50 0.11 70)"
  rate-again: "oklch(0.52 0.16 35)"
  rate-hard: "oklch(0.50 0.17 300)"
  rate-good: "oklch(0.50 0.12 155)"
  on-rate: "oklch(0.99 0 0)"
  success: "oklch(0.50 0.12 155)"
  warning: "oklch(0.52 0.12 65)"
  destructive: "oklch(0.52 0.19 25)"
  info: "oklch(0.50 0.13 250)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
  card-face:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.3
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  small:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
---

<!-- SEED: established with the owner on 18 November 2026, before implementation (docs/redesign/DESIGN_RESET_PLAN.md). Re-run /impeccable document after phase 4 to capture the real tokens and components. -->

# Design System: Catalyst

Status: seed for the design reset. Phase 2 turns these values into `frontend/src/styles` tokens for Tailwind v4 (`@theme inline`) and shadcn/ui. Old screens keep their old look inside `@layer legacy` until each one is ported. The old five-palette system is retired.

## Overview

**Creative North Star: "The Warm Study Desk"**

A quiet desk where a student sits down with their own notes. The surface is warm paper and near-black ink, with generous space and one readable column. Colour is saved for things that mean something: the gold brand on the one main action, the three rating tiles, set covers, mastery levels and the activity heatmap. When colour appears it is solid and confident, never a gradient or a glow.

The layout follows StudyFetch: a slim left rail, a breadcrumb top bar with a Pomodoro timer chip, and a tutor panel docked on the right on wide screens. Phones get bottom tabs and a tutor sheet that slides up. Headings and flashcard faces use Fraunces, a warm serif, so the app reads like a good textbook; everything else uses Atkinson Hyperlegible Next, so Cl, C1 and O, 0 stay distinct.

Progress should feel welcoming and make students want to return, without pressure. Streaks forgive, nothing nags, and there are no coins, leaderboards or confetti.

**Key Characteristics:**
- Calm warm neutrals, bold solid accents only where they carry meaning.
- Gold brand, always with dark text on it.
- Serif display (Fraunces), legible sans body (Atkinson).
- Soft rounded shapes: pill buttons, 16 to 24 px panel corners.
- Motion that answers the user, short and interruptible.

**Signature patterns (confirmed by the owner):**
- **Flashcards:** a tracker strip on top (mode chip, card dots, shuffle, ⋯, pager); thumbs up, thumbs down (report or fix card) and bookmark; keycap pills for Prev, SPACE Flip and Next; three colourful rating tiles (Again, Hard, Good) on keys 1 to 3 in fixed positions, each showing its next review time.
- **Quiz:** immediate feedback, an "Explain more" button that opens the tutor on that question, and a small "Finish test" pill under the feedback, never a full-width bar.
- **Home:** one "Continue" card, a due count ("12 due · ~4 min"), then set cover cards with progress rings.
- **Progress:** mastery per unit in four steps. A year heatmap appears on the Me page only.
- **Build flow:** visible steps (reading, outline, lesson n of N), each lesson openable as soon as it is ready.
- **Timer:** a Pomodoro chip in the top bar with a settings popover (segmented control, steppers, swatches). The timer colour is the one accent a student may choose.

## Colors

Warm paper neutrals with a single gold brand, and a small set of solid meaning colours.

### Primary
- **Ghana Gold** (`primary`): the main action on a screen, the active rail item, the selected chip, progress fills. Text on it is always **Dark Roast** (`primary-foreground`), 9.1:1. Gold on paper is only 1.8:1, so gold is a fill, never text or a lone border on light backgrounds.
- **Brand Ink** (`brand-ink`): gold-family text for links and small brand words on light backgrounds (5.9:1). In dark mode it equals the gold.

### Rating tiles
- **Rust** (`rate-again`), **Plum** (`rate-hard`), **Leaf** (`rate-good`): solid fills for the three flashcard ratings, with `on-rate` text. The same hues tint mastery levels and the heatmap.

### Status
- `success`, `warning`, `destructive`, `info`, each paired with an icon or words. A wrong quiz answer uses `warning`, never `destructive`; red is for system and form failures.

### Neutral
- **Paper** (`background`): the page.
- **Sheet** (`card`): raised panels, dialogs, the top bar.
- **Desk** (`muted`): sunken areas such as formula panels and inactive tracks.
- **Hairline** (`border`): dividers and panel edges.
- **Control Edge** (`input`): borders of anything you type in or press, at least 3:1 on paper and sheet.
- **Ink** (`foreground`) and **Pencil** (`muted-foreground`): text.

### Dark mode
Same roles, warm charcoal instead of paper. Values checked for AA on 18 November 2026:

| Token | Dark value |
|---|---|
| background | oklch(0.18 0.01 70) |
| card | oklch(0.22 0.012 70) |
| muted | oklch(0.26 0.012 70) |
| border | oklch(0.32 0.012 70) |
| input | oklch(0.55 0.015 75) |
| foreground | oklch(0.95 0.008 85) |
| muted-foreground | oklch(0.74 0.015 80) |
| primary / brand-ink | oklch(0.82 0.15 82) |
| primary-foreground | oklch(0.20 0.03 70) |
| rate-again / hard / good | oklch(0.70 0.14 35) / oklch(0.72 0.13 300) / oklch(0.74 0.13 155) |
| on-rate | oklch(0.18 0.02 70) |
| success / warning / destructive / info | oklch(0.74 0.13 155) / oklch(0.80 0.13 70) / oklch(0.70 0.17 25) / oklch(0.74 0.11 250) |

Dark mode is driven by the existing `data-theme` attribute (`@custom-variant dark`). Surfaces rise by getting lighter, not by shadow.

### Named Rules
**The Gold Means Go Rule.** Gold marks the one main action and the student's current place. If two things on a screen are gold, one of them is wrong.

**The Meaningful Colour Rule.** Bold colour appears only on ratings, set covers, mastery, the heatmap and status. Everything else is neutral. Colour never carries meaning alone.

**The Token Only Rule.** No colour literal outside the tokens file and `Avatar.jsx`. Every pair is checked in both modes: text 4.5:1, borders, icons and focus rings 3:1.

## Typography

**Display Font:** Fraunces (variable serif, Google Fonts, OFL), fallback Georgia, serif
**Body Font:** Atkinson Hyperlegible Next (self-hosted variable WOFF2), fallback system-ui, sans-serif

**Character:** a warm, slightly old-style serif for the moments that matter (page titles, set names, card faces) over a sans built for legibility. Formulas stay in KaTeX's own fonts.

### Hierarchy
- **Display** (Fraunces 600, 2.5rem, 1.1; 2rem on phones): page titles and set names.
- **Headline** (Fraunces 600, 1.75rem, 1.2): section headings.
- **Card face** (Fraunces 500, 1.75rem, 1.3; shrinks to fit long cards): flashcard front and back.
- **Title** (Atkinson 600, 1.25rem, 1.3): card titles, dialog titles.
- **Body** (Atkinson 400, 1rem, 1.55): notes and UI text. Reading column at most 68ch.
- **Label** (Atkinson 600, 0.875rem): buttons, chips, tabs. Sentence case.
- **Small** (Atkinson 400, 0.75rem): meta text such as review times and counts.

### Named Rules
**The Two Voices Rule.** Fraunces for display and card faces only; never for buttons, labels, inputs or body text. No third family.

**The No Shouting Rule.** No all-caps eyebrow labels and no tracked-out caps.

## Layout

- **Shell:** slim left rail with icons and labels; breadcrumb top bar (timer chip, share); tutor panel docked on the right at 1024 px and up, collapsing to a button. Below 768 px the rail becomes bottom tabs and the tutor becomes a sheet.
- **Content width:** reading and form content capped at about 760 to 900 px and centred. Inputs never stretch across the screen.
- **Spacing:** only the frontmatter steps (4 to 64 px). Space between groups is larger than space within a group. Phone edges 16 px, laptop 24 px.
- **Touch:** every target at least 44 px.
- **Sections:** separated by spacing and headings, not by a bordered card around each one. Cards are for clickable items.
- **Breakpoints checked:** 320, 360, 390, 768 and 1280 px, light and dark.

## Elevation & Depth

Mostly flat with tonal layers: paper, sheet, desk. A panel gets a 1 px hairline or a soft shadow, never both. Shadows are reserved for things that float (popovers, menus, the tutor sheet, dialogs). In dark mode depth comes from lighter surfaces, and shadows are off.

**The Float Only Rule.** Only floating layers cast shadows. Resting cards are flat.

## Shapes

Soft and rounded. Buttons, chips and keycaps are pills. Inputs use `md` (12 px). Cards and the flashcard use `lg` (16 px). Dialogs, sheets and the tutor panel use `xl` (24 px). Progress shows as rings on set covers and as rounded bars elsewhere.

**Motion** (carried here until components exist): Motion for React (`motion/react`) inside `MotionConfig reducedMotion="user"`. Dialogs and popovers scale and fade from their trigger (150 to 200 ms, ease-out). Tabs get a sliding underline. Skeletons crossfade into content. The flashcard flip and rating feedback are the main expressive moments. Hover and press use plain CSS transitions. Motion only answers a user action.

## Do's and Don'ts

### Do:
- **Do** put dark text (`primary-foreground`) on gold, in both modes.
- **Do** use `brand-ink`, not gold, for gold-family text on light backgrounds.
- **Do** keep the three rating tiles in fixed positions with keys 1 to 3 and the next review time on each.
- **Do** use `warning` for a wrong answer and `destructive` only for real failures.
- **Do** put destructive actions in a "⋯" menu with an undo toast or a confirm dialog.
- **Do** respect `prefers-reduced-motion` and keep visible keyboard focus.

### Don't:
- **Don't** use gradients, glows, glass effects, 3D buttons or decorative animation.
- **Don't** use confetti, flames, coins, leaderboards, XP bars or guilt copy.
- **Don't** use Fraunces for UI text, or add a third font.
- **Don't** put a bordered card around every section, or cards inside cards.
- **Don't** use a native select or a bare text box for a fixed set of choices; use chips, segmented controls, steppers or pickers.
- **Don't** add a mascot before the beta.
