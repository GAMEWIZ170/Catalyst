---
name: Catalyst
description: Calm study-desk and lab-notebook interface for University of Ghana students, themed by five palettes and two modes.
colors:
  ink: "#17324D"
  muted: "#5B7185"
  paper: "#F5F9FC"
  surface: "#FFFFFF"
  line: "#E3EDF3"
  accent: "#0E7490"
  accent-button: "#0E7490"
  correct: "#047857"
  correct-tint: "#ECFDF5"
  wrong: "#A16207"
  wrong-tint: "#FFFBEB"
  error: "#BE123C"
  error-tint: "#FFF1F2"
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
    textColor: "{colors.surface}"
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
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "0.75rem"
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
- 44px minimum touch targets, 52px for answer choices.
- Colour never carries meaning alone: correct, wrong and error pair colour with text.
- Phone first. Content width tops out at 1120px.

## Colors

Cool, restrained neutrals with one accent per palette. Lagoon (teal-blue) is the default.

### Primary
- **Lagoon Teal** (#0E7490): action, links, selection, brand mark, progress. In dark mode the text accent lightens (lagoon #5DD3EE) while the filled-button colour stays the deep one, so white button text stays readable.

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
- **Mist Line** (#E3EDF3): every border and divider.

### Feedback
- **Correct Green** (#047857) on **Correct Tint** (#ECFDF5).
- **Amber Wrong** (#A16207) on **Wrong Tint** (#FFFBEB). A wrong answer is amber, not red, so a mistake feels like a hint.
- **Error Rose** (#BE123C) on **Error Tint** (#FFF1F2): system and form errors only.

### Named Rules
**The Token Only Rule.** No colour literal outside `tokens.css` and `Avatar.jsx`. Every screen must work in all 10 palette and mode combinations.
**The Soft Wrong Rule.** Wrong answers use amber, never error red. Red is for failures of the system.
**The Accent Is Action Rule.** Accent marks what can be pressed, what is selected, and progress. It is not decoration.

## Typography

**Display, Body and Label Font:** Schibsted Grotesk (with sans-serif)
**Reading Font:** Source Serif 4 (with serif), used in one place for lesson text.

**Character:** A friendly grotesk with tight headings and an easy body. The serif brings a textbook feel to long reading.

### Hierarchy
- **Display** (600, clamp(2rem, 5vw, 2.75rem), 1.1): page titles.
- **Headline** (600, 1.75rem, 1.2): section titles.
- **Title** (600, 1.125rem, 1.35): card and lesson titles.
- **Body** (400, 1rem, 1.5): all running text.
- **Label** (600, 0.875rem): badges, streak count, small buttons; muted captions use 0.875rem at 400.

### Named Rules
**The One Family Rule.** Do not add a second sans family. The serif is for long lesson reading only.

## Layout

Single column on phones, centred container on desktop (page 1120px, content 1050px, side padding 1rem). The topbar is sticky and 64px tall. Panels use fluid padding, for example `clamp(1.25rem, 4vw, 1.75rem)` on question cards. Spacing steps are rem-based: 0.5, 0.75, 1, 1.5. Breakpoints in use: 340px, 640px, 1024px. Design and check at 320, 360, 390, 768 and 1280px.

## Elevation & Depth

Flat by default. Depth comes from the paper-to-white tonal step and 1px Mist Line borders. One shadow exists, for floating menus only.

### Shadow Vocabulary
- **Menu lift** (`box-shadow: 0 8px 24px rgb(27 36 48 / 6%)`): profile and notification panels.
- **Focus ring** (`box-shadow: 0 0 0 3px` accent at 22% light, 35% dark): keyboard focus on buttons, links, inputs, selects.

### Named Rules
**The Flat Until Floating Rule.** Panels never carry a shadow. Only things that float above the page do.

## Shapes

Soft rectangles. Controls use 8px corners, panels 14px, badges and switches are full pills, avatars and the profile button are circles. Borders are always 1px. Answer-state bars use a 3px left border.

## Components

### Buttons
- **Shape:** 8px corners, 44px minimum height, 600 weight.
- **Primary:** filled accent-button, white text.
- **Secondary:** white with Mist Line border, ink text.
- **Danger:** amber fill (the wrong colour) with white text, used in confirm dialogs.
- **Disabled:** 55% opacity, not-allowed cursor.
- **Focus:** 3px accent ring.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** white surface with 1px Mist Line border.
- **Shadow Strategy:** none.
- **Internal Padding:** 1.25rem to 1.75rem, fluid.

### Answer choices
- **Style:** 52px row, 8px corners, 1px border. Selected state uses an accent border and light accent tint.
- **Result:** correct and wrong states show a tinted panel with a 3px left bar and text.

### Status badge
- **Style:** 0.75rem, 600, pill, 1px currentColor border. Published uses correct green, draft uses muted.

### Switch
- **Style:** 40px pill track, 18px thumb, moves 16px in 160ms. On state fills with accent-button.

### Navigation
- **Style:** sticky 64px white topbar with brand mark (32px accent square, 8px corners), streak indicator, notification and profile menus, theme toggle. All icon buttons are 44px with a 1px border.

### Dialogs
- **Style:** native `dialog`, 14px corners, 480px max width, 55% black backdrop, actions right-aligned.

## Do's and Don'ts

### Do:
- **Do** use the tokens in `tokens.css` for every colour, and test new screens in all five palettes and both modes.
- **Do** keep 44px minimum touch targets.
- **Do** pair feedback colour with words or an icon.
- **Do** keep text at 4.5:1 contrast against its background (WCAG 2.1 AA, per PRODUCT.md).
- **Do** respect `prefers-reduced-motion`; transitions are 160 to 250ms ease.

### Don't:
- **Don't** hard-code a colour. `.choice.selected` currently uses `rgb(43 92 230 / 8%)`, which is indigo and breaks the other four palettes.
- **Don't** add shadows to panels.
- **Don't** use error red for a wrong answer.
- **Don't** add a second sans font family.

## Owner direction not yet in code

The owner wants a softer, friendlier feel than the current flat build. Today's system is flat with gently rounded corners. Any softening (rounder corners, gentle card shadow, warmer feedback) is a change to make deliberately, then re-run `/impeccable document`.
