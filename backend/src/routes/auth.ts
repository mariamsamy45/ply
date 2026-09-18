import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";
import { signToken, requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, name, username } = req.body || {};

  if (!email || !password || !name || !username) {
    return res.status(400).json({ error: "Email, password, name, and username are all required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = await query("select id from users where email = $1 or username = $2", [
    email.toLowerCase(),
    username.toLowerCase(),
  ]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with that email or username already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const client = await import("../db").then((m) => m.pool.connect());
  try {
    await client.query("begin");
    const userResult = await client.query(
      "insert into users (email, username, password_hash) values ($1, $2, $3) returning id, email, username, created_at",
      [email.toLowerCase(), username.toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];
    await client.query(
      "insert into profiles (user_id, name) values ($1, $2)",
      [user.id, name]
    );
    await client.query("commit");

    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, name } });
  } catch (err) {
    await client.query("rollback");
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Could not create your account. Try again." });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const result = await query(
    `select u.id, u.email, u.username, u.password_hash, p.name
     from users u join profiles p on p.user_id = u.id
     where u.email = $1`,
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name } });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select u.id, u.email, u.username, p.name, p.bio, p.avatar_url, p.city, p.country, p.mode
     from users u join profiles p on p.user_id = u.id
     where u.id = $1`,
    [req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });
  res.json(result.rows[0]);
});

router.post("/logout", requireAuth, async (_req, res) => {
  // Token invalidation is handled client-side by discarding the JWT.
  res.json({ ok: true });
});

router.delete("/account", requireAuth, async (req: AuthedRequest, res) => {
  // ON DELETE CASCADE on every foreign key that references users(id) means this
  // single statement cleanly removes the profile, skills, requests, trades,
  // messages, reviews, badges, stories and highlights that belong ONLY to this
  // user, without touching any other user's rows.
  await query("delete from users where id = $1", [req.userId]);
  res.json({ ok: true });
});

export default router;
