# Catalyst Frontend

The Catalyst frontend is a React application powered by Vite. It provides the student learning experience and the admin content workspace for the Catalyst API.

## Requirements

- Node.js and npm
- The Catalyst backend running locally or at a reachable API URL

## Installation

From the frontend directory:

```powershell
cd frontend
npm install
```

## Environment configuration

Copy `.env.example` to `.env` when the frontend is hosted separately from the API.

```env
VITE_API_URL=
```

Leave `VITE_API_URL` empty during local development. Requests use `/api/v1` and are forwarded by Vite to the backend configured in [`vite.config.js`](./vite.config.js).

When deploying the frontend separately, set `VITE_API_URL` to the public API base URL, including `/api/v1`, for example:

```env
VITE_API_URL=https://api.example.com/api/v1
```

The frontend uses HTTP-only cookies for authentication. The API must allow credentialed CORS requests from the frontend origin.

## Running locally

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The Vite proxy currently targets `http://localhost:3000`. If the backend uses another port, update the proxy target or set the backend `PORT` to match it.

## Production build

```powershell
cd frontend
npm run build
npm run preview
```

The generated files are written to `frontend/dist/`, which is ignored by Git.

## Application routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/register` | Public | Create a student account |
| `/courses` | Authenticated | Browse published courses |
| `/courses/:id` | Authenticated | Course outline with lesson progress |
| `/lessons/:id` | Authenticated | Lesson hub: explanation, formulas, practice tests, flashcards, materials, Mark as done, next lesson |
| `/tests/:id` | Authenticated | Take a test, one question at a time, with feedback after each answer. Lesson tests show their pass percent and whether the student passed |
| `/lessons/:id/flashcards` | Authenticated | Study a flashcard deck: tap the card to turn it over, then rate it (`?filter=review` shows cards still to review) |
| `/progress` | Authenticated | View scores, completed lessons, and streak |
| `/settings` | Authenticated | Colour palette, light or dark theme, and profile picture |
| `/admin` | Admin | Overview numbers and the course list, with search |
| `/admin/users` | Admin | Find users, change roles, deactivate accounts and manage subscriptions |
| `/admin/trash` | Admin | Deleted content, with a Restore button for each item |
| `/admin/courses/:id` | Admin | Course editor: units, lessons, unit and course tests |
| `/admin/lessons/:id` | Admin | Lesson editor: explanation, image, video, tests, flashcards, materials |
| `/admin/tests/:id` | Admin | Test editor: questions and, for lesson tests, the pass percent needed to complete the lesson |

Unknown routes redirect to `/courses` for signed-in users or `/login` for signed-out users.

## Admin workflow

Content is written in the in-app builder. Create content in this order:

1. Create a course on `/admin` and open it.
2. In the course editor, add units, then lessons inside each unit. Rename and reorder them in place.
3. Open a lesson to write its explanation (with chemical formulas), add an image or video, and add its tests, flashcards and materials.
4. Open a test to add its questions. Multiple-choice and true or false are supported.
5. Publish the course, lesson, test and flashcards when they are ready for students. Unpublished or deleted parents hide their children.

Pages ask before you leave with unsaved changes. Images are JPEG, PNG or WEBP up to 2 MB, and PDF materials are up to 10 MB.

**Users and access.** On `/admin/users`, search by name or email and filter by role or status. For a student, "Add 1 month" extends their subscription from today (or from the current end date if it is still in the future), and the menu can add 3 months, set an end date or clear it. The menu also makes someone an admin or student and deactivates or reactivates the account. You cannot change your own role or deactivate yourself. Subscriptions only matter when the backend has `REQUIRE_SUBSCRIPTION=true`; then a student without one sees "Your access has ended" on lessons, tests and flashcards, while courses and progress stay open.

**Trash.** Deleting content hides it from students but keeps it. On `/admin/trash` press Restore to bring an item back. It returns at the end of its list and unpublished, so publish it again when ready. An item whose parent is also deleted says "Restore the lesson first" (or unit, or course).

## Frontend structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── api/client.js          # API requests and credential handling
    ├── components/            # Shared UI: app shell, rich text, avatar, deck summary
    │   └── admin/             # Builder components: breadcrumbs, switch, dialogs, image field
    ├── context/AuthContext.jsx
    ├── hooks/                 # useUnsavedChanges
    ├── pages/                 # Student pages and admin editors
    ├── styles/tokens.css      # Palettes, light and dark themes, colour and type tokens
    ├── styles/global.css      # Component and layout styles
    ├── utils/                 # Cloudinary image URLs, course cache
    ├── App.jsx                # Client-side routes
    └── main.jsx               # React entry point
```

## Design system

The look is described in `DESIGN.md` at the repository root. Five palettes (`data-palette`: lagoon, indigo, ember, orchid, graphite) and two themes (`data-theme`: light, dark) are chosen in Settings and saved in the browser (`catalyst-palette`, `catalyst-theme`). Colours come only from tokens in `tokens.css`; never write a colour value in a component. Text must reach WCAG 2.1 AA contrast in all ten palette and theme combinations. Chemical formulas use KaTeX with mhchem, loaded only when a lesson contains one.

## Authentication behavior

The frontend does not store JWTs in local storage. Login and registration receive an HTTP-only `token` cookie from the backend, and API requests include credentials automatically. On startup, `AuthContext` calls `/auth/me` to restore the current session.

## Troubleshooting

- **`Failed to fetch`**: confirm the backend is running, verify the Vite proxy port, and check that the backend `CLIENT_URL` matches the frontend origin.
- **Redirected to login**: the authentication cookie may be missing, expired, or blocked by a CORS/origin mismatch.
- **No courses appear**: courses must exist and be published; deleted courses are hidden.
- **Admin page redirects away**: the authenticated user must have the `admin` role.
- **Unit, lesson, or question creation fails**: create parent records first and use the selector populated by the admin page.
