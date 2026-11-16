
# Catalyst UI polish brief

For Claude Code. Read this, then CLAUDE.md, PRODUCT.md and DESIGN.md. The owner is not a frontend developer and trusts you to make the design calls. He knows what he dislikes when he sees it. Explain your choices in plain words.

Branch: `feature/astryx-trial` (Astryx and React 19 are already in). Do **one numbered step per session**, make one commit per step, and stop at every **OWNER DECIDES**.

## Owner's verdict on the current UI

"It does not look professional. It looks like a 2000s website. It lacks taste, finesse and smoothness. Too many forms, too few interactive controls." Fix the whole app, not only the screens listed here.

## Reference material (in this folder)

- `design/screens/before-2026-11-15/`: the current screens, numbered. These are the problems.
- `design/screens/astryx-trial/study-lab-list.png`: the Study Lab list after the Astryx rebuild. Better, but not finished (see step 2).
- `design/references/studyfetch/`: StudyFetch's uploads status panel (tabs All, Processing, Ready, Issue, friendly empty state). Match this level of finish for the AI generation flow.
- `design/references/github/`: the GitHub header search bar, if the owner has added `github-search-bar.png`. Otherwise follow the spec in step 1.

## Interaction rules (copy these into CLAUDE.md in step 0)

1. **Minimize forms, maximize interactive UI.** Never leave a form open on a page.
2. **Create first, edit in place.** A "New X" button creates X with defaults at once, with its title already in edit mode. Autosave everywhere. No Save buttons, except in dialogs that need confirmation.
3. **Choose, don't type.** A fixed set of options uses chips, segmented controls, icon cards, switches, steppers or pickers. Never a native select or a bare text box.
4. **Type only for real writing** (notes, card text, AI prompts), and edit it inline.
5. **Destructive actions** live in a "⋯" menu, with an undo toast or a confirmation dialog.
6. **Cap content width** at about 760 to 900 px, centred. Inputs never stretch across the screen.
7. **No big bordered card around every section.** Use spacing and headings. Cards are for clickable items.
8. **At most one short line of helper text per section.** Hints go in tooltips.
9. **Motion:** dialogs and popovers scale and fade from their trigger (150 to 200 ms, ease-out), tabs get a sliding underline, skeletons crossfade into content, and reduced motion is respected.
10. **No stray scrollbar arrows beside tab bars** (visible in the before screens). Tabs never overflow at 390 or 1280 px.

## Removed feature

**Study Hall is cut.** Delete its route, nav link, timer link, backend endpoints and events. Do not hide it. (Screenshot 09 is the old page.)

## Steps

**0. Rules.** Add the interaction rules above to CLAUDE.md. Then audit every screen against them and write `design/FORMS_AUDIT.md` (screen, violation, proposed replacement). **OWNER DECIDES** before any code changes.

**1. GitHub-style search.**
- Replace the top-bar search icon with a compact field (about 320 px wide, 34 px tall, rounded, subtle border): magnifier icon on the left, placeholder "Search lessons and pages", a small `/` key chip on the right.
- `/` and Ctrl+K focus it (never while typing in another input).
- When focused or typing (200 ms debounce, 2 letters minimum), a results panel opens under the field. It groups results by heading (Lessons first, then Pages such as Settings, Friends, Study Lab), shows recent searches when empty, and has a "See all results" link. Use the existing lesson search API. No backend work yet.
- Arrows move, Enter opens, Esc closes and returns focus. Proper combobox accessibility.
- Under 640 px: an icon that opens a full-screen search.
- The old Search page (screenshot 11) becomes the "See all results" page, without the huge stretched input.

**2. Study Lab, AI-first (like StudyFetch).**
- List: a grid of set cards (2 to 3 per row, showing last studied and counts), a compact search, and an empty state like "Drop in your notes or a PDF and let AI build a set." Move Privacy and Terms into a quiet footer.
- New set: one step, a styled drop zone plus a "paste text" option. No title, topic or course fields. The AI names the set; the title, topic and course are editable by clicking.
- Processing: a status panel with tabs All, Processing, Ready, Issue (see the StudyFetch reference), a friendly empty state, and a calm progress state the student can leave.
- Review: the AI drafts (notes, flashcards, quiz) in a list. The student edits or deletes each, then saves. If AI is unavailable, offer "Start empty".

**3. Study set page.**
- Tabs: Notes, Flashcards, Quizzes only. Remove the AI tab.
- Each tab shows content first, with a small "Generate more" and "Add" that create in place (rule 2).
- Flashcards: "Add card" creates a blank card that opens in edit mode. Cards can be reordered by dragging. No Front/Back form.
- Quizzes: "New quiz" creates "Untitled quiz" and puts it in rename mode. Question types are chosen from icon cards.
- Title: click to rename. Delete lives in a "⋯" menu with an undo toast.
- The study companion is a floating chat button that opens a side panel.
- Notes: the toolbar is attached to the top of the editor and sticky. Save state is small muted text ("Saved" or "Saving…"), never orange. The LaTeX hint goes into the Σ button's tooltip.
- Source material: an "Add source" button opens a dialog with a drop zone (no native file input and no checkbox maze; one short line for the usage terms).

**4. Top bar and shell.**
- Icon buttons 36 to 40 px, borderless ghost style. The timer shows as a pill with the time left while running.
- Focus timer popover: a big monospace countdown, preset chips (15, 25, 50, 90 and Custom), one Start button, and a gear for lengths. Remove the "Study Hall" link.
- Fix the avatar in the top-right: it must show the student's chosen avatar artwork (it showed a thin line drawing after the Astryx rebuild).

**5. Settings, Friends, Me.**
- Settings rows: label and help on the left, control on the right. Text edits in place and autosaves, checkboxes become switches, and there are no Save buttons (screenshot 08).
- Friends: your code as a chip with copy and share icons. "Add friend" opens a small popover with the code field. The friends list comes first (screenshot 07).
- Me: a compact header (avatar, name, level bar inline), then one grouped list with dividers for Progress, Exams and Friends (screenshot 06).
- Exams: a calendar picker with quick chips ("Tomorrow", "In a week").

**6. Admin.** Catalog and Courses (screenshots 14 and 15): "Add category" and "Add author" create a row already in edit mode. Remove the big bordered cards, keep the tab bar clean, and keep the "More" menu.

**7. Learning screens.** Home, flashcard review and tests (screenshots 12, 13 and 16). Tighten the layout, align the Continue card with the courses grid, make the notification popover and profile menu match the new component style, and polish the card flip and the 1/2/3 rating buttons.

## Palette and theme (OWNER DECIDES)

The Astryx neutral theme turned the accent cyan and dropped our five palettes (lagoon, indigo, ember, orchid, graphite). Ask the owner: keep Astryx's look, or map our palettes onto Astryx's theme tokens. Until he answers, do not change colours any further.

## How to work

- Use frontend-design to build and Impeccable to critique and polish. Also use emil-design-eng, make-interfaces-feel-better and improve-animations, plus unslop if installed. If ui-ux-pro-max is installed, use it only as a checklist for UX and accessibility rules, never for its Tailwind code.
- Use Astryx components wherever Astryx has one. Do not write custom CSS for something Astryx already provides.
- Check at 390 and 1280 px, dark and light.
- Take before and after screenshots and show the owner 3 to 4 pairs per step. Save them in `design/screens/` (never commit screenshots).
- Report in caveman mode: commits, CHECK lines, NOT RUN, OWNER DECIDES. Then stop.
