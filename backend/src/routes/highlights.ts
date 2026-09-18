import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

async function attachStories(highlight: any) {
  const stories = await query(
    "select id, media_url, media_type, position, source_story_id from highlight_stories where highlight_id = $1 order by position asc",
    [highlight.id]
  );
  return { ...highlight, stories: stories.rows };
}

// GET /api/highlights/:userId -> a user's highlights (public, shown on their profile)
router.get("/:userId", async (req, res) => {
  const result = await query(
    "select * from highlights where owner_id = $1 order by created_at asc",
    [req.params.userId]
  );
  const withStories = await Promise.all(result.rows.map(attachStories));
  res.json(withStories);
});

// POST /api/highlights -> create a highlight from a list of archived story ids
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { title, story_ids, cover } = req.body || {};
  if (!title || !Array.isArray(story_ids) || story_ids.length === 0) {
    return res.status(400).json({ error: "A title and at least one story are required." });
  }

  const stories = await query(
    "select id, media_url, media_type from stories where id = any($1::uuid[]) and owner_id = $2",
    [story_ids, req.userId]
  );
  if (stories.rows.length === 0) {
    return res.status(400).json({ error: "None of the selected stories could be found in your archive." });
  }

  const highlightResult = await query(
    "insert into highlights (owner_id, title, cover) values ($1, $2, coalesce($3, $4)) returning *",
    [req.userId, title, cover, stories.rows[0].media_url]
  );
  const highlight = highlightResult.rows[0];

  await Promise.all(
    stories.rows.map((s, i) =>
      query(
        "insert into highlight_stories (highlight_id, media_url, media_type, source_story_id, position) values ($1, $2, $3, $4, $5)",
        [highlight.id, s.media_url, s.media_type, s.id, i]
      )
    )
  );

  res.status(201).json(await attachStories(highlight));
});

async function assertOwner(highlightId: string, userId: string) {
  const result = await query("select * from highlights where id = $1", [highlightId]);
  const highlight = result.rows[0];
  if (!highlight) return null;
  if (highlight.owner_id !== userId) return undefined; // exists but not owned
  return highlight;
}

// PUT /api/highlights/:id -> rename, recover, add/remove stories, reorder
router.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const highlight = await assertOwner(req.params.id, req.userId!);
  if (highlight === null) return res.status(404).json({ error: "That highlight was not found." });
  if (highlight === undefined) return res.status(403).json({ error: "You can only edit your own highlights." });

  const { title, cover, add_story_ids, remove_story_ids, order } = req.body || {};

  if (title || cover) {
    await query("update highlights set title = coalesce($2, title), cover = coalesce($3, cover), updated_at = now() where id = $1", [
      req.params.id,
      title,
      cover,
    ]);
  }

  if (Array.isArray(add_story_ids) && add_story_ids.length > 0) {
    const stories = await query(
      "select id, media_url, media_type from stories where id = any($1::uuid[]) and owner_id = $2",
      [add_story_ids, req.userId]
    );
    const countResult = await query("select count(*)::int as n from highlight_stories where highlight_id = $1", [req.params.id]);
    let pos = countResult.rows[0].n;
    for (const s of stories.rows) {
      await query(
        "insert into highlight_stories (highlight_id, media_url, media_type, source_story_id, position) values ($1, $2, $3, $4, $5)",
        [req.params.id, s.media_url, s.media_type, s.id, pos++]
      );
    }
  }

  if (Array.isArray(remove_story_ids) && remove_story_ids.length > 0) {
    await query("delete from highlight_stories where highlight_id = $1 and id = any($2::uuid[])", [
      req.params.id,
      remove_story_ids,
    ]);
  }

  if (Array.isArray(order)) {
    // order: array of highlight_story ids in the desired sequence
    await Promise.all(
      order.map((id: string, i: number) =>
        query("update highlight_stories set position = $2 where id = $1 and highlight_id = $3", [id, i, req.params.id])
      )
    );
  }

  const updated = await query("select * from highlights where id = $1", [req.params.id]);
  res.json(await attachStories(updated.rows[0]));
});

// DELETE /api/highlights/:id -> deletes the highlight only; original stories in the archive are untouched
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const highlight = await assertOwner(req.params.id, req.userId!);
  if (highlight === null) return res.status(404).json({ error: "That highlight was not found." });
  if (highlight === undefined) return res.status(403).json({ error: "You can only delete your own highlights." });

  await query("delete from highlights where id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
