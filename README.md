# Catalyst

Catalyst is a full-stack, low-cost learning platform for university students (starting with CHEM113). Students study structured courses (`Course > Unit > Lesson`), take server-graded tests, review flashcards, read lesson materials, and track progress and daily streaks. An in-app admin builder lets the owner create and publish all content.

## Repository Layout

```text
Catalyst/
├── backend/                  # TypeScript Modular Monolith API (Express 5 + MongoDB + Zod + Vitest)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── README.md             # Detailed backend architecture, env vars, and API reference
│   ├── src/
│   │   ├── config/           # Fail-fast env validation, DB, Pino logger, Cloudinary, avatars
│   │   ├── shared/           # Errors, middlewares, types, reusable utilities
│   │   ├── modules/          # Vertical feature modules (auth, courses, assessments, ...)
│   │   ├── routes.ts         # /health, /ready, and /api/v1 mounting
│   │   ├── app.ts            # Express app factory
│   │   └── server.ts         # Server bootstrap & graceful shutdown
│   └── tests/                # Vitest unit & Supertest integration tests
├── frontend/                 # React + Vite SPA (plain CSS with design tokens, KaTeX + mhchem)
│   ├── package.json
│   ├── vite.config.js
│   ├── README.md             # Detailed frontend documentation
│   └── src/
├── .gitignore
├── PRODUCT.md
├── DESIGN.md
└── README.md
```

## Prerequisites

- **Node.js** (LTS / v20+) and **npm**
- **MongoDB** (local or MongoDB Atlas)
- A `backend/.env` file created from [`backend/.env.example`](./backend/.env.example)

Never commit `.env` files or real credentials. See [`.gitignore`](./.gitignore) for ignored secret, build, cache, and test artifacts.

## Configuration

### Backend (`backend/.env`)

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/catalyst_dev
JWT_SECRET=replace_with_at_least_32_random_characters
JWT_EXPIRES_IN=7d
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

`CLIENT_URL` must match the browser origin of the frontend. The backend defaults to port `3000`, which matches the Vite dev proxy in [`frontend/vite.config.js`](./frontend/vite.config.js). Full configuration options are documented in [`backend/README.md`](./backend/README.md).

### Frontend (`frontend/.env`)

Leave `VITE_API_URL` empty for local development—the frontend calls `/api/v1` and Vite proxies those requests to `http://127.0.0.1:3000`. For separate production hosting, set `VITE_API_URL` to your deployed API base URL ending in `/api/v1`.

## Installation & Startup

Install dependencies in each workspace:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Run the backend (Terminal 1):

```powershell
cd backend
npm run dev
```

Run the frontend (Terminal 2):

```powershell
cd frontend
npm run dev
```

## Verification & Builds

Backend checks (from `backend/`):

```powershell
npm run typecheck   # Strict TypeScript check
npm run build       # Compile src/ -> dist/
npm test            # Run Vitest unit & integration tests
```

Frontend build check (from `frontend/`):

```powershell
npm run build
```

## Documentation

- Backend architecture, env reference, and module roadmap: [`backend/README.md`](./backend/README.md)
- Frontend structure and conventions: [`frontend/README.md`](./frontend/README.md)
- Product scope and principles: [`PRODUCT.md`](./PRODUCT.md)
- Visual design system and palettes: [`DESIGN.md`](./DESIGN.md)

## Common Issues

- **`npm run dev` cannot find `package.json`:** Run commands inside `backend/` or `frontend/`—each has its own `package.json`.
- **`Failed to fetch` in browser:** Confirm MongoDB is running, the backend is running on port `3000`, `CLIENT_URL` matches `http://localhost:5173`, and cookies are enabled.
- **Invalid environment configuration on boot:** The backend validates `backend/.env` at startup and prints the exact missing or malformed variable names.
