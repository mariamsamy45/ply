-- Ply database schema
-- Run this against your PostgreSQL / Supabase database before starting the API.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

create extension if not exists "pgcrypto";

-- ========== USERS & PROFILES ==========

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  name text not null,
  bio text not null default '',
  avatar_url text,
  city text not null default '',
  country text not null default '',
  mode text not null default 'both' check (mode in ('online', 'in_person', 'both')),
  updated_at timestamptz not null default now()
);

-- ========== SKILLS ==========

-- master list of skill names, grows as users add new ones
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  direction text not null check (direction in ('teach', 'learn')),
  level text not null default 'intermediate' check (level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  unique (user_id, skill_id, direction)
);

-- ========== TRADE REQUESTS & TRADES ==========

create table if not exists trade_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  offered_skill_id uuid not null references skills(id),
  requested_skill_id uuid not null references skills(id),
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references trade_requests(id) on delete set null,
  user_a uuid not null references users(id) on delete cascade,
  user_b uuid not null references users(id) on delete cascade,
  skill_a_id uuid not null references skills(id),
  skill_b_id uuid not null references skills(id),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  meeting_info text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ========== MESSAGING ==========

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users(id) on delete cascade,
  user_b uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ========== REVIEWS ==========

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  reviewer_id uuid not null references users(id) on delete cascade,
  reviewed_id uuid not null references users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (trade_id, reviewer_id)
);

-- ========== BADGES ==========

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

insert into badges (code, name, description) values
  ('first_trade', 'First Trade', 'Completed your first skill trade'),
  ('five_trades', '5 Trades', 'Completed five skill trades'),
  ('ten_trades', '10 Trades', 'Completed ten skill trades'),
  ('skill_explorer', 'Skill Explorer', 'Listed five or more skills you want to learn'),
  ('helpful_teacher', 'Helpful Teacher', 'Listed five or more skills you can teach'),
  ('trusted_trader', 'Trusted Trader', 'Maintained a 4.5+ average rating across 3+ reviews')
on conflict (code) do nothing;

-- ========== STORIES & HIGHLIGHTS ==========

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null,
  cover text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists highlight_stories (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references highlights(id) on delete cascade,
  -- story content is copied at add-time (media_url/media_type) so deleting a highlight
  -- never touches the original story, and an expired story can still live in a highlight
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  source_story_id uuid references stories(id) on delete set null,
  position int not null default 0,
  added_at timestamptz not null default now()
);

-- ========== INDEXES ==========

create index if not exists idx_user_skills_user on user_skills(user_id);
create index if not exists idx_user_skills_skill on user_skills(skill_id);
create index if not exists idx_trade_requests_receiver on trade_requests(receiver_id, status);
create index if not exists idx_trade_requests_sender on trade_requests(sender_id, status);
create index if not exists idx_trades_users on trades(user_a, user_b);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_reviews_reviewed on reviews(reviewed_id);
create index if not exists idx_stories_owner on stories(owner_id, expires_at);
create index if not exists idx_highlights_owner on highlights(owner_id);
