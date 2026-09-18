import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const postSelect = `
  select p.id, p.author_id, u.username as author_username, pr.name as author_name, pr.avatar_url as author_avatar,
         p.media_url, p.media_type, p.caption, p.created_at,
         count(distinct pl.id)::int as likes_count,
         count(distinct pc.id)::int as comments_count,
         exists(select 1 from post_likes my_like where my_like.post_id = p.id and my_like.user_id = $1) as liked_by_me
  from posts p
  join users u on u.id = p.author_id
  join profiles pr on pr.user_id = p.author_id
  left join post_likes pl on pl.post_id = p.id
  left join post_comments pc on pc.post_id = p.id`;

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `${postSelect}
     group by p.id, u.username, pr.name, pr.avatar_url
     order by p.created_at desc`,
    [req.userId]
  );
  res.json(result.rows);
});

router.get("/user/:userId", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `${postSelect}
     where p.author_id = $2
     group by p.id, u.username, pr.name, pr.avatar_url
     order by p.created_at desc`,
    [req.userId, req.params.userId]
  );
  res.json(result.rows);
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { media_url, media_type, caption = "" } = req.body || {};

  if (!media_url || !["image", "video"].includes(media_type)) {
    return res.status(400).json({
      error: "A media URL and a type of image or video are required.",
    });
  }

  const cleanCaption = String(caption).trim().slice(0, 2200);

  const result = await query(
    `insert into posts (author_id, media_url, media_type, caption)
     values ($1, $2, $3, $4)
     returning id, author_id, media_url, media_type, caption, created_at`,
    [req.userId, media_url, media_type, cleanCaption]
  );

  res.status(201).json(result.rows[0]);
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    "delete from posts where id = $1 and author_id = $2 returning id",
    [req.params.id, req.userId]
  );

  if (!result.rows.length) {
    return res.status(404).json({
      error: "That post was not found.",
    });
  }

  res.json({ ok: true });
});

router.post("/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const exists = await query(
    "select 1 from posts where id = $1",
    [req.params.id]
  );

  if (!exists.rows.length) {
    return res.status(404).json({
      error: "That post was not found.",
    });
  }

  const current = await query(
    "select 1 from post_likes where post_id = $1 and user_id = $2",
    [req.params.id, req.userId]
  );

  if (current.rows.length) {
    await query(
      "delete from post_likes where post_id = $1 and user_id = $2",
      [req.params.id, req.userId]
    );
  } else {
    await query(
      "insert into post_likes (post_id, user_id) values ($1, $2)",
      [req.params.id, req.userId]
    );
  }

  const count = await query(
    "select count(*)::int as count from post_likes where post_id = $1",
    [req.params.id]
  );

  res.json({
    liked: !current.rows.length,
    likes_count: count.rows[0].count,
  });
});

router.get("/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select pc.id, pc.post_id, pc.user_id, u.username, pr.name, pr.avatar_url, pc.body, pc.created_at
     from post_comments pc
     join users u on u.id = pc.user_id
     join profiles pr on pr.user_id = pc.user_id
     where pc.post_id = $1
     order by pc.created_at asc`,
    [req.params.id]
  );

  res.json(result.rows);
});

router.post("/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const body = String(req.body?.body || "").trim();

  if (!body) {
    return res.status(400).json({
      error: "Comment cannot be empty.",
    });
  }

  if (body.length > 1000) {
    return res.status(400).json({
      error: "Comment is too long.",
    });
  }

  const post = await query(
    "select 1 from posts where id = $1",
    [req.params.id]
  );

  if (!post.rows.length) {
    return res.status(404).json({
      error: "That post was not found.",
    });
  }

  const result = await query(
    `insert into post_comments (post_id, user_id, body)
     values ($1, $2, $3)
     returning id, post_id, user_id, body, created_at`,
    [req.params.id, req.userId, body]
  );

  const user = await query(
    `select u.username, pr.name, pr.avatar_url
     from users u
     join profiles pr on pr.user_id = u.id
     where u.id = $1`,
    [req.userId]
  );

  res.status(201).json({
    ...result.rows[0],
    ...user.rows[0],
  });
});

export default router;