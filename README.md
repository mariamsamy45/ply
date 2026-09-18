# Ply

> **Trade skills, not money.**

Ply is a full-stack skill-barter social platform where people exchange skills instead of paying for lessons. Users can create an account, build a profile, list skills they can teach and want to learn, discover compatible people, send trade requests, chat, complete trades, leave reviews, earn badges, publish Stories and Highlights, and share Instagram-style posts with likes and comments.

This repository contains the complete Ply application:

- `backend/` — Node.js + Express + TypeScript REST API
- `frontend/` — React + TypeScript + Vite + Tailwind CSS
- PostgreSQL/Supabase Postgres — persistent application data
- Supabase Storage — persistent image/video uploads
- JWT + bcrypt — application authentication
- GitHub — source control
- Vercel — frontend deployment
- Railway — backend deployment

The application is designed around **real user data**. There are no hardcoded users, profiles, matches, posts, Stories, reviews, or API mock responses. A new database starts empty apart from the predefined badge definitions; users create the actual content through the application.

---

## 1. Product overview

### The problem

Many people want to learn useful skills but cannot always afford lessons. At the same time, they already have skills that other people would value.

### The solution

Ply turns skills into something users can exchange directly.

For example:

> **“I'll teach you guitar if you teach me Spanish.”**

The platform supports both:

- **Online** exchanges, such as video calls.
- **In-person** exchanges, with users able to specify their city/country and arrange meeting details.

### Core journey

```text
Create account
      ↓
Build profile
      ↓
Add skills to teach + skills to learn
      ↓
Discover people
      ↓
See compatibility matches
      ↓
Send a trade request
      ↓
Accept / reject
      ↓
Chat
      ↓
Complete the trade
      ↓
Leave a review
      ↓
Earn badges
```

The social layer sits alongside the barter workflow:

```text
Stories → 24-hour public Stories → private archive → Highlights
Posts   → image/video posts → likes → comments
Profiles → skills → reviews → badges → posts → highlights
```

---

## 2. Features implemented

### Authentication and accounts

- Real account registration.
- Real login/logout.
- Passwords are hashed with `bcryptjs`.
- JWT access tokens protect authenticated API routes.
- Authentication state is persisted in the browser.
- `GET /api/auth/me` restores the signed-in session.
- Protected frontend routes redirect unauthenticated users to login.
- Users can permanently delete their account.
- Database foreign keys use cascading deletes so owned data is removed with the account.

### Profiles

Each user has a real profile containing:

- Name
- Username
- Bio
- Profile picture/avatar
- City
- Country
- Preferred exchange mode:
  - Online
  - In person
  - Both
- Skills they can teach
- Skills they want to learn
- Average rating and review count
- Earned badges
- Instagram-style posts
- Stories
- Highlights

Users can:

- View their own profile.
- View another user's profile.
- Edit their own profile.
- Upload/change their avatar.
- Add skills.
- Remove skills.
- Set skill direction to `teach` or `learn`.
- Set skill level to beginner, intermediate, or advanced.

Profile links are used throughout the app, so clicking a person's name/avatar from areas such as Stories, Requests, Trades, Messages, Discover, and Matches can take the user to that person's account.

### Skills

Skills are stored in a shared `skills` table and connected to users through `user_skills`.

Supported directions:

- `teach`
- `learn`

Supported levels:

- `beginner`
- `intermediate`
- `advanced`

The system creates/uses real skill records instead of relying on hardcoded frontend skill lists.

### Discover

Discover lets users search real accounts using:

- Skill
- City
- Exchange mode

Supported modes:

- Online
- In person
- Both

Results come from the PostgreSQL database.

### Real matching algorithm

Ply calculates compatibility from the actual skills stored for each user.

The backend compares:

1. Skills the other person can teach that the current user wants to learn.
2. Skills the current user can teach that the other person wants to learn.

The score is calculated from the overlap rather than being hardcoded:

```text
score =
(
  skills they teach that I want to learn
  +
  skills I teach that they want to learn
)
/
(
  my total teach skills
  +
  my total learn skills
)
× 100
```

The result is capped at 100 and rounded.

Matches with a compatibility score greater than zero are shown on the Matches page and sorted by compatibility.

### Trade requests

Users can send a request containing:

- Person receiving the request
- Skill being offered
- Skill being requested
- Optional message

Requests support:

- Pending
- Accepted
- Rejected
- Cancelled

Users can view:

- Received requests
- Sent requests

Ownership and authorization checks are performed on the backend.

### Trades

Accepting a trade request creates a real trade record.

Trades support:

- Active
- Completed
- Cancelled

Trade records contain:

- The two users
- The two exchanged skills
- Meeting information
- Creation time
- Completion time

Users can update meeting information and mark their trade completed/cancelled.

### Messaging

Ply includes one-to-one conversations.

Users can:

- Start a conversation with another user.
- View their conversation list.
- See the latest message in each conversation.
- Open a full message thread.
- Send messages.

The backend checks conversation participation before returning or accepting messages.

### Reviews

After a trade is completed, either participant can leave one review for the other participant.

Reviews contain:

- 1–5 star rating
- Optional written review
- Reviewer
- Reviewed user
- Trade reference
- Creation date

A database uniqueness constraint prevents the same user from reviewing the same trade more than once.

Profile ratings are calculated from real reviews.

### Badges

Ply includes real activity-based badges:

| Badge | Rule |
|---|---|
| First Trade | Complete at least 1 trade |
| 5 Trades | Complete at least 5 trades |
| 10 Trades | Complete at least 10 trades |
| Skill Explorer | List at least 5 skills to learn |
| Helpful Teacher | List at least 5 skills to teach |
| Trusted Trader | Maintain a 4.5+ average across at least 3 reviews |

Badges are awarded from actual database activity. They are not manually hardcoded onto profiles.

Badge checks run after relevant activity such as completed trades and reviews.

### Stories

Ply has an Instagram-style Stories system.

Users can:

- Upload an image Story.
- Upload a video Story.
- Post from their device.
- View active Stories.
- Open another user's Story viewer.
- Open their own Story viewer.
- Delete their own Story.

Stories have a real 24-hour expiration timestamp in PostgreSQL.

The active Stories endpoint only returns non-expired Stories.

### Story archive

The user's own Stories remain available in a private archive, including:

- Active Stories
- Expired Stories

This makes it possible to reuse older Stories for Highlights.

### Story viewer

The Story viewer supports:

- Full-screen media viewing.
- Image Stories.
- Video Stories.
- Automatic progression for images.
- Video progression based on playback.
- Navigation between Stories.
- Closing the viewer.
- Deleting owned Stories.

### Highlights

Highlights allow users to keep selected Stories on their profile beyond the 24-hour Story lifetime.

Users can:

- Create a Highlight.
- Give it a title.
- Select archived Stories.
- Choose a cover based on Story media.
- View Highlight Stories.
- Delete their own Highlights.

An important database design decision keeps Highlights independent from Story expiration/deletion:

When Stories are added to a Highlight, their media URL/type is copied into `highlight_stories`. The original Story ID is retained only as a reference.

Therefore:

```text
Story expires
     ↓
Story can disappear from active Stories
     ↓
Highlight still contains its copied media
```

Deleting a Highlight does not delete the original Story.

### Instagram-style posts

Ply also includes a social post system.

Users can:

- Upload image posts.
- Upload video posts.
- Add captions.
- View the main post feed.
- View posts on a user's profile.
- Like/unlike posts.
- See real like counts.
- Open comments.
- Add comments.
- See real comment counts.
- Delete their own posts.

Posts are stored in PostgreSQL and their media is stored through the same authenticated media-upload flow.

Likes use a unique `(post_id, user_id)` constraint so a user can only have one active like per post.

Comments are real database records and are attached to both the post and the commenting user.

### Media uploads

The frontend uploads media through:

```text
POST /api/media
```

The backend:

1. Requires authentication.
2. Accepts a multipart file.
3. Keeps the upload in memory while processing it.
4. Generates a unique storage path.
5. Uploads the file to Supabase Storage.
6. Returns the public media URL.

The configured upload limit is **25 MB per file**.

Media is designed to live in Supabase Storage rather than Railway's ephemeral filesystem, so images/videos can survive backend restarts and redeployments.

### Dark mode

The frontend includes a working dark-mode toggle.

The current theme is stored locally in the browser with:

```text
ply_theme = light | dark
```

The `dark` class is applied to the document root when dark mode is enabled.

Dark mode is therefore a frontend/browser preference rather than a database profile field.

### Settings

The Settings page contains:

- Account
- Appearance
- Notifications
- Privacy

Account actions include:

- Open/edit profile
- Log out
- Delete account

Appearance includes the dark-mode toggle.

The Notifications and Privacy controls are currently UI-level settings and are not persisted to PostgreSQL.

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript |
| Frontend tooling | Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | React Router |
| Backend | Node.js, Express 4 |
| Backend language | TypeScript |
| Database | PostgreSQL |
| Recommended hosted database | Supabase Postgres |
| Authentication | JWT |
| Password hashing | bcryptjs |
| File uploads | Multer |
| Media storage | Supabase Storage |
| API style | REST |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Source control | GitHub |

### Backend dependencies

The backend uses:

- `express`
- `pg`
- `bcryptjs`
- `jsonwebtoken`
- `cors`
- `dotenv`
- `multer`
- `uuid`
- TypeScript/ts-node tooling

### Frontend dependencies

The frontend uses:

- `react`
- `react-dom`
- `react-router-dom`
- `vite`
- `typescript`
- `tailwindcss`
- `postcss`
- `autoprefixer`

---

## 4. Project structure

```text
plyfinal/
├── backend/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_posts.sql
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── badges.ts
│   │   │   ├── discover.ts
│   │   │   ├── highlights.ts
│   │   │   ├── matches.ts
│   │   │   ├── media.ts
│   │   │   ├── messages.ts
│   │   │   ├── posts.ts
│   │   │   ├── requests.ts
│   │   │   ├── reviews.ts
│   │   │   ├── skills.ts
│   │   │   ├── stories.ts
│   │   │   ├── trades.ts
│   │   │   └── users.ts
│   │   ├── db.ts
│   │   ├── index.ts
│   │   └── migrate.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Highlights.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── PersonCard.tsx
│   │   │   ├── Posts.tsx
│   │   │   ├── StoryBar.tsx
│   │   │   ├── StoryViewer.tsx
│   │   │   └── TradeRequestModal.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Discover.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Matches.tsx
│   │   │   ├── Messages.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Requests.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Trades.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vite.config.ts
│
└── README.md
```

---

## 5. Database

The schema is split into two migrations.

### `001_init.sql`

Creates the main application tables:

```text
users
profiles
skills
user_skills
trade_requests
trades
conversations
messages
reviews
badges
user_badges
stories
highlights
highlight_stories
```

### `002_posts.sql`

Adds the social post system:

```text
posts
post_likes
post_comments
```

### Relationships

The database uses:

- UUID primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Indexes.
- `ON DELETE CASCADE` where child data belongs entirely to an account/parent.
- `ON DELETE SET NULL` for a Highlight's reference to its original Story.

### Account deletion

Deleting a user cascades through their owned data, including:

- Profile
- User skills
- Trade requests
- Trades
- Conversations/messages
- Reviews
- Earned badges
- Stories
- Highlights
- Posts
- Post likes
- Post comments

The foreign-key relationships prevent another user's unrelated records from being deleted merely because they interacted with the deleted account.

---

## 6. REST API

All API routes are under `/api`.

### Health

```http
GET /health
```

### Authentication

```http
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
DELETE /api/auth/account
```

### Users / profiles

```http
GET /api/users/:id
PUT /api/users/:id
```

### Skills

```http
GET    /api/skills
GET    /api/skills/mine
POST   /api/skills
PUT    /api/skills/:id
DELETE /api/skills/:id
```

### Discovery and matching

```http
GET /api/discover?skill=&city=&mode=
GET /api/matches
```

### Trade requests

```http
GET    /api/requests
POST   /api/requests
PUT    /api/requests/:id
DELETE /api/requests/:id
```

### Trades

```http
GET /api/trades
GET /api/trades/:id
PUT /api/trades/:id
```

`PUT /api/trades/:id` supports:

```json
{
  "status": "completed"
}
```

or:

```json
{
  "status": "cancelled"
}
```

and can also update `meeting_info`.

### Messages

```http
GET  /api/messages
GET  /api/messages/:conversationId
POST /api/messages
```

### Reviews

```http
GET  /api/reviews/:userId
POST /api/reviews
```

### Badges

```http
GET /api/badges
GET /api/badges/:userId
```

### Stories

```http
GET    /api/stories
GET    /api/stories/archive
POST   /api/stories
DELETE /api/stories/:id
```

### Highlights

```http
GET    /api/highlights/:userId
POST   /api/highlights
PUT    /api/highlights/:id
DELETE /api/highlights/:id
```

Highlight editing supports:

- Rename
- Cover changes
- Adding archived Stories
- Removing Highlight Stories
- Reordering Highlight Stories

### Media

```http
POST /api/media
```

Accepts a multipart `file`.

### Posts

```http
GET    /api/posts
GET    /api/posts/user/:userId
POST   /api/posts
DELETE /api/posts/:id

POST   /api/posts/:id/like

GET    /api/posts/:id/comments
POST   /api/posts/:id/comments
```

---

## 7. API security and ownership

Protected routes use the `requireAuth` middleware.

The backend obtains the user ID from the verified JWT rather than trusting a user ID supplied by the frontend.

Ownership checks are also enforced server-side.

Examples:

- A user can only edit their own profile.
- A user can only delete their own Story.
- A user can only delete their own post.
- A user can only edit/delete their own Highlight.
- A user can only cancel/update requests they are authorized to modify.
- Only trade participants can access their trade.
- Only conversation participants can read a conversation.
- Only trade participants can review a completed trade.

This means hiding a button in the React UI is **not** the only security mechanism.

### Media security

The Supabase service-role key is used only by the backend.

It should never be placed in:

```text
frontend/.env
Vercel environment variables
client-side JavaScript
```

Only the public media URL is returned to the browser.

---

## 8. Running Ply locally

### Prerequisites

Install:

- Node.js 18+
- npm
- PostgreSQL

You can either:

- run PostgreSQL locally, or
- create a Supabase project and use its PostgreSQL connection string.

### Backend

From the project root:

```bash
cd backend
```

Create a `.env` based on `.env.example`.

At minimum configure:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_long_random_secret
CORS_ORIGIN=http://localhost:5173
PORT=4000
API_BASE_URL=http://localhost:4000
```

For media uploads also configure:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=ply-media
```

Install dependencies:

```bash
npm install
```

Run migrations:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
```

The API runs on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

### Frontend

Open another terminal:

```bash
cd frontend
```

Configure:

```env
VITE_API_URL=http://localhost:4000
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

Open that address in the browser.

### Testing with real data

Because the application does not use seeded demo accounts:

1. Register Account A.
2. Add skills to teach and learn.
3. Open an incognito/private browser window.
4. Register Account B.
5. Add complementary skills.
6. Test Discover and Matches.
7. Send a trade request.
8. Accept it from the other account.
9. Open the conversation and exchange messages.
10. Complete the trade.
11. Leave a review.
12. Test Stories, archive, Highlights, and posts.

This gives a realistic end-to-end test using actual database records.

---

## 9. Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL/Supabase Postgres connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `PORT` | Backend port; defaults to 4000 |
| `API_BASE_URL` | Base URL of the backend |
| `SUPABASE_URL` | Supabase project URL for Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase Storage credential |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket, normally `ply-media` |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | URL of the Ply backend API |

**Important:** never commit real passwords, JWT secrets, database credentials, or Supabase service-role keys to GitHub. Use placeholders in example environment files and store production secrets in the hosting provider's environment-variable settings.

---

## 10. Deployment

The intended deployment architecture is:

```text
                 ┌─────────────────┐
                 │     Vercel      │
                 │ React + Vite UI │
                 └────────┬────────┘
                          │ REST API
                          ▼
                 ┌─────────────────┐
                 │    Railway     │
                 │ Express API     │
                 └───────┬─────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      ┌──────────────┐      ┌────────────────┐
      │ Supabase DB  │      │ Supabase       │
      │ PostgreSQL   │      │ Storage        │
      └──────────────┘      └────────────────┘
```

### Supabase

1. Create a Supabase project.
2. Get the PostgreSQL connection string from the database settings.
3. Set it as `DATABASE_URL`.
4. Run:

```bash
cd backend
npm run migrate
```

5. Create a Storage bucket named:

```text
ply-media
```

The backend expects the bucket to be available for public media URLs.

### Railway

Create a new Railway service connected to the GitHub repository.

Recommended root directory:

```text
backend
```

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Configure:

```env
DATABASE_URL=...
JWT_SECRET=...
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN
API_BASE_URL=https://YOUR-RENDER-DOMAIN
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=ply-media
```

Do not expose the Supabase service-role key to the frontend.

### Vercel

Import the repository into Vercel for the frontend.

Set the project root to:

```text
frontend
```

Set:

```env
VITE_API_URL=https://YOUR-RENDER-DOMAIN
```

Deploy the frontend.

Then update Render:

```env
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN
```

and redeploy the Railway backend.

### SPA routing

The frontend includes `vercel.json` so client-side React Router routes can resolve correctly on Vercel.

---

## 11. Frontend routes

The React application currently exposes:

```text
/login
/register

/
/discover
/matches
/profile/:id
/requests
/trades
/messages
/messages/:conversationId
/settings
```

All application routes other than login/register are protected by the `Protected` route wrapper.

Unknown routes redirect back to `/`.

---

## 12. Main frontend screens

### Home

Contains:

- Story bar
- Welcome message
- Quick links to skills/profile
- Discover shortcut
- Matches shortcut
- Post feed/composer

### Discover

Contains:

- Skill search
- City filter
- Online/in-person/both filter
- Real database results
- Person cards
- Compatibility information where available

### Matches

Shows real reciprocal skill matches calculated by the backend.

### Profile

Contains:

- Avatar
- Name/username
- Bio
- Location
- Exchange mode
- Teach skills
- Learn skills
- Badges
- Rating/reviews
- Highlights
- Posts
- Edit profile controls for the owner
- Skill management for the owner
- Trade request action when viewing another user

### Requests

Provides separate:

- Received
- Sent

request views.

### Trades

Shows active/completed/cancelled trades and allows completed trades to be reviewed.

### Messages

Provides:

- Conversation list
- Conversation threads
- Message sending
- Links back to the other person's profile

### Settings

Provides:

- Account controls
- Profile navigation
- Logout
- Account deletion
- Appearance/dark mode
- Notification UI
- Privacy UI

---

## 13. Design system

Ply uses a deliberately editorial, social-product visual language.

### Colors

- **Cobalt:** `#2B4CFF`
- **Tangerine:** `#FF7A3D`
- **Bone:** `#F3EFE6`
- **Ink:** `#15131C`

Supporting Tailwind colors are used for states such as clay/sage where appropriate.

### Typography

- **Fraunces** — display/headline style
- **Space Grotesk** — interface/body style

### Visual principles

- Sharp borders rather than soft card shadows.
- Strong 2px structural borders.
- Skill tags are pill-shaped because they represent tradable skill tokens.
- Minimal interface.
- Responsive layouts for desktop and mobile.
- Mobile bottom navigation.
- Desktop sidebar navigation.
- Social profile presentation rather than a traditional marketplace listing layout.

The product avoids using emoji as UI decoration.

---

## 14. Real-data architecture

A core requirement of Ply is that the application should behave like a real product rather than a visual prototype.

### There are no hardcoded:

- User accounts
- Profiles
- Skill matches
- Trade requests
- Trades
- Conversations
- Messages
- Reviews
- Stories
- Highlights
- Posts
- Likes
- Comments

### Data flow

```text
React component
      ↓
api.ts
      ↓
REST endpoint
      ↓
Express route
      ↓
requireAuth (when protected)
      ↓
PostgreSQL query
      ↓
JSON response
      ↓
React state/UI
```

Media follows:

```text
Device
  ↓
POST /api/media
  ↓
Express + Multer
  ↓
Supabase Storage
  ↓
Public media URL
  ↓
Database record
  ↓
React displays URL
```

---

## 15. Database design decisions

### UUIDs

Application records use UUIDs generated by PostgreSQL.

### Foreign keys

Foreign keys keep relationships consistent across:

- Users
- Profiles
- Skills
- Requests
- Trades
- Messages
- Reviews
- Badges
- Stories
- Highlights
- Posts

### Cascading deletes

Child data that belongs exclusively to a deleted parent is removed through `ON DELETE CASCADE`.

### Highlight/Story separation

Highlights intentionally copy Story media into `highlight_stories`.

This avoids making a permanent Highlight depend on an active Story row.

### Post interactions

Likes and comments are separate tables rather than counters stored directly on a post. Counts are calculated from the real interaction records.

This prevents the displayed like/comment totals from being a hardcoded frontend value.

---

## 16. Current limitations / intentionally incomplete settings

The main product workflow is implemented, but these areas are intentionally limited:

### Notifications settings

The Settings page contains notification toggles for:

- Trades
- Matches
- Messages

They are currently local UI state and are not stored in the database.

### Privacy settings

The Settings page contains a profile-visibility control, but the current backend schema does not persist this setting.

### No real-time messaging

Messages are stored and retrieved through REST requests. The current implementation does not use WebSockets or a realtime subscription layer.

### No dedicated notification system

Trade/match/message notification preferences are present in Settings, but there is no separate notification table/service or push-notification system yet.

### Media processing

Uploads are stored as provided. There is no dedicated image resizing, video transcoding, thumbnail generation, or CDN transformation pipeline in the current code.

### Social feed ranking

Posts are currently returned by creation time rather than a personalized recommendation algorithm.

These limitations do not prevent the core skill-barter workflow from functioning.

---

## 17. Important security notes

Before publishing or deploying this project:

- Use a strong, unique `JWT_SECRET`.
- Use the real Supabase project credentials only in server-side environment variables.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through Vite or Vercel client-side variables.
- Never commit `.env` files containing real secrets.
- If a real database password, JWT secret, or service credential has ever been committed or shared publicly, rotate it before production deployment.
- Restrict `CORS_ORIGIN` to the actual frontend domain(s) in production.
- Keep database credentials out of the frontend.

---

## 18. Useful npm commands

### Backend

```bash
cd backend

npm install
npm run migrate
npm run dev
npm run build
npm start
```

### Frontend

```bash
cd frontend

npm install
npm run dev
npm run build
npm run preview
```

---

## 19. Production verification checklist

After deployment, test the application from the live Vercel URL rather than only localhost.

### Authentication

- [ ] Register
- [ ] Login
- [ ] Refresh while logged in
- [ ] Logout
- [ ] Delete account

### Profile

- [ ] Edit profile
- [ ] Upload avatar
- [ ] Add teach skill
- [ ] Add learn skill
- [ ] Remove skill
- [ ] Open another user's profile

### Discovery

- [ ] Search by skill
- [ ] Filter by city
- [ ] Filter by exchange mode
- [ ] Verify real results

### Matching

- [ ] Add complementary skills to two accounts
- [ ] Verify compatibility changes from real data
- [ ] Verify matches disappear when there is no overlap

### Trade workflow

- [ ] Send request
- [ ] Receive request
- [ ] Accept request
- [ ] Reject request
- [ ] Cancel sent request
- [ ] Open resulting trade
- [ ] Add/update meeting information
- [ ] Complete trade
- [ ] Cancel trade

### Messaging

- [ ] Start a conversation
- [ ] Send messages
- [ ] Open conversation history
- [ ] Verify only participants can access the thread

### Reviews and badges

- [ ] Review a completed trade
- [ ] Verify the profile rating changes
- [ ] Verify badge rules use actual activity

### Stories

- [ ] Upload image Story
- [ ] Upload video Story
- [ ] View another user's Story
- [ ] View own Story
- [ ] Delete own Story
- [ ] Verify 24-hour expiration behavior
- [ ] Open private archive

### Highlights

- [ ] Create Highlight
- [ ] Add archived Story
- [ ] View Highlight
- [ ] Delete Highlight
- [ ] Verify Highlight content survives Story expiration

### Posts

- [ ] Create image post
- [ ] Create video post
- [ ] Add caption
- [ ] Like/unlike
- [ ] Add comment
- [ ] View comments
- [ ] Delete own post
- [ ] View posts on another user's profile

### UI

- [ ] Test desktop layout
- [ ] Test mobile layout
- [ ] Test dark mode
- [ ] Test profile navigation from Stories
- [ ] Test profile navigation from Requests/Trades/Messages
- [ ] Verify no broken API URLs
- [ ] Verify no browser console errors

---

## 20. Submission summary

Ply is a full-stack skill-barter platform that lets users exchange skills instead of money. Users create profiles, list what they can teach and want to learn, discover people, receive real compatibility matches, send and manage trade requests, chat, complete trades, leave reviews, and earn activity-based badges. The platform also includes a social layer with Instagram-style Stories, a private Story archive, persistent Highlights, and image/video posts with real likes and comments. It is built with React, TypeScript, Vite, Tailwind CSS, Node.js, Express, PostgreSQL/Supabase, JWT authentication, bcrypt password hashing, and Supabase Storage, with a deployment architecture using Vercel for the frontend and Render for the backend.

### Biggest implementation challenge

One of the key database design challenges was keeping Stories and Highlights decoupled.

A Highlight must continue to work after the original Story expires or is deleted. Instead of making a Highlight depend directly on the live `stories` row, Ply copies the Story's media URL and media type into `highlight_stories` when the Story is added to a Highlight.

That gives the system this behavior:

```text
Original Story
     │
     ├── active for 24 hours
     │
     ├── expires
     │
     └── can be deleted
            │
            X original Story row

Highlight
     │
     └── keeps its own copied media reference
             │
             └── remains available on the profile
```

This separation makes Story expiration/deletion independent from the user's permanent Highlights.

---

## 21. Final project status

### Fully wired core functionality

- Real authentication
- Persistent PostgreSQL data
- Profiles
- Profile editing
- Avatars
- Skills
- Skill levels
- Discover
- Real compatibility matching
- Trade requests
- Trades
- Messaging
- Reviews
- Activity-based badges
- Stories
- Story expiration
- Story archive
- Highlights
- Image/video media uploads
- Instagram-style posts
- Post likes
- Post comments
- Account deletion
- Profile navigation
- Responsive desktop/mobile UI
- Dark mode

### Settings that are still UI-only

- Notification preferences
- Profile visibility/privacy preference

### Architecture

```text
React + TypeScript + Vite
            │
            ▼
     REST API / JWT
            │
            ▼
 Node.js + Express + TypeScript
            │
       ┌────┴────┐
       ▼         ▼
 PostgreSQL   Supabase Storage
```

Ply is therefore a complete working full-stack application rather than a static frontend prototype: users create the data themselves, the backend persists it, the matching system calculates results from that data, and the social/trade features operate through real API and database interactions.
