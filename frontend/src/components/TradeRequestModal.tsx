import { useState } from "react";
import { api, ApiError } from "../lib/api";

interface SkillOption {
  skill_id: string;
  name: string;
}

export default function TradeRequestModal({
  receiverId,
  mySkills,
  theirSkills,
  onClose,
  onSent,
}: {
  receiverId: string;
  mySkills: SkillOption[];
  theirSkills: SkillOption[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [offered, setOffered] = useState(mySkills[0]?.skill_id || "");
  const [requested, setRequested] = useState(theirSkills[0]?.skill_id || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!offered || !requested) {
      setError("Choose a skill on both sides of the trade.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/api/requests", {
        receiver_id: receiverId,
        offered_skill_id: offered,
        requested_skill_id: requested,
        message,
      });
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center px-5">
      <div className="card bg-bone w-full max-w-sm">
        <h3 className="font-display text-2xl mb-4">Propose a trade</h3>

        {mySkills.length === 0 || theirSkills.length === 0 ? (
          <p className="font-body text-sm text-ink/70">
            You both need at least one listed skill for a trade to make sense. Add skills to your profile first.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-body text-sm block mb-1">You'll teach</label>
              <select className="input" value={offered} onChange={(e) => setOffered(e.target.value)}>
                {mySkills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-sm block mb-1">You'll learn</label>
              <select className="input" value={requested} onChange={(e) => setRequested(e.target.value)}>
                {theirSkills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-sm block mb-1">Message</label>
              <textarea
                className="input"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say a bit about what you're looking for."
              />
            </div>
            {error && <p className="font-body text-sm text-tangerine">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={send} disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        )}

        {(mySkills.length === 0 || theirSkills.length === 0) && (
          <button className="btn-secondary w-full mt-4" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
