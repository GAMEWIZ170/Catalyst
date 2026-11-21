# Catalyst Backend API (MVP)

The backend for **Catalyst**, a structured, low-cost learning platform for university students. Built with **Node.js, Express 5, MongoDB (Mongoose 9), TypeScript, Zod, Pino, and Vitest**.

> **Architecture Refactor Status (`refactor/mvp-backend-ts`):**
> The backend is being rebuilt as a clean **TypeScript Modular Monolith** focused on the Lean Core MVP (8 modules, 10 models, `/api/v1` compatible). Legacy X5–X8 features (AI, Study Sets, Community, Circles, Friends, Hall, XP) are preserved on branch `archive/pre-mvp-overhaul`.

---

## Architecture Overview

Every feature lives in its own vertical module under `src/modules/<feature>/` using a clear 4-layer flow:

```text
HTTP Request
  -> Global Middleware (Helmet, CORS, Pino Logger + Request ID, Rate Limiter, Cookies, JSON)
  -> Router (*.routes.ts)       # URL paths, auth/role guards, rate limits
  -> Validator (*.schema.ts)    # Zod schemas (runtime validation + static TS types)
  -> Controller (*.controller.ts) # Thin HTTP adapter (req/res only)
  -> Service (*.service.ts)     # Pure business rules (unit-testable without Express)
  -> Model (*.model.ts)         # Mongoose schema & indexes
```

Errors thrown as `AppError` subclasses (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) are caught automatically by Express 5 and formatted consistently by `src/shared/middlewares/errorHandler.ts`.

### Directory Layout

```text
backend/
├── src/
│   ├── config/          # Fail-fast env.ts, db.ts, logger.ts, cloudinary.ts, avatars.ts
│   ├── shared/
│   │   ├── errors/      # AppError hierarchy
│   │   ├── middlewares/ # errorHandler, notFound, requestLogger, validate, rateLimiter, authorizeRole
│   │   ├── types/       # Express req.user augmentation
│   │   └── utils/       # objectId, cloudinaryUrl, shared helpers
│   ├── modules/         # Feature modules (auth, courses, assessments, flashcards, materials, progress, uploads, admin)
│   ├── routes.ts        # Mounts /health, /ready, and /api/v1/*
│   ├── app.ts           # Express app factory (exported for Supertest without binding a port)
│   └── server.ts        # Connects MongoDB, listens on PORT, handles SIGINT/SIGTERM gracefully
├── tests/
│   ├── unit/            # Fast unit tests (pure logic & middlewares)
│   └── integration/     # Supertest HTTP integration tests
├── tsconfig.json        # Strict TypeScript config (typechecking + tests)
├── tsconfig.build.json  # Production build config (compiles src/ -> dist/)
└── vitest.config.ts     # Vitest test runner config
```

---

## Quick Start

### 1. Install dependencies

```powershell
cd backend
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values (never commit `.env`):

```powershell
copy .env.example .env
```

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP server port (matches Vite dev proxy) |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `CLIENT_URL` | No | `http://localhost:5173` | Exact frontend origin allowed by CORS |
| `MONGODB_URI` | Yes* | — | MongoDB connection string (use separate DBs for dev and test) |
| `JWT_SECRET` | Yes* | — | Secret for signing login JWTs (at least 16 chars; 32+ recommended) |
| `JWT_EXPIRES_IN` | No | `7d` | Login session duration |
| `CLOUDINARY_URL` | Yes* | — | `cloudinary://<api_key>:<api_secret>@<cloud_name>` for image & PDF uploads |
| `TRUST_PROXY` | No | unset | Set to `1` behind Render/Railway/nginx so `req.ip` reflects real client IPs |
| `REQUIRE_SUBSCRIPTION` | No | `false` | When `true`, paid courses require an active `subscriptionEndsAt` |
| `LOG_LEVEL` | No | `info` (`silent` in test) | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) |
| `RATE_LIMIT_IP` | No | `1000` | General IP requests per 15-minute window |
| `RATE_LIMIT_AUTH_FAILS` | No | `20` | Failed auth attempts per IP per 15-minute window |

*\*Safe local defaults are provided automatically when `NODE_ENV=test`.*

### 3. Scripts

```powershell
npm run dev        # Start dev server with hot reload (tsx watch)
npm run typecheck  # Strict TypeScript check (tsc --noEmit)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled production server (node dist/server.js)
npm test           # Run Vitest unit & integration test suite
npm run test:watch # Run tests in watch mode
```

---

## Endpoints

### Operational Probes (Live)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check (`200 { status: "ok", uptime }`) |
| `GET` | `/ready` | Readiness check — verifies MongoDB connection (`200` or `503`) |

### MVP `/api/v1` Module Roadmap

| Milestone | Module | Scope | Status |
| --- | --- | --- | --- |
| M1 | Foundation | TS toolchain, fail-fast env, Pino logging, `AppError`, Zod validation, rate-limiter factory, `/health` & `/ready`, Vitest + Supertest | Done |
| M2 | `auth` | Register, login, logout, `/auth/me`, httpOnly cookie, password reset/change, email verification, avatar & preferences | Next |
| M3 | `courses` | `Course > Unit > Lesson` hierarchy, soft-delete/publish visibility, student outline & lesson hub, admin CRUD + reorder | Planned |
| M4 | `assessments` | Lesson/unit/course tests, 8 question types, server-side grading only, admin CRUD + reorder | Planned |
| M5 | `flashcards`, `materials`, `uploads` | Lesson flashcards & confidence ratings, PDF/link materials, magic-byte Cloudinary uploads | Planned |
| M6 | `progress`, `admin` | Lesson completion rules, streaks, `/home` & `/progress`, admin course tree, user/subscription management, stats, trash restore | Planned |

---

## Core Security & Domain Rules

- **Honest Server-Side Grading:** Students never receive `correctOption`, `correctAnswer`, `correctOptions`, `explanation`, or `explanationImage` before answering. Empty tests return `409` on submit.
- **Soft Deletes & Visibility:** Records use `deletedAt`. Any deleted or unpublished parent makes all child content return `404` to students.
- **Lesson Completion:** A lesson completes by passing its test, finishing its published flashcard deck, or `Mark as done` (allowed only when the lesson has no qualifying test and no published flashcards).
- **Authentication:** JWT stored in an `httpOnly` cookie named `token`. Admin routes always require `authenticate` followed by `authorizeRole("admin")`.
- **Uploads:** Images (JPEG/PNG/WEBP ≤ 2 MB, no SVG) and PDFs (≤ 10 MB, `%PDF-` header) are verified by real file bytes. Cloudinary URLs must be `https://res.cloudinary.com/<cloud_name>/...`.
- **Logging Hygiene:** Pino automatically redacts cookies, authorization headers, passwords, and tokens from logs.
