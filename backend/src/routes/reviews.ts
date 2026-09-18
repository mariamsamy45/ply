import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { awardBadgesForUser } from "./badges";

const router = Router();

router.get("/:userId", async (req, res) => {
  const result = await query(
    `select r.id, r.rating, r.body, r.created_at, r.reviewer_id, p.name as reviewer_name, u.username as reviewer_username
     from reviews r
     join users u on u.id = r.reviewer_id
     join profiles p on p.user_id = r.reviewer_id
     where r.reviewed_id = $1
     order by r.created_at desc`,
    [req.params.userId]
  );
  res.json(result.rows);
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { trade_id, rating, body } = req.body || {};
  if (!trade_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "A trade and a rating from 1 to 5 are required." });
  }

  const tradeResult = await query("select * from trades where id = $1", [trade_id]);
  const trade = tradeResult.rows[0];
  if (!trade) return res.status(404).json({ error: "That trade was not found." });
  if (trade.status !== "completed") {
    return res.status(400).json({ error: "You can only review a trade after it's completed." });
  }
  if (trade.user_a !== req.userId && trade.user_b !== req.userId) {
    return res.status(403).json({ error: "You can only review trades you were part of." });
  }

  const reviewedId = trade.user_a === req.userId ? trade.user_b : trade.user_a;

  try {
    const result = await query(
      "insert into reviews (trade_id, reviewer_id, reviewed_id, rating, body) values ($1, $2, $3, $4, coalesce($5, '')) returning *",
      [trade_id, req.userId, reviewedId, rating, body]
    );
    await awardBadgesForUser(reviewedId);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "You've already reviewed this trade." });
    }
    throw err;
  }
});

export default router;
