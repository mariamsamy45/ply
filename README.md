# Ply

**Trade skills, not money.**

Ply is a full-stack skill-barter platform. Users list what they can teach and
what they want to learn, discover compatible people, send trade requests,
chat, complete trades, leave reviews, and share Instagram-style Stories and
Highlights along the way.

This repository contains a complete, working full-stack application:

- `backend/` — Node.js + Express + TypeScript REST API on PostgreSQL
- `frontend/` — React + TypeScript + Vite + Tailwind CSS client

Everything in here is real: real authentication, a real database schema, a
real REST API, real CRUD, and a real (non-hardcoded) skill-matching algorithm.
There is no seed data and no mock API responses — an empty database means an
empty app until people actually use it.

---

## 1. Product summary (for your submission)

**Problem.** People want to learn useful skills but can't always afford
lessons — and they usually already have something valuable to teach in
return.

**Solution.** Ply lets people trade skills directly: "I'll teach you guitar
if you teach me Spanish."

**Core user journey:** create account → build profile → list skills to teach
and learn → discover people → get matched → send a trade request → accept →
chat → complete the trade → leave a review.

**3–5 sentence summary you can reuse for submission:**

> Ply is a full-stack skill-barter platform that lets users exchange skills
> instead of money. Users create profiles, list what they can teach and want
> to learn, discover and get matched with compatible people using a real
> compatibility algorithm, send trade requests, chat, complete trades, and
> leave reviews. It's built with React, Node.js/Express, PostgreSQL, JWT
> authentication, a REST API, and a fully responsive UI, and is designed to
> deploy on Vercel (frontend) and Render (backend) with Supabase Postgres.
> The project demonstrates a complete real-world application with persistent
> data, real authentication, and no mock content anywhere.

**Biggest challenge (customize this to your actual experience once you've
run it):**

> The biggest challenge was keeping Stories and Highlights properly
> decoupled in the database — a Highlight needed to survive the expiration
> or deletion of the Story it was built from. I solved this by copying the
> media reference into a `highlight_stories` join table at the moment a
> Highlight is created, rather than pointing directly at the `stories` row.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase Postgres recommended) |
| Auth | Custom JWT auth (bcrypt password hashing) — see note below |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Source control | GitHub |

**A note on authentication.** The assignment allows "Supabase Auth or
Auth.js." This project ships a small, real, self-contained JWT auth system
(bcrypt-hashed passwords, signed tokens, protected routes, ownership checks)
so it has zero external account dependencies and you can run it entirely
locally today. If your assignment specifically requires Supabase Auth or
Auth.js's hosted flows, swap `backend/src/routes/auth.ts` for calls to that
provider's SDK — the rest of the app (every other route, and the frontend)
only depends on a `requireAuth` middleware that resolves a `userId`, so the
swap is contained to one file plus the middleware.

---

## 3. Running it locally

### Prerequisites
- Node.js 18+
- A PostgreSQL database — either install Postgres locally, or create a free
  project at [supabase.com](https://supabase.com) and use its connection
  string (Project Settings → Database → Connection string → URI).

### Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and set JWT_SECRET to any long random string
npm install
npm run migrate   # creates all tables — safe to re-run
npm run dev        # starts the API on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL should already point at http://localhost:4000
npm install
npm run dev         # starts the app on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and start using it. There
is no seed data — create a second account (an incognito window works well)
to test discovery, matching, trade requests, and messaging between two real
users.

---

## 4. Database

The full schema lives in `backend/migrations/001_init.sql`. It creates:

```
users, profiles, skills, user_skills, trade_requests, trades,
conversations, messages, reviews, badges, user_badges,
stories, highlights, highlight_stories
```

with primary keys, foreign keys, `on delete cascade` where a child row
should never outlive its owner, and indexes on the columns the API filters
by. Run `npm run migrate` in `backend/` any time you need to (re)apply it —
every statement uses `if not exists` / `on conflict do nothing`, so it's
safe to run repeatedly.

**Account deletion** relies entirely on `on delete cascade`: deleting a row
from `users` automatically removes that user's profile, skills, requests,
trades, messages, reviews, badges, stories, and highlights — and nothing
belonging to anyone else, because every cascade is scoped by foreign key to
that one user's id.

---

## 5. REST API

All endpoints are namespaced under `/api`. Highlights:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
DELETE /api/auth/account

GET    /api/users/:id
PUT    /api/users/:id

GET    /api/skills
GET    /api/skills/mine
POST   /api/skills
PUT    /api/skills/:id
DELETE /api/skills/:id

GET    /api/discover?skill=&city=&mode=
GET    /api/matches

POST   /api/requests
PUT    /api/requests/:id      { status: "accepted" | "rejected" }
DELETE /api/requests/:id

GET    /api/trades
PUT    /api/trades/:id        { status: "completed" | "cancelled" }

GET    /api/messages
GET    /api/messages/:conversationId
POST   /api/messages

GET    /api/reviews/:userId
POST   /api/reviews

GET    /api/stories
GET    /api/stories/archive
POST   /api/stories
DELETE /api/stories/:id

GET    /api/highlights/:userId
POST   /api/highlights
PUT    /api/highlights/:id
DELETE /api/highlights/:id

POST   /api/media              (multipart file upload, used by stories/avatars)
```

Every mutating route enforces ownership on the backend (you can't edit
another user's profile, delete another user's story, and so on) — this is
checked in the route handlers, not just hidden in the UI.

### The matching algorithm

`backend/src/routes/discover.ts` computes a real compatibility score from
actual `user_skills` rows:

```
score = (skills they teach that I want to learn
        + skills I teach that they want to learn)
        / (my total teach + learn skills)
```

capped at 100 and rounded — never hardcoded.

---

## 6. Deployment (free tier)

### Database — Supabase
1. Create a project at supabase.com.
2. Copy the Postgres connection string from Project Settings → Database.
3. From your machine, run `npm run migrate` in `backend/` with that
   `DATABASE_URL` set, to create the schema on Supabase.

### Backend — Render
1. Push this repo to GitHub.
2. In Render, create a new Web Service pointing at `backend/`.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
   (your Vercel URL), `API_BASE_URL` (your Render URL),
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `SUPABASE_STORAGE_BUCKET=ply-media`.
5. In Supabase Storage, create a bucket named `ply-media` and make it public
   so profile/story/post media can be displayed by the browser.
6. New uploads are stored in Supabase Storage instead of Render's ephemeral
   disk, so they survive restarts and redeploys.

### Frontend — Vercel
1. Import the repo into Vercel, set the project root to `frontend/`.
2. Set the environment variable `VITE_API_URL` to your Render backend URL.
3. Deploy. Once deployed, go back to Render and set `CORS_ORIGIN` to this
   Vercel URL, then redeploy the backend.

### After deploying, verify from the live URLs (not localhost)
Registration, login, logout, profile editing, skills, discovery, matching,
trade requests, trades, chat, reviews, badges, stories (including
expiration), the story archive, highlights, and account deletion.

---

## 7. Design

Ply's visual identity is built around the idea of a trade: two accent colors
— cobalt `#2B4CFF` and tangerine `#FF7A3D` — meeting on a bone `#F3EFE6`
background with ink `#15131C` type and borders. Headlines use Fraunces (a
warm, slightly irregular serif); UI text uses Space Grotesk. Structural
elements use sharp 2px borders rather than soft shadows; skill tags are the
only pill-shaped elements, so they read as tokens being traded. No emoji are
used anywhere in the product.

---

## 8. What's stubbed vs. fully wired

To keep this runnable in one pass, a couple of settings toggles (dark mode,
notification preferences, profile visibility) are present in the UI but not
yet persisted to the database — they're clearly isolated in
`frontend/src/pages/Settings.tsx` if you want to wire them to real columns
next. Every other feature in the spec — auth, profiles, skills, discovery,
matching, trade requests, trades, messaging, reviews, badges, stories
(with real 24-hour expiration), highlights, and account deletion — is fully
implemented against the real database, with no mock data.
