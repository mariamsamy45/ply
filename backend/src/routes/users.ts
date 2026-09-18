import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

async function fullProfile(userId: string) {
  const profile = await query(
    `select u.id, u.username, p.name, p.bio, p.avatar_url, p.city, p.country, p.mode
     from users u join profiles p on p.user_id = u.id
     where u.id = $1`,
    [userId]
  );
  if (profile.rows.length === 0) return null;

  const [teach, learn, badges, reviews] = await Promise.all([
    query(
      `select s.id as skill_id, s.name, us.level from user_skills us join skills s on s.id = us.skill_id
       where us.user_id = $1 and us.direction = 'teach' order by s.name`,
      [userId]
    ),
    query(
      `select s.id as skill_id, s.name, us.level from user_skills us join skills s on s.id = us.skill_id
       where us.user_id = $1 and us.direction = 'learn' order by s.name`,
      [userId]
    ),
    query(
      `select b.code, b.name, b.description, ub.earned_at from user_badges ub
       join badges b on b.id = ub.badge_id where ub.user_id = $1 order by ub.earned_at desc`,
      [userId]
    ),
    query(
      `select avg(rating)::numeric(3,2) as average, count(*)::int as count
       from reviews where reviewed_id = $1`,
      [userId]
    ),
  ]);

  return {
    ...profile.rows[0],
    teach: teach.rows,
    learn: learn.rows,
    badges: badges.rows,
    rating: { average: reviews.rows[0].average ? Number(reviews.rows[0].average) : null, count: reviews.rows[0].count },
  };
}

router.get("/:id", async (req, res) => {
  const profile = await fullProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "That profile does not exist." });
  res.json(profile);
});

router.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: "You can only edit your own profile." });
  }
  const { name, bio, avatar_url, city, country, mode } = req.body || {};
  const result = await query(
    `update profiles set
       name = coalesce($2, name),
       bio = coalesce($3, bio),
       avatar_url = coalesce($4, avatar_url),
       city = coalesce($5, city),
       country = coalesce($6, country),
       mode = coalesce($7, mode),
       updated_at = now()
     where user_id = $1
     returning user_id, name, bio, avatar_url, city, country, mode`,
    [req.params.id, name, bio, avatar_url, city, country, mode]
  );
  res.json(result.rows[0]);
});

export default router;
export { fullProfile };
