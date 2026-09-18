import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

interface TradeRequest {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string;
  created_at: string;
  sender_id: string;
  sender_username: string;
  sender_name: string;
  receiver_id: string;
  receiver_username: string;
  receiver_name: string;
  offered_skill_id: string;
  offered_skill_name: string;
  requested_skill_id: string;
  requested_skill_name: string;
}

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<TradeRequest[]>("/api/requests");
      setRequests(data);
    } catch {
      setError("Couldn't load your trade requests.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const received = requests.filter((r) => r.receiver_id === user?.id);
  const sent = requests.filter((r) => r.sender_id === user?.id);
  const shown = tab === "received" ? received : sent;

  async function respond(id: string, status: "accepted" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      await api.put(`/api/requests/${id}`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that request.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await api.delete(`/api/requests/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel that request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold mb-6">Trade requests</h1>

      <div className="flex gap-2 mb-6">
        <button
          className={`btn-secondary ${tab === "received" ? "bg-ink text-bone" : ""}`}
          onClick={() => setTab("received")}
        >
          Received {received.filter((r) => r.status === "pending").length > 0 && `(${received.filter((r) => r.status === "pending").length})`}
        </button>
        <button
          className={`btn-secondary ${tab === "sent" ? "bg-ink text-bone" : ""}`}
          onClick={() => setTab("sent")}
        >
          Sent
        </button>
      </div>

      {error && <p className="font-body text-tangerine mb-4">{error}</p>}

      {shown.length === 0 ? (
        <p className="font-body text-ink/60">
          {tab === "received" ? "No trade requests yet." : "You haven't sent any trade requests yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((r) => {
            const other = tab === "received" ? { id: r.sender_id, name: r.sender_name, username: r.sender_username } : { id: r.receiver_id, name: r.receiver_name, username: r.receiver_username };
            return (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <Link to={`/profile/${other.id}`} className="font-display text-lg hover:text-cobalt">
                    {other.name}
                  </Link>
                  <span className={`pill ${r.status === "pending" ? "" : r.status === "accepted" ? "bg-sage text-bone border-sage" : "bg-clay"}`}>
                    {r.status}
                  </span>
                </div>
                <p className="font-body text-sm text-ink/70 mb-1">
                  {tab === "received"
                    ? `They'll teach ${r.offered_skill_name} for your ${r.requested_skill_name}`
                    : `You'll teach ${r.offered_skill_name} for their ${r.requested_skill_name}`}
                </p>
                {r.message && <p className="font-body text-sm text-ink/60 italic mb-3">"{r.message}"</p>}

                {tab === "received" && r.status === "pending" && (
                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary" disabled={busyId === r.id} onClick={() => respond(r.id, "accepted")}>
                      Accept
                    </button>
                    <button className="btn-danger" disabled={busyId === r.id} onClick={() => respond(r.id, "rejected")}>
                      Decline
                    </button>
                  </div>
                )}
                {tab === "sent" && r.status === "pending" && (
                  <button className="btn-secondary mt-2" disabled={busyId === r.id} onClick={() => cancel(r.id)}>
                    Cancel request
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
