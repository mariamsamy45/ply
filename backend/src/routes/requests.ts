import { Router } from "express";
import { pool, query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const REQUEST_FIELDS = `
  tr.id, tr.status, tr.message, tr.created_at, tr.updated_at,
  tr.sender_id, sender.username as sender_username, sender_p.name as sender_name,
  tr.receiver_id, receiver.username as receiver_username, receiver_p.name as receiver_name,
  os.id as offered_skill_id, os.name as offered_skill_name,
  rs.id as requested_skill_id, rs.name as requested_skill_name
`;

const REQUEST_JOIN = `
  from trade_requests tr
  join users sender on sender.id = tr.sender_id
  join profiles sender_p on sender_p.user_id = tr.sender_id
  join users receiver on receiver.id = tr.receiver_id
  join profiles receiver_p on receiver_p.user_id = tr.receiver_id
  join skills os on os.id = tr.offered_skill_id
  join skills rs on rs.id = tr.requested_skill_id
`;

// GET /api/requests -> all requests involving the signed-in user (sent + received)
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select ${REQUEST_FIELDS} ${REQUEST_JOIN}
     where tr.sender_id = $1 or tr.receiver_id = $1
     order by tr.created_at desc`,
    [req.userId]
  );
  res.json(result.rows);
});

// POST /api/requests -> send a new trade request
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { receiver_id, offered_skill_id, requested_skill_id, message } = req.body || {};
  if (!receiver_id || !offered_skill_id || !requested_skill_id) {
    return res.status(400).json({ error: "A receiver and both skills are required." });
  }
  if (receiver_id === req.userId) {
    return res.status(400).json({ error: "You can't send a trade request to yourself." });
  }

  const result = await query(
    `insert into trade_requests (sender_id, receiver_id, offered_skill_id, requested_skill_id, message)
     values ($1, $2, $3, $4, coalesce($5, ''))
     returning id`,
    [req.userId, receiver_id, offered_skill_id, requested_skill_id, message]
  );
  const full = await query(`select ${REQUEST_FIELDS} ${REQUEST_JOIN} where tr.id = $1`, [result.rows[0].id]);
  res.status(201).json(full.rows[0]);
});

// PUT /api/requests/:id -> accept or reject a request you received
router.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { status } = req.body || {};
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be accepted or rejected." });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const reqRow = await client.query(
      "select * from trade_requests where id = $1 for update",
      [req.params.id]
    );
    const tradeRequest = reqRow.rows[0];
    if (!tradeRequest) {
      await client.query("rollback");
      return res.status(404).json({ error: "That trade request was not found." });
    }
    if (tradeRequest.receiver_id !== req.userId) {
      await client.query("rollback");
      return res.status(403).json({ error: "Only the recipient can respond to this request." });
    }
    if (tradeRequest.status !== "pending") {
      await client.query("rollback");
      return res.status(409).json({ error: "This request has already been resolved." });
    }

    await client.query("update trade_requests set status = $2, updated_at = now() where id = $1", [
      req.params.id,
      status,
    ]);

    let trade = null;
    if (status === "accepted") {
      const tradeResult = await client.query(
        `insert into trades (request_id, user_a, user_b, skill_a_id, skill_b_id)
         values ($1, $2, $3, $4, $5) returning *`,
        [
          tradeRequest.id,
          tradeRequest.sender_id,
          tradeRequest.receiver_id,
          tradeRequest.offered_skill_id,
          tradeRequest.requested_skill_id,
        ]
      );
      trade = tradeResult.rows[0];

      // make sure a conversation exists between the two traders
      const [a, b] = [tradeRequest.sender_id, tradeRequest.receiver_id].sort();
      await client.query(
        `insert into conversations (user_a, user_b) values ($1, $2)
         on conflict (user_a, user_b) do nothing`,
        [a, b]
      );
    }

    await client.query("commit");
    res.json({ request: { ...tradeRequest, status }, trade });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
});

// DELETE /api/requests/:id -> cancel a request you sent (only while pending)
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `update trade_requests set status = 'cancelled', updated_at = now()
     where id = $1 and sender_id = $2 and status = 'pending'
     returning id`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "That request can't be cancelled." });
  }
  res.json({ ok: true });
});

export default router;
