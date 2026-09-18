import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// Checks the real state of a user's activity against each badge's rule and
// awards any newly-earned badges. Called after a trade completes or a review is left.
export async function awardBadgesForUser(userId: string) {
  const tradeCount = await query(
    "select count(*)::int as n from trades where (user_a = $1 or user_b = $1) and status = 'completed'",
    [userId]
  );
  const n = tradeCount.rows[0].n as number;

  const learnCount = await query(
    "select count(*)::int as n from user_skills where user_id = $1 and direction = 'learn'",
    [userId]
  );
  const teachCount = await query(
    "select count(*)::int as n from user_skills where user_id = $1 and direction = 'teach'",
    [userId]
  );
  const ratingRow = await query(
    "select avg(rating)::numeric(3,2) as average, count(*)::int as count from reviews where reviewed_id = $1",
    [userId]
  );

  const earnedCodes: string[] = [];
  if (n >= 1) earnedCodes.push("first_trade");
  if (n >= 5) earnedCodes.push("five_trades");
  if (n >= 10) earnedCodes.push("ten_trades");
  if (learnCount.rows[0].n >= 5) earnedCodes.push("skill_explorer");
  if (teachCount.rows[0].n >= 5) earnedCodes.push("helpful_teacher");
  const avg = ratingRow.rows[0].average ? Number(ratingRow.rows[0].average) : 0;
  if (avg >= 4.5 && ratingRow.rows[0].count >= 3) earnedCodes.push("trusted_trader");

  if (earnedCodes.length === 0) return;

  await query(
    `insert into user_badges (user_id, badge_id)
     select $1, b.id from badges b where b.code = any($2::text[])
     on conflict (user_id, badge_id) do nothing`,
    [userId, earnedCodes]
  );
}

router.get("/", async (_req, res) => {
  const result = await query("select code, name, description from badges order by name");
  res.json(result.rows);
});

router.get("/:userId", async (req, res) => {
  const result = await query(
    `select b.code, b.name, b.description, ub.earned_at from user_badges ub
     join badges b on b.id = ub.badge_id where ub.user_id = $1 order by ub.earned_at desc`,
    [req.params.userId]
  );
  res.json(result.rows);
});

export default router;
