import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { awardBadgesForUser } from "./badges";

const router = Router();

const TRADE_FIELDS = `
  t.id, t.status, t.meeting_info, t.created_at, t.completed_at,
  t.user_a, ua.username as user_a_username, ua_p.name as user_a_name,
  t.user_b, ub.username as user_b_username, ub_p.name as user_b_name,
  sa.id as skill_a_id, sa.name as skill_a_name,
  sb.id as skill_b_id, sb.name as skill_b_name
`;
const TRADE_JOIN = `
  from trades t
  join users ua on ua.id = t.user_a
  join profiles ua_p on ua_p.user_id = t.user_a
  join users ub on ub.id = t.user_b
  join profiles ub_p on ub_p.user_id = t.user_b
  join skills sa on sa.id = t.skill_a_id
  join skills sb on sb.id = t.skill_b_id
`;

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select ${TRADE_FIELDS} ${TRADE_JOIN} where t.user_a = $1 or t.user_b = $1 order by t.created_at desc`,
    [req.userId]
  );
  res.json(result.rows);
});

router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(`select ${TRADE_FIELDS} ${TRADE_JOIN} where t.id = $1`, [req.params.id]);
  const trade = result.rows[0];
  if (!trade) return res.status(404).json({ error: "That trade was not found." });
  if (trade.user_a !== req.userId && trade.user_b !== req.userId) {
    return res.status(403).json({ error: "You don't have access to this trade." });
  }
  res.json(trade);
});

// PUT /api/trades/:id -> update status (mark completed / cancelled) or meeting info
router.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { status, meeting_info } = req.body || {};
  const existing = await query("select * from trades where id = $1", [req.params.id]);
  const trade = existing.rows[0];
  if (!trade) return res.status(404).json({ error: "That trade was not found." });
  if (trade.user_a !== req.userId && trade.user_b !== req.userId) {
    return res.status(403).json({ error: "You don't have access to this trade." });
  }
  if (status && !["completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Status must be completed or cancelled." });
  }

  const result = await query(
    `update trades set
       status = coalesce($2, status),
       meeting_info = coalesce($3, meeting_info),
       completed_at = case when $2 = 'completed' then now() else completed_at end
     where id = $1
     returning *`,
    [req.params.id, status, meeting_info]
  );

  if (status === "completed") {
    await awardBadgesForUser(trade.user_a);
    await awardBadgesForUser(trade.user_b);
  }

  res.json(result.rows[0]);
});

export default router;
