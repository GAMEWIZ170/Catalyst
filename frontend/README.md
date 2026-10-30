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
| `/courses/:id` | Authenticated | View a course outline and lesson progress |
| `/lessons/:id` | Authenticated | View lessons, answer questions, and submit completion |
| `/progress` | Authenticated | View scores, completed lessons, and streak |
| `/admin` | Admin | Manage courses, units, lessons, questions, and users |

Unknown routes redirect to `/courses` for signed-in users or `/login` for signed-out users.

## Admin workflow

Create content in this order:

1. Create a course.
2. Select that course in the Units form and create a unit.
3. Select that unit in the Lessons form and create a lesson.
4. Select that lesson in the Questions form and create questions.
5. Publish the course and lesson when they are ready for students.

The admin forms use selectable existing records rather than requiring users to manually copy MongoDB IDs. Existing records can also be updated with the JSON update form and removed through the delete controls.

## Frontend structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── api/client.js          # API requests and credential handling
    ├── components/            # Layout, guards, progress, and question UI
    ├── context/AuthContext.jsx
    ├── pages/                 # Authentication, learning, progress, and admin pages
    ├── styles/global.css
    ├── App.jsx                # Client-side routes
    └── main.jsx               # React entry point
```

## Authentication behavior

The frontend does not store JWTs in local storage. Login and registration receive an HTTP-only `token` cookie from the backend, and API requests include credentials automatically. On startup, `AuthContext` calls `/auth/me` to restore the current session.

## Troubleshooting

- **`Failed to fetch`**: confirm the backend is running, verify the Vite proxy port, and check that the backend `CLIENT_URL` matches the frontend origin.
- **Redirected to login**: the authentication cookie may be missing, expired, or blocked by a CORS/origin mismatch.
- **No courses appear**: courses must exist and be published; deleted courses are hidden.
- **Admin page redirects away**: the authenticated user must have the `admin` role.
- **Unit, lesson, or question creation fails**: create parent records first and use the selector populated by the admin page.
