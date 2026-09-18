import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

async function findOrCreateSkill(name: string) {
  const trimmed = name.trim();
  const existing = await query("select id, name from skills where lower(name) = lower($1)", [trimmed]);
  if (existing.rows.length > 0) return existing.rows[0];
  const created = await query("insert into skills (name) values ($1) returning id, name", [trimmed]);
  return created.rows[0];
}

// GET /api/skills -> full master list, used for autocomplete
router.get("/", async (_req, res) => {
  const result = await query("select id, name from skills order by name");
  res.json(result.rows);
});

// GET /api/skills/mine -> the signed-in user's own skills, split by direction
router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select us.id, s.id as skill_id, s.name, us.direction, us.level
     from user_skills us join skills s on s.id = us.skill_id
     where us.user_id = $1 order by us.direction, s.name`,
    [req.userId]
  );
  res.json(result.rows);
});

// POST /api/skills -> add a skill to the signed-in user's teach/learn list
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { name, direction, level } = req.body || {};
  if (!name || !["teach", "learn"].includes(direction)) {
    return res.status(400).json({ error: "A skill name and direction of teach or learn are required." });
  }
  const skill = await findOrCreateSkill(name);
  try {
    const result = await query(
      `insert into user_skills (user_id, skill_id, direction, level)
       values ($1, $2, $3, coalesce($4, 'intermediate'))
       returning id, skill_id, direction, level`,
      [req.userId, skill.id, direction, level]
    );
    res.status(201).json({ ...result.rows[0], name: skill.name });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "That skill is already on your list." });
    }
    throw err;
  }
});

// PUT /api/skills/:id -> update level of one of the signed-in user's skills
router.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { level } = req.body || {};
  const result = await query(
    `update user_skills set level = coalesce($3, level)
     where id = $1 and user_id = $2
     returning id, skill_id, direction, level`,
    [req.params.id, req.userId, level]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "That skill entry was not found." });
  res.json(result.rows[0]);
});

// DELETE /api/skills/:id -> remove a skill from the signed-in user's list
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    "delete from user_skills where id = $1 and user_id = $2 returning id",
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "That skill entry was not found." });
  res.json({ ok: true });
});

export default router;
