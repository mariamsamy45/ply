-- Social posts: Instagram-like image/video posts with captions, likes, and comments.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_author_created
on posts(author_id, created_at desc);

create index if not exists idx_post_likes_post
on post_likes(post_id);

create index if not exists idx_post_comments_post
on post_comments(post_id, created_at);