# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University of Ghana students who want a platform to enhance their study outside the classroom. A Duolingo-style learning experience: structured, and at your own pace. They study on a mix of phones and laptops. One admin (the owner) writes all content through an in-app builder (for now).

## Product Purpose

Success: students pass their courses and come back daily.


## Positioning

Structured, graded courses for the University of Ghana syllabus, at a price students can afford. The first course is CHEM113, and more subjects will follow.

Free alternatives (YouTube, WhatsApp study groups, past-question PDFs) give students content but not a path through it. Catalyst gives them an ordered course, tests graded by the server, and tracked progress with streaks.
## Operating Context

Structure is course > unit > lesson. Tests belong to a lesson, a unit or a course. A lesson completes by passing its test, finishing a flashcard deck, or Mark as done. Streaks count UTC days. Grading is server-side only. Formulas render with KaTeX and mhchem.

## Capabilities and Constraints

- Frontend: React and Vite, plain CSS with tokens, five palettes (lagoon, indigo, ember, orchid, graphite), light and dark themes.
- Payments and subscriptions are not built. Pricing is manual or undecided.
- Only the first course (CHEM113) exists.

## Brand Commitments

Name: Catalyst. No logo or other brand assets exist yet. The five palettes are the only visual commitment.

## Evidence on Hand

No real testimonials, student counts or results exist. Do not invent them.

## Product Principles

1. Cheap to use: light on data and effort, works on phones.
2. Honest grading: students never see answers before they answer.
3. One clear next step in every lesson.
4. The admin builder is as important as the student screens.

## Accessibility & Inclusion

Every interactive control works by keyboard and has a label (project rule). Layouts are checked at 320 to 1280 px in all palettes and both modes. The required standard is WCAG 2.1 AA (confirmed by the owner), including text contrast of at least 4.5:1 in every palette and mode.
