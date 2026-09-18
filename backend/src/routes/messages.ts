import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// GET /api/messages -> list the signed-in user's conversations with the other person + last message
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query(
    `select c.id as conversation_id,
            case when c.user_a = $1 then c.user_b else c.user_a end as other_user_id,
            p.name as other_name, u.username as other_username, p.avatar_url as other_avatar,
            (select body from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message,
            (select created_at from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message_at
     from conversations c
     join users u on u.id = case when c.user_a = $1 then c.user_b else c.user_a end
     join profiles p on p.user_id = u.id
     where c.user_a = $1 or c.user_b = $1
     order by last_message_at desc nulls last`,
    [req.userId]
  );
  res.json(result.rows);
});

async function assertParticipant(conversationId: string, userId: string) {
  const result = await query("select * from conversations where id = $1", [conversationId]);
  const convo = result.rows[0];
  if (!convo) return null;
  if (convo.user_a !== userId && convo.user_b !== userId) return null;
  return convo;
}

// GET /api/messages/:conversationId -> full history
router.get("/:conversationId", requireAuth, async (req: AuthedRequest, res) => {
  const convo = await assertParticipant(req.params.conversationId, req.userId!);
  if (!convo) return res.status(403).json({ error: "You don't have access to this conversation." });

  const result = await query(
    "select id, sender_id, body, created_at from messages where conversation_id = $1 order by created_at asc",
    [req.params.conversationId]
  );
  res.json(result.rows);
});

// POST /api/messages -> send a message; creates the conversation if it doesn't exist yet
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { recipient_id, conversation_id, body } = req.body || {};
  if (!body || !body.trim()) {
    return res.status(400).json({ error: "A message can't be empty." });
  }

  let convoId = conversation_id;
  if (!convoId) {
    if (!recipient_id) return res.status(400).json({ error: "A recipient or conversation id is required." });
    const [a, b] = [req.userId!, recipient_id].sort();
    const upserted = await query(
      `insert into conversations (user_a, user_b) values ($1, $2)
       on conflict (user_a, user_b) do update set user_a = excluded.user_a
       returning id`,
      [a, b]
    );
    convoId = upserted.rows[0].id;
  } else {
    const convo = await assertParticipant(convoId, req.userId!);
    if (!convo) return res.status(403).json({ error: "You don't have access to this conversation." });
  }

  const result = await query(
    "insert into messages (conversation_id, sender_id, body) values ($1, $2, $3) returning id, sender_id, body, created_at",
    [convoId, req.userId, body.trim()]
  );
  res.status(201).json({ conversation_id: convoId, ...result.rows[0] });
});

export default router;
