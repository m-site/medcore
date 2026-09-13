# Medcore

Medcore is a full-stack Arabic medical-learning platform: a responsive student experience, a protected API, an admin-only authoring endpoint, and server-side grading.

## What it fixes

- No executable code is stored in the database or injected into visitors' browsers.
- Question data is validated on the server; client submissions are size-limited and rate-limited.
- Answers remain server-side until a quiz is submitted.
- Admin access uses a bcrypt-hashed password and a time-limited signed token—not a browser-visible password.
- SQLite enables a simple deploy now; its data layer is isolated so it can later move to PostgreSQL without changing the API surface.

## Run locally

1. Copy `.env.example` to `.env` and set a long `JWT_SECRET` and an admin password.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.

`ADMIN_EMAIL` defaults to `ma7moud01030382018@gmail.com`. The app only creates the administrator from the environment the first time its database is empty.

## Deployment

This is not a GitHub Pages app: it needs Node 24+ and persistent disk or a managed database. Deploy the repository to Render, Railway, Fly.io, or a VPS; set the environment values from `.env.example`, use HTTPS, and mount persistent storage for `data/medcore.db`. A `Dockerfile` and `render.yaml` are included for a Render deployment. For production scale, replace the SQLite adapter with PostgreSQL.

## API

- `GET /api/lessons` — public catalogue
- `GET /api/lessons/:id` — public lesson without answers
- `POST /api/lessons/:id/attempts` — server-side scoring
- `POST /api/feedback` — validated feedback
- `POST /api/auth/login` — admin session token
- `GET /api/admin/lessons` and `POST /api/admin/lessons` — admin-only lesson management

## Before launch

- Change `JWT_SECRET` and `ADMIN_PASSWORD`; never commit `.env`.
- Configure `CLIENT_ORIGIN` with the final domain.
- Add database backups and monitoring.
- Put the application behind HTTPS.
