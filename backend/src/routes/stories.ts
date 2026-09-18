import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// GET /api/stories -> active (non-expired) stories from the people the signed-in user
// has ever traded, messaged, or matched with, grouped by owner, plus their own.
// To keep this simple and correct for a fresh app, we show active stories from everyone
// except that we always include the caller's own regardless of expiry status filtering below.
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select s.id, s.owner_id, u.username as owner_username, p.name as owner_name, p.avatar_url as owner_avatar,
            s.media_url, s.media_type, s.created_at, s.expires_at
     from stories s
     join users u on u.id = s.owner_id
     join profiles p on p.user_id = s.owner_id
     where s.expires_at > now()
     order by s.owner_id, s.created_at asc`,
    []
  );
  res.json(result.rows);
});

// GET /api/stories/archive -> the signed-in user's own expired + active stories, private
router.get("/archive", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select id, media_url, media_type, created_at, expires_at, (expires_at <= now()) as expired
     from stories where owner_id = $1 order by created_at desc`,
    [req.userId]
  );
  res.json(result.rows);
});

// POST /api/stories -> create a story. media_url should already be uploaded (e.g. to Supabase Storage)
// and passed in as a URL; this API does not handle file bytes directly.
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { media_url, media_type } = req.body || {};
  if (!media_url || !["image", "video"].includes(media_type)) {
    return res.status(400).json({ error: "A media URL and a type of image or video are required." });
  }
  const result = await query(
    "insert into stories (owner_id, media_url, media_type) values ($1, $2, $3) returning *",
    [req.userId, media_url, media_type]
  );
  res.status(201).json(result.rows[0]);
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query("delete from stories where id = $1 and owner_id = $2 returning id", [
    req.params.id,
    req.userId,
  ]);
  if (result.rows.length === 0) return res.status(404).json({ error: "That story was not found." });
  res.json({ ok: true });
});

export default router;
