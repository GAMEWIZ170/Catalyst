---
name: Catalyst
description: Calm study-desk and lab-notebook interface for University of Ghana students, themed by five palettes and two modes.
colors:
  ink: "#17324D"
  muted: "#5B7185"
  paper: "#F5F9FC"
  surface: "#FFFFFF"
  line: "#E3EDF3"
  control-line: "color-mix(in srgb, #17324D 60%, #FFFFFF)"
  accent: "#0E7490"
  accent-button: "#0E7490"
  on-accent: "#FFFFFF"
  correct: "#047857"
  correct-tint: "#ECFDF5"
  wrong: "#A16207"
  wrong-tint: "#FFFBEB"
  on-wrong: "#FFFFFF"
  error: "#BE123C"
  error-tint: "#FFF1F2"
  scrim: "rgb(0 0 0 / 55%)"
typography:
  display:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  reading:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  control: "8px"
  panel: "14px"
  pill: "999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-button}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.wrong}"
    textColor: "{colors.on-wrong}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  answer-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "64px"
    padding: "1rem"
  feedback-panel-wrong:
    backgroundColor: "{colors.wrong-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "1rem"
  row-action:
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 1rem"
  row-action-primary:
    backgroundColor: "{colors.accent-button}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 1rem"
  deck-bar:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    height: "0.5rem"
  status-badge:
    textColor: "{colors.correct}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.55rem"
---

# Design System: Catalyst

## Overview

**Creative North Star: "The Study Desk and the Lab Notebook"**

Catalyst is a quiet desk where a student does ordered work. Paper-coloured pages hold white panels with thin borders. Content is laid out like notebook entries: a heading, a short explanation, a formula, a test. Nothing competes with the lesson. The owner asked for a mix of study-desk calm and lab-notebook order, with a soft, friendly feel.

The system is themeable. Five palettes (lagoon, indigo, ember, orchid, graphite) times two modes (light, dark) swap only colour tokens. Shape, spacing and type never change between palettes. The accent colour carries action, selection and streaks.

**Key Characteristics:**
- Flat panels on a tinted page, separated by 1px lines instead of shadows.
- One sans family for everything; a serif only for long-form lesson reading.
- 44px minimum touch targets, 64px for test answers.
- Colour never carries meaning alone: correct, wrong and error pair colour with text.
- One main action per screen. Everything else is secondary.
- Phone first. Content width tops out at 1120px.

## Colors

Cool, restrained neutrals with one accent per palette. Lagoon (teal-blue) is the default.

### Primary
- **Lagoon Teal** (#0E7490): action, links, selection, brand mark, progress. In dark mode the text accent lightens (lagoon #5DD3EE) while the filled-button colour stays the deep one. Text on filled accent uses `on-accent` (white) in both modes.

### Palette accents (light / dark text accent)
- **Indigo** #2B5CE6 / #8FA8FF
- **Ember** #C2410C / #FF9B78
- **Orchid** #7E3FC4 / #C19BEA
- **Graphite** #334155 / #A9B9D2

### Neutral
- **Deep Navy Ink** (#17324D): body text and headings.
- **Slate Muted** (#5B7185): secondary text, captions, scores.
- **Cool Paper** (#F5F9FC): page background.
- **White Surface** (#FFFFFF): panels, topbar, dialogs.
- **Mist Line** (#E3EDF3): borders and dividers of panels and cards.
- **Control Line** (60% ink mixed into surface): borders of things you press or type in, so they reach 3:1 against both paper and surface. Used on inputs, answer options, secondary buttons, icon buttons, switches and pickers.
- **Scrim** (55% black): behind dialogs.

### Feedback
- **Correct Green** (#047857) on **Correct Tint** (#ECFDF5).
- **Amber Wrong** (#A16207) on **Wrong Tint** (#FFFBEB). A wrong answer is amber, not red, so a mistake feels like a hint.
- **Error Rose** (#BE123C) on **Error Tint** (#FFF1F2): system and form errors only.
- **Dark mode** has its own lighter feedback set, shared by all five palettes: correct #5EE0A8 on #12372C, wrong #F5C04A on #3B3014, error #FF8FA8 on #43202B. Text on the amber danger fill is dark (#2A1D00), not white.

### Named Rules
**The Token Only Rule.** No colour literal outside `tokens.css` and `Avatar.jsx`. Every screen must work in all 10 palette and mode combinations.
**The Soft Wrong Rule.** Wrong answers use amber, never error red. Red is for failures of the system.
**The Accent Is Action Rule.** Accent marks what can be pressed, what is selected, and progress. It is not decoration.
**The Control Line Rule.** Panels get the faint line. Anything interactive gets the control line.

## Typography

**Display, Body and Label Font:** Schibsted Grotesk (with sans-serif)
**Reading Font:** Source Serif 4 (with Georgia, serif), through the `--serif` token. Used for lesson text and the lesson header.

**Character:** A friendly grotesk with tight headings and an easy body. The serif brings a textbook feel to long reading.

### Hierarchy
- **Display** (600, clamp(2rem, 5vw, 2.75rem), 1.1): page titles.
- **Headline** (600, 1.75rem, 1.2): section titles.
- **Title** (600, 1.125rem, 1.35): card and lesson titles, feedback headings.
- **Reading** (400, 1.15rem, 1.75, serif): lesson explanations, max 68ch.
- **Body** (400, 1rem, 1.5): all running text.
- **Question** (600, 1.25rem, 1.4): the question on the test screen. It is the strongest text there.
- **Label** (600, 0.875rem): badges, streak count, small buttons; muted captions and legends use 0.875rem at 400.

Headings balance their wrapping (`text-wrap: balance`). Lesson text uses `text-wrap: pretty`. Only the 400 weight of the serif is loaded, so bold inside lesson text may not show as bold.

### Named Rules
**The One Family Rule.** Do not add a second sans family. The serif is for long lesson reading only.

## Layout

Single column on phones, centred container on desktop (page 1120px, content 1050px, reading column 68ch, side padding 1rem). The topbar is sticky and 64px tall. Below 360px the topbar tightens (8px side padding, 4px gaps) and its buttons never shrink below 44px. Panels use fluid padding, for example `clamp(1.25rem, 4vw, 1.75rem)` on question cards. Spacing steps are rem-based: 0.5, 0.75, 1, 1.5. Breakpoints in use: 340px, 360px, 640px, 1024px. Design and check at 320, 360, 390, 768 and 1280px.

A lesson reads top to bottom: title, a muted line (unit and lesson number, Completed badge), the explanation, then Practice, Flashcards, Materials, Mark as done, and finally Next lesson.

## Elevation & Depth

Flat by default. Depth comes from the paper-to-white tonal step and 1px Mist Line borders. One shadow exists, for floating menus only.

### Shadow Vocabulary
- **Menu lift** (`box-shadow: 0 8px 24px rgb(27 36 48 / 6%)`): profile and notification panels.
- **Selected ring** (`box-shadow: 0 0 0 3px` accent at 22% light, 35% dark): the chosen palette or avatar card in Settings.

### Focus
Keyboard focus is a solid 2px accent outline with a 2px offset, on buttons, links, inputs, selects and textareas. Headings that take focus programmatically (to move screen readers) show no ring.

### Named Rules
**The Flat Until Floating Rule.** Panels never carry a shadow. Only things that float above the page do.

## Shapes

Soft rectangles. Controls use 8px corners, panels 14px, badges, switches and the deck bar are full pills, avatars and the profile button are circles. Panel borders are 1px. Test answer options and feedback panels use 2px borders. Answer-state bars use a 3px left border.

## Components

### Buttons
- **Shape:** 8px corners, 44px minimum height, 600 weight.
- **Primary:** filled accent-button, `on-accent` text. One per screen.
- **Secondary:** white with Control Line border, ink text.
- **Danger:** amber fill (the wrong colour) with `on-wrong` text, used in confirm dialogs.
- **Disabled:** 55% opacity, not-allowed cursor.
- **Focus:** 2px accent outline.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** white surface with 1px Mist Line border.
- **Shadow Strategy:** none.
- **Internal Padding:** 1.25rem to 1.75rem, fluid.

### Test answers and feedback
- **Answer option:** 64px minimum, 8px corners, 2px Control Line border. Selected uses an accent border. After checking, the right option gets a green border and the chosen wrong one an amber border.
- **Feedback panel:** tinted background (correct or wrong tint), 2px border in the state colour, heading in the state colour at 1.125rem ("Correct" or "Not quite"), then the correct answer and the explanation in ink.
- **Question text:** the strongest text on the screen; "Choose an answer" is a quiet 0.875rem muted label.

### Lesson row action
- **Test row:** a card-like row with the test title and a muted line ("2 questions · Not taken yet"), and an action at the end: "Start" or "Retake". The action is a secondary-looking bordered label, or the primary fill when it is the lesson's main next step.

### Deck summary
- **Style:** "N cards", then a thin 0.5rem pill bar split into Confident, Unsure, Don't know and Not rated yet segments, then a legend with the counts. The bar is decoration; the legend carries the numbers.

### Flashcard ratings
- **Style:** three equal buttons in one row, icon above label, 64px tall, colour per rating (Confident green, Unsure amber, Don't know accent), with a one-line hint underneath.

### Loading skeleton
- **Style:** a title bar and three text lines in Mist Line, no animation. Announced to screen readers as "Loading lesson".

### Status badge
- **Style:** 0.75rem, 600, pill, 1px currentColor border. Published uses correct green, draft uses muted.

### Switch
- **Style:** 40px pill track in Control Line, 18px thumb, moves 16px in 160ms. On state fills with accent-button.

### Navigation
- **Style:** sticky 64px white topbar with brand mark (32px accent square, 8px corners), streak indicator, notification and profile menus, theme toggle. All icon buttons are 44px with a 1px Control Line border.

### Dialogs
- **Style:** native `dialog`, 14px corners, 480px max width, scrim backdrop, actions right-aligned.

## Do's and Don'ts

### Do:
- **Do** use the tokens in `tokens.css` for every colour, and test new screens in all five palettes and both modes.
- **Do** make sure every `var(--name)` you write exists. An undefined token fails silently.
- **Do** keep 44px minimum touch targets.
- **Do** give each screen one primary action.
- **Do** pair feedback colour with words or an icon.
- **Do** keep text at 4.5:1 contrast against its background (WCAG 2.1 AA, per PRODUCT.md), and controls and borders of controls at 3:1.
- **Do** respect `prefers-reduced-motion`; transitions are 160 to 250ms ease.

### Don't:
- **Don't** hard-code a colour.
- **Don't** put white text on a filled accent by using `--surface`; use `--on-accent`.
- **Don't** add shadows to panels.
- **Don't** use error red for a wrong answer.
- **Don't** add a second sans font family.
- **Don't** let a nested element pick up a parent's colour rule by accident (scope with `>`).

## Owner direction not yet in code

The owner wants a softer, friendlier feel than the current flat build, and a more notebook-like lesson page. The lesson hub was kept plain on purpose in the last pass ("clarity first"). Any softening (rounder corners, gentle card shadow, a formula callout, a margin rule) is a change to make deliberately, then re-run `/impeccable document`.
