# Catalyst UI diagnosis (Phase 0)

Source: baseline screenshots (320, 360, 390, 768, 1280 px, light and dark, lagoon palette) of every student route, plus a read of `global.css` and `tokens.css`. Screenshots are in `design/screens/baseline/` (not in git).

`npx impeccable detect` on `frontend/src` and on `/login` printed no findings. The source scan is regex-only, so it undercounts. The page scan covered only the login page. Treat both as "no automatic findings", not as "clean".

## Problems that really apply

1. **Too many type sizes.** `global.css` uses 17 different `font-size` values (0.75, 0.8, 0.875, 1, 1.125, 1.15, 1.2, 1.25, 1.35, 1.5, 1.75, 1.8, 2.5, 2.75, 5 rem, a `clamp`, and `16px`). The plan allows 7. Example: every screen, headings and meta lines.
2. **Button text breaks mid-word.** The "Start" button on a lesson test row wraps to "Sta / rt" at 390 px. Screen: `lesson-390-light.png`.
3. **Formula panel clips on phones.** A long formula is cut off at the right edge ("Ca(H2PO4") instead of scrolling inside its panel. Screen: `lesson-390-light.png`.
4. **Lesson page has no structure.** One column on the left, an empty right half, no lesson sidebar, no previous/next, no clear next action. The test sits in a small "Practice" box at the bottom. Screen: `lesson-1280-light.png`.
5. **Video loads on page open.** The YouTube iframe loads straight away (title bar, channel, overlays). The plan wants a thumbnail and play button, loaded on tap. This matters on limited data. Screen: `lesson-1280-light.png`.
6. **Mixed fonts in lesson text.** Body text is set in a serif (KaTeX font) while headings and UI are sans. Prose and formulas should be told apart, not blended. Screen: `lesson-1280-light.png`.
7. **Course list is a table of boxes.** Each course is a bordered row led by the raw course code ("B2-1793459673006", wrapping over 2 to 4 lines). The code should be secondary. The "How Catalyst works" panel pushes the list down. Screen: `courses-1280-dark.png`.
8. **Boxes around everything.** Bordered cards for the welcome panel, each lesson, each test, each icon button. "Cards inside cards" appears in the outline header (progress bar inside a card, button inside it). Screen: `outline-390-dark.png`.
9. **Outline is one card per lesson, with loud pills.** "Up next" and "Not started" are bordered pills repeated on every row, and "1 test", "Video" are separate floating labels. A quiet status icon plus one meta line would read faster. The "Unit tests" block leaves large empty gaps. Screen: `outline-390-dark.png`.
10. **Flashcard screen is weak.** The progress bar is 3 px high and has "Card 1 of 6" under it, the redundant "Flashcard 1" label repeats it, and the card is not a large centred focus. Screen: `flashcards-390-light.png`.
11. **Top bar is busy.** Two bordered square icon buttons (mail, theme) plus a flame streak and an avatar, all at different visual weights. The flame is on the banned list. Screen: any page.
12. **Filler footer.** "Keep learning with momentum." shows on every page and adds nothing. Screen: any page.
13. **Palettes change paper and ink, not only the accent.** Lagoon light is blue-grey paper, dark mode is navy. The plan wants warm neutrals shared by all palettes. Screen: all.
14. **Login page is plain but sound.** Centred card, labels above inputs, one button. Missing: one value line and a quieter heading size. Low priority. Screen: `login-1280-light.png`.

## Not seen yet (NOT RUN)

- Test questions, feedback panel and results (the baseline stops at the test intro screen).
- Flashcard card after reveal and the end summary.
- Progress page and settings were captured but not reviewed one by one.
- Colour contrast in the other four palettes.

## Notes on the owner's references (`design/references/`)

The owner gave four images and no notes. This is my reading, to be confirmed.

- **Quizerr quiz screen (purple mobile quiz).** Take: one question at a time, thin progress bar, large full-width answer rows, selected row tinted with a check, one big button at the bottom. Do not take: purple gradients, glow, leaderboard, mascot avatar. Those are banned in the brief.
- **Udemy trending courses.** Take: clean cards with one thin border, a quiet meta line, small inline badges that hug their text, a clear price or status at the bottom, strong heading size contrast. Maps to the course list.
- **Study-plan screens (dark, two images).** Take: a vertical timeline with status dots, expandable unit rows with a quiet "1 topic" count on the right, and side panels for summary numbers. Maps to the course outline.

## Data note

`catalyst_test` already holds old verification courses (B2, B3, F, M, MAT, R3, VAL, CLN). They show in the student course list. I did not create or delete them.
