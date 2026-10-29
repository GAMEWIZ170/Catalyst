# Catalyst API

Catalyst is an Express and MongoDB API for a course-learning platform.

## Requirements

- Node.js 18 or newer
- MongoDB

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the values:

   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_long_random_secret
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   ```

3. Start the API:

   ```bash
   npm start
   ```

   For development with automatic restarts:

   ```bash
   npm run dev
   ```

The server listens on `http://localhost:5000` by default.

## Authentication

Authentication uses an HTTP-only `token` cookie. Register or log in before calling protected routes. The API does not currently include a test suite; `npm test` is not configured yet.

## API routes

All routes are prefixed with `/api/v1`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Courses | `GET /courses`, `GET /courses/:id` |
| Lessons | `GET /lessons/:id`, `POST /lessons/:id/complete` |
| Questions | `POST /questions/:id/answer` |
| Progress | `GET /progress`, `GET /progress/streak` |
| Admin | Course, unit, lesson, question, and user management under `/admin` |

Admin routes require an authenticated user with the `admin` role. Request bodies are validated with Joi.

## Project structure

- `src/controllers` - Request handlers and application logic
- `src/middlewares` - Authentication, validation, logging, and error handling
- `src/models` - Mongoose schemas
- `src/routes` - Express route definitions
- `src/utils` - Shared helpers