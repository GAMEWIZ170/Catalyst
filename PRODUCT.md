# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students in Ghana who want to study their own course material outside the classroom. They bring lecture slides, PDFs, pasted notes or just a topic name, and want a guided way through it before tests and exams. Phones and laptops get equal weight. Data is expensive and connections drop, so many study sessions happen on a phone with little or no signal.

The closed beta is about 20 university students. It opens when the owner feels ready. One admin (the owner) keeps users, reports and analytics.

## Product Purpose

Catalyst is an AI study companion. A student gives it their own material and gets back a study set: a mini course of units and lessons, each with notes, flashcards and a quick check, plus unit quizzes and a whole-set test. A tutor answers questions from the student's own notes.

Success: students pass their courses and come back daily.

## Positioning

Free alternatives (YouTube, WhatsApp study groups, past-question PDFs) give students content but not a path through it. General chatbots answer questions but do not track what the student knows. Catalyst turns the student's own material into an ordered path, grades on the server, tracks mastery per unit, and brings cards back when they are due (FSRS spaced repetition). It is priced for students (target about 50 cedis a month after the beta) and works offline once a set is saved.

## Operating Context

- **Structure:** study set > unit > lesson. A lesson runs notes, then flashcards, then a quick check. Units have a quiz; the set has a test.
- **Build flow:** upload or paste, then the AI reads the source, writes an outline, then builds one lesson at a time. Each lesson opens as soon as it is ready. Scanned PDFs work less well.
- **Mastery:** per unit, Not started, Familiar, Proficient, Mastered, driven by quiz results. Mistakes become review cards.
- **Flashcards:** three rating tiles (Again, Hard, Good) with fixed positions and keys 1 to 3, each showing its next review time. A thumbs-down reports a bad card so it can be fixed.
- **Tutor:** guided (hint first) by default, with a visible "Just explain" switch. Daily turn cap.
- **Streak:** counts UTC days. Forgiving: one free rest day a week, a lost streak can be earned back, never paid, no guilt notifications.
- **Offline:** a set is saved to the device after it is built. Notes, flashcards and quizzes work offline. AI and editing need internet.
- **Sharing:** share a set by link; others can copy it.
- **Science:** formulas render with KaTeX and mhchem. Any subject works; science gets the extra tools.

## Capabilities and Constraints

- Frontend: React and Vite. Moving from plain CSS and Astryx to Tailwind v4 and shadcn/ui, screen by screen (see `docs/redesign/DESIGN_RESET_PLAN.md`). One brand palette, light and dark.
- AI: Gemini, free tier only until production. No paid model until students pay. Google may use free-tier inputs to improve its products; the privacy page and the upload screen must say so plainly, and beta testers must agree to it.
- Every student has a daily AI cap, and the platform has one too. AI cost is logged per student.
- Grading is server-side only. Students never see the correct answer or explanation before they answer.
- Payments are not built. Beta is free. Price is set after the beta: at least cost per paying user ÷ 0.6.
- Hidden for now, code kept: the admin-written course catalog and editors, circles, friends, challenges, boards, community shelf, XP and levels. Achievements return later with badge images (phase 7). XP and levels stay hidden.
- Later, not in beta: simulations library, exam countdown plan, photo of notes, YouTube links, live lecture capture, audio recaps, public library.

## Brand Commitments

- Name: Catalyst. No logo or mascot yet. The mascot is deferred until after the beta.
- Brand colour: gold, chosen on 18 November 2026. It nods to Ghana and stands apart from StudyFetch's lime and Quizlet's blue.
- Voice: plain, warm and short. No guilt, no pressure, no hype.
- Money promises: no ads, core study modes stay free, cancelling is easy. These answer the top complaints about Quizlet, StudyFetch and Knowt.
- Main visual reference: StudyFetch, shots in `docs/expansion/references/`.

## Evidence on Hand

No real testimonials, student counts or results exist. Do not invent them.

## Product Principles

1. Cheap to use: light on data and effort, works on phones and offline.
2. Honest grading: students never see answers before they answer.
3. One clear next step on every screen, such as "Continue" or "12 due".
4. The student's own material is the source of truth. The AI never invents beyond it without saying so.
5. Kind habits: streaks and reminders encourage and never punish.

## Accessibility & Inclusion

Every interactive control works by keyboard and has a label (project rule). Layouts are checked at 320, 360, 390, 768 and 1280 px in light and dark. The required standard is WCAG 2.1 AA (confirmed by the owner), including text contrast of at least 4.5:1 in both modes. Motion respects reduced-motion settings.
