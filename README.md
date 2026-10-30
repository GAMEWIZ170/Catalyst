# Catalyst Application Documentation

Catalyst is a full-stack learning platform. The backend exposes a versioned REST API backed by MongoDB, and the frontend provides student learning pages plus an administrator content workspace.

## Repository layout

```text
Catalyst/
├── backend/
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── utils/
│       ├── app.js
│       └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── .gitignore
└── APPLICATION.md
```

## Prerequisites

- Node.js and npm
- MongoDB
- A backend `.env` file based on `backend/.env.example`

Never commit `.env` files or real credentials. The repository ignores environment files, dependency folders, and frontend build output.

## Configuration

### Backend

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=your_token_duration
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

`CLIENT_URL` must match the browser origin used by the frontend. The backend defaults to port `5000` when `PORT` is not set.

### Frontend

For local development, leave `VITE_API_URL` empty in `frontend/.env`. The frontend calls `/api/v1`, and Vite proxies those requests to the backend target configured in [`frontend/vite.config.js`](./frontend/vite.config.js).

The current proxy target is `http://localhost:3000`; either run the backend on port `3000` or change the proxy target to the backend port. For separate deployment, set `VITE_API_URL` to the deployed API base URL ending in `/api/v1`.

## Installation and startup

Install dependencies:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Run the backend:

```powershell
cd backend
npm run dev
```

Run the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Build the frontend:

```powershell
cd frontend
npm run build
```

## Backend API

All API routes are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a student and issue an HTTP-only cookie |
| POST | `/auth/login` | Authenticate and issue an HTTP-only cookie |
| POST | `/auth/logout` | Clear the authentication cookie |
| GET | `/auth/me` | Return the authenticated user |

### Student learning

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/courses` | List published courses |
| GET | `/courses/:id` | Return a course outline and the current user's completion state |
| GET | `/lessons/:id` | Return a published lesson and questions without answers |
| POST | `/questions/:id/answer` | Check one answer |
| POST | `/lessons/:id/complete` | Grade a lesson and save the user's best score |
| GET | `/progress` | Return the current user's progress records |
| GET | `/progress/streak` | Return the current daily streak |

### Admin

All admin endpoints require authentication and the `admin` role.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/courses` | List active courses, units, and lessons for content management |
| POST/PUT/DELETE | `/admin/courses[/:id]` | Manage courses |
| POST/PUT/DELETE | `/admin/units[/:id]` | Manage units |
| POST/GET/PUT/DELETE | `/admin/lessons[/:id]` | Manage lessons and load full admin lesson details |
| POST/PUT/DELETE | `/admin/questions[/:id]` | Manage questions |
| GET | `/admin/users` | List users with pagination |

## Data hierarchy

Learning content follows this hierarchy:

```text
Course
└── Unit
    └── Lesson
        └── Question
```

Courses and content use soft deletion. Student-facing endpoints exclude deleted records and also verify that parent records remain visible. Admin creation validates that each parent exists and is not deleted.

## Authentication and authorization

- Authentication uses JWTs stored in an HTTP-only `token` cookie.
- The frontend sends cookies with every API request.
- `authenticate` protects signed-in routes.
- `authorizeRole("admin")` protects the admin route group.
- Passwords are hashed with bcrypt.
- Helmet, CORS, JSON parsing, cookie parsing, request logging, and rate limiting are configured in [`backend/src/app.js`](./backend/src/app.js).

## Validation and rate limiting

Joi middleware validates request bodies before controllers process them. Invalid identifiers and malformed payloads return client errors instead of reaching database operations.

The backend includes:

- A general IP-based request limiter.
- A stricter limiter for login and registration attempts.
- An authenticated-user limiter for answer submissions.

## Frontend responsibilities

The React frontend:

- Restores sessions through `/auth/me`.
- Provides registration, login, logout, course browsing, lesson completion, and progress views.
- Sends answer submissions and displays grading feedback.
- Provides an admin content workflow in parent-to-child order: course, unit, lesson, question.
- Uses the Vite proxy locally and a configurable `VITE_API_URL` for separate hosting.

Detailed frontend usage is documented in [`frontend/README.md`](./frontend/README.md).

## Verification

The frontend production build can be checked with:

```powershell
cd frontend
npm run build
```

The backend currently has no automated application test suite configured. Manual verification should cover registration, login, admin authorization, content creation, student browsing, answer grading, lesson completion, progress, streaks, and logout.

## Common issues

### `npm run dev` cannot find `package.json`

The project has separate package manifests. Run backend commands from `backend/` and frontend commands from `frontend/`; there is no root-level package manifest.

### `Failed to fetch`

Check that:

1. MongoDB is available.
2. The backend process is running.
3. The Vite proxy target matches the backend port.
4. `CLIENT_URL` matches the frontend origin.
5. Browser cookies are allowed for the current origin.

### Content does not appear for students

Student routes show published, non-deleted courses and lessons only. Create the hierarchy in order and publish the relevant records.
