import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getSkillSets, scoreMatch } from "./discover";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const { teach: myTeach, learn: myLearn } = await getSkillSets(req.userId!);

  if (myTeach.size === 0 && myLearn.size === 0) {
    return res.json([]);
  }

  const others = await query(
    `select u.id, u.username, p.name, p.bio, p.avatar_url, p.city, p.country, p.mode
     from users u join profiles p on p.user_id = u.id
     where u.id != $1`,
    [req.userId]
  );

  const results = await Promise.all(
    others.rows.map(async (c) => {
      const { teach, learn } = await getSkillSets(c.id);
      const { score, theyTeachIWant, iTeachTheyWant } = scoreMatch(myTeach, myLearn, teach, learn);
      return { ...c, compatibility: score, overlap: { theyTeachIWant, iTeachTheyWant } };
    })
  );

  const matches = results.filter((r) => r.compatibility > 0).sort((a, b) => b.compatibility - a.compatibility);
  res.json(matches);
});

export default router;
