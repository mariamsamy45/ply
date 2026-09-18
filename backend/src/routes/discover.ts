import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// Compatibility score:
//   overlapAB = skills the candidate can teach that I want to learn
//   overlapBA = skills I can teach that the candidate wants to learn
//   score = (overlapAB + overlapBA) / (myLearnCount + myTeachCount), capped at 100
// This rewards candidates who cover more of what I'm looking for AND want what I offer,
// using only real rows from user_skills, never a hardcoded number.
function scoreMatch(
  myTeach: Set<string>,
  myLearn: Set<string>,
  theirTeach: Set<string>,
  theirLearn: Set<string>
) {
  const theyTeachIWant = [...theirTeach].filter((s) => myLearn.has(s));
  const iTeachTheyWant = [...myTeach].filter((s) => theirLearn.has(s));
  const denominator = myLearn.size + myTeach.size;
  if (denominator === 0) return { score: 0, theyTeachIWant, iTeachTheyWant };
  const raw = ((theyTeachIWant.length + iTeachTheyWant.length) / denominator) * 100;
  return { score: Math.min(100, Math.round(raw)), theyTeachIWant, iTeachTheyWant };
}

async function getSkillSets(userId: string) {
  const rows = await query(
    "select s.name, us.direction from user_skills us join skills s on s.id = us.skill_id where us.user_id = $1",
    [userId]
  );
  const teach = new Set<string>();
  const learn = new Set<string>();
  for (const r of rows.rows) {
    (r.direction === "teach" ? teach : learn).add(r.name);
  }
  return { teach, learn };
}

// GET /api/discover?skill=&city=&mode=
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const { skill, city, mode } = req.query as Record<string, string | undefined>;

  const conditions = ["u.id != $1"];
  const params: any[] = [req.userId];

  if (city) {
    params.push(`%${city}%`);
    conditions.push(`p.city ilike $${params.length}`);
  }
  if (mode && ["online", "in_person", "both"].includes(mode)) {
    params.push(mode);
    conditions.push(`p.mode = $${params.length}`);
  }
  if (skill) {
    params.push(`%${skill}%`);
    conditions.push(
      `exists (select 1 from user_skills us join skills s on s.id = us.skill_id where us.user_id = u.id and s.name ilike $${params.length})`
    );
  }

  const candidates = await query(
    `select u.id, u.username, p.name, p.bio, p.avatar_url, p.city, p.country, p.mode
     from users u join profiles p on p.user_id = u.id
     where ${conditions.join(" and ")}
     order by p.updated_at desc
     limit 50`,
    params
  );

  if (candidates.rows.length === 0) {
    return res.json([]);
  }

  const { teach: myTeach, learn: myLearn } = await getSkillSets(req.userId!);

  const results = await Promise.all(
    candidates.rows.map(async (c) => {
      const { teach, learn } = await getSkillSets(c.id);
      const { score, theyTeachIWant, iTeachTheyWant } = scoreMatch(myTeach, myLearn, teach, learn);
      return {
        ...c,
        compatibility: score,
        theyTeach: [...teach],
        theyLearn: [...learn],
        overlap: { theyTeachIWant, iTeachTheyWant },
      };
    })
  );

  results.sort((a, b) => b.compatibility - a.compatibility);
  res.json(results);
});

export default router;
export { getSkillSets, scoreMatch };
