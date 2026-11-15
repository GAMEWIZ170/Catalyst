# Forms audit (UI polish step 0)

Checked against the ten interaction rules in `CLAUDE.md`. Source: a read of every page and shared component in `frontend/src`, plus the screenshots in `UI_polish/screens/before-2026-11-15/`. Nothing here has been changed yet. NOT RUN: a live walk of every screen at 390 and 1280 px (only the Study Lab screens were seen live this session).

Rule numbers: 1 minimise forms, 2 create first and autosave, 3 choose don't type, 4 type only for real writing, 5 destructive in ⋯, 6 cap width, 7 no big card per section, 8 one helper line, 9 motion, 10 no tab-bar scroll arrows.

## A. Whole-app problems (fix once, in shared code)

| Where | Violation | Proposed replacement |
|---|---|---|
| `components/ui/Field.jsx` (`SelectField`, used on about 25 screens) | Native `<select>` everywhere (rule 3) | Astryx `Selector` for long lists; `SegmentedControl` or chips for 2 to 5 fixed options |
| `components/ui/Field.jsx` (`Checkbox`, `Radio`) | Checkboxes and radio lists for on/off choices (rule 3) | Astryx `Switch` for on/off, `SegmentedControl` or chip group for one-of-many |
| `components/ui/Tabs.jsx` and the tab bars (before screens 02 to 05, 15) | Overflow arrows beside the tab bar (rule 10); no sliding underline (rule 9) | Astryx `TabList` (already used on the set page), sized so it never overflows at 390 and 1280 |
| `components/ui/Dialog.jsx`, `ConfirmDialog`, popovers (timer, notifications, profile menu) | Old dialogs and popovers, no scale-and-fade from the trigger (rule 9) | Astryx `Dialog`, `Popover`, `DropdownMenu`; reduced motion respected |
| `components/admin/InlineRename.jsx` | Rename shows a text box plus Save/Cancel buttons (rule 2) | Click-to-edit title, Enter or blur saves, Esc cancels |
| Pages in general (`.content`, `.student-page`) | Content stretches across the screen (rule 6) | One centred container, 760 to 900 px, for forms and reading screens |
| `components/ui/Card.jsx` use across `Settings`, `Me`, `Friends`, `Exams`, admin pages | A bordered card around every section (rule 7) | Headings and spacing; cards only for clickable items |
| `.muted` helper paragraphs under headings and fields | Several lines of helper text per section (rule 8) | One short line, the rest into tooltips (`InfoTip`) |

## B. Student screens

| Screen | Violation | Proposed replacement |
|---|---|---|
| Study Lab list (`Lab.jsx`) | Done in the Astryx rebuild: no forms, grid of cards. Still to do: last studied on cards, AI drop zone empty state, quiet footer (step 2) | Step 2 |
| New set dialog (`NewSetDialog.jsx`) | Title field, plus topic, course and description behind a fold (rules 1, 4) | One drop zone and a "paste text" option. AI names the set; title, topic and course edit in place (step 2) |
| Set page, AI panel (`AiDrafts.jsx`, `Companion.jsx`) | Two always-open selects (Make, From), a text area and a Make button; companion is a big inline panel (rules 1, 3, 7) | Move to the generation flow and a floating chat button with a side panel (steps 2 and 3) |
| Set page, Notes (`SetNotes.jsx`, `SetMaterials.jsx`) | Orange "Saved" text, LaTeX hint line, a source-material form with a native file input and a rights checkbox (rules 1, 8) | Sticky toolbar, muted save state, hint in the Σ tooltip, "Add source" dialog with a drop zone and one terms line (step 3) |
| Set page, Flashcards (`SetCards.jsx`) | Front/Back form always open (rules 1, 2) | "Add card" creates a blank card in edit mode; drag to reorder (step 3) |
| Set page, Quizzes (`SetQuizzes.jsx`, `LabQuiz.jsx`) | Title text box, question Type and "The answer is" as selects, option text boxes and Add option, Save and Delete buttons (rules 1, 2, 3, 5) | "New quiz" creates "Untitled quiz" in rename mode; type chosen from icon cards; correct answer picked by tapping the option; Delete in ⋯ with undo (step 3) |
| Set sharing (`SetSharing.jsx`) | Select plus checkbox plus Save sharing button, inside a dialog (rules 2, 3) | Segmented control (Only me, Link, Community) that saves on change; the rights line as the confirmation step only for Community |
| Study Hall (`Hall.jsx`, nav link, timer link) | Feature is cut | Delete route, nav link, timer link, backend endpoints and events (decide the order in step 4) |
| Focus timer popover (`TimerMenu.jsx`) | Minute text box and settings form (rules 1, 3) | Preset chips 15, 25, 50, 90 and Custom, one Start button, gear for lengths (step 4) |
| Me (`Me.jsx`) | Big stacked cards for Progress, Exams, Friends (rule 7) | Compact header and one grouped list (step 5) |
| Settings (`Settings.jsx`, `QuickSettings.jsx`) | 5 selects (time zone, weekly goal, text size and others), 4 checkboxes, 6 radios, 2 Save buttons (rules 1, 2, 3) | Rows with the control on the right: switches, segmented controls, a time-zone picker; everything autosaves; no Save buttons (step 5) |
| Account section (`AccountSection.jsx`) | Eight password and email fields always open, two submit buttons, Type DELETE box (rules 1, 5) | Each action behind a row button that opens a small dialog; Delete account in a ⋯ or danger row with a confirmation dialog (step 5) |
| Friends (`Friends.jsx`) | Three text fields, two checkboxes, two submit buttons always open (rules 1, 3) | Code chip with copy and share icons; "Add friend" popover; switches for sharing (step 5) |
| Exams (`Exams.jsx`) | Five selects, two text fields and an Add exam form (rules 1, 3) | Calendar picker with chips "Tomorrow" and "In a week"; type as chips; course as a picker; Delete in ⋯ (step 5) |
| Onboarding (`Onboarding.jsx`) | Exam date text field | Same calendar picker and chips |
| Circles (`Circles.jsx`) | Five selects, two text fields, two submit buttons | Create-first "New circle" with in-place edit; pickers for the fixed options |
| Community, Topics (`Community.jsx`, `Topics.jsx`, `CommunitySet.jsx`) | 7 to 9 selects each for filters (Year, Source, Course, Category, Sort, Pages) (rule 3) | Filter chips and one "Sort" segmented control; no Pages selector (infinite load or simple pager) |
| Lesson page (`Lesson.jsx`) | Private note text area with a Save note button; "Next steps" select (rules 2, 3) | Note autosaves with a small "Saved" state; next steps as chips |
| Search page (`Search.jsx`) | Huge stretched search input (rule 6) | Becomes "See all results" under the new header search (step 1) |
| Test, exam, flashcards (`Test.jsx`, `Exam.jsx`, `Flashcards.jsx`) | Answer inputs are the interaction (not a violation). Check the 1/2/3 rating buttons and card flip for motion (rule 9) | Polish only, step 7 |
| Login, Register, Forgot, Reset (`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`) | Real forms, and they are the right tool (rule 4). Check they are capped in width and that the field count is minimal | Keep forms; Astryx `TextInput`; one button each |

## C. Admin screens

| Screen | Violation | Proposed replacement |
|---|---|---|
| Catalog (`AdminCatalog.jsx`) | Always-open Add category and Add author forms, two Delete buttons, Save (rules 1, 2, 5) | "Add category" and "Add author" create a row in edit mode; Delete in ⋯ with undo |
| Courses list (`AdminCourses.jsx`) | New course form with four fields and two text areas always open (rules 1, 2) | "New course" creates "Untitled course" and opens it with the title in edit mode |
| Course editor (`AdminCourseEditor.jsx`) | Course form with Save changes, unit and lesson title forms, 3 selects, 2 checkboxes (rules 1, 2, 3) | Autosave; "Add unit" and "Add lesson" create rows in edit mode; switches and chips for flags and category |
| Lesson editor (`AdminLessonEditor.jsx`) | Seven text fields, five text areas, five selects, a native PDF input (rules 1, 3) | Sections as inline edit blocks; video host as chips; file drop zones |
| Test editor (`AdminTestEditor.jsx`, `QuestionTypeFields.jsx`) | Three Save buttons, seven text fields, five text areas, selects for type (rules 2, 3) | Autosave per question; question type from icon cards; correct answer by tapping the option |
| Users (`AdminUsers.jsx`) | Five selects (status, role, pages), an access-ends date text field and Save date (rules 2, 3) | Filter chips; role and status as segmented controls; date picker that saves on pick |
| Reports, Community review, Analytics, Question import (`AdminReports.jsx`, `AdminCommunity.jsx`, `AdminAnalytics.jsx`, `AdminQuestionImport.jsx`) | Status select, reply text area with submit, filter selects, native CSV input | Status chips; reply composer inline; filter chips; drop zone for CSV |

## D. Things I did not audit

- The public share pages (`/s/s/:id`) and the 404 and error screens.
- `DevComponents.jsx` (developer page, not a student or admin screen).

## What I need from you (OWNER DECIDES)

1. Is this audit complete enough, and is every proposed replacement acceptable? Any row you want kept as it is?
2. Login and Register are real forms (rule 4 allows typing). OK to keep them as forms and only restyle them with Astryx?
3. Rule 6 says cap content at 760 to 900 px. Should the Study Lab card grid and admin tables be an exception and use the full width?
4. Steps 0 to 7 in the brief are one per session. Do you want step 1 (header search) next, or Study Hall removal first, since it touches the backend?
