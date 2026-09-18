import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

interface Trade {
  id: string;
  status: "active" | "completed" | "cancelled";
  meeting_info: string;
  created_at: string;
  completed_at: string | null;
  user_a: string;
  user_a_name: string;
  user_b: string;
  user_b_name: string;
  skill_a_id: string;
  skill_a_name: string;
  skill_b_id: string;
  skill_b_name: string;
}

export default function Trades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewedTrades, setReviewedTrades] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const data = await api.get<Trade[]>("/api/trades");
      setTrades(data);
    } catch {
      setError("Couldn't load your trades.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: "completed" | "cancelled") {
    setBusyId(id);
    setError("");
    try {
      await api.put(`/api/trades/${id}`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that trade.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReview(tradeId: string) {
    try {
      await api.post("/api/reviews", { trade_id: tradeId, rating, body: reviewBody });
      setReviewedTrades((s) => new Set(s).add(tradeId));
      setReviewingId(null);
      setReviewBody("");
      setRating(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit that review.");
    }
  }

  if (error && trades.length === 0) return <p className="font-body text-tangerine p-8">{error}</p>;

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold mb-6">Trades</h1>

      {trades.length === 0 ? (
        <p className="font-body text-ink/60">You don't have any trades yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trades.map((t) => {
            const otherName = t.user_a === user?.id ? t.user_b_name : t.user_a_name;
            const otherId = t.user_a === user?.id ? t.user_b : t.user_a;
            const mySkill = t.user_a === user?.id ? t.skill_a_name : t.skill_b_name;
            const theirSkill = t.user_a === user?.id ? t.skill_b_name : t.skill_a_name;
            const alreadyReviewed = reviewedTrades.has(t.id);

            return (
              <div key={t.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <Link to={`/profile/${otherId}`} className="font-display text-lg hover:text-cobalt">
                    {otherName}
                  </Link>
                  <span
                    className={`pill ${
                      t.status === "completed" ? "bg-sage text-bone border-sage" : t.status === "cancelled" ? "bg-clay" : "bg-cobalt text-bone border-cobalt"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="font-body text-sm text-ink/70">
                  You teach {mySkill} · they teach {theirSkill}
                </p>

                {t.status === "active" && (
                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary" disabled={busyId === t.id} onClick={() => updateStatus(t.id, "completed")}>
                      Mark completed
                    </button>
                    <button className="btn-danger" disabled={busyId === t.id} onClick={() => updateStatus(t.id, "cancelled")}>
                      Cancel
                    </button>
                  </div>
                )}

                {t.status === "completed" && !alreadyReviewed && (
                  <div className="mt-3">
                    {reviewingId === t.id ? (
                      <div className="flex flex-col gap-2">
                        <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="input"
                          rows={2}
                          placeholder="How did the trade go?"
                          value={reviewBody}
                          onChange={(e) => setReviewBody(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button className="btn-secondary flex-1" onClick={() => setReviewingId(null)}>
                            Cancel
                          </button>
                          <button className="btn-primary flex-1" onClick={() => submitReview(t.id)}>
                            Submit review
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={() => setReviewingId(t.id)}>
                        Leave a review
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
