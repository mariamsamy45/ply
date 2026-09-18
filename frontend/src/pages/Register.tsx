import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-semibold mb-1">Join Ply</h1>
        <p className="font-body text-ink/60 mb-8">Start trading what you know for what you want to learn.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-sm block mb-1">Name</label>
            <input className="input" required value={form.name} onChange={update("name")} />
          </div>
          <div>
            <label className="font-body text-sm block mb-1">Username</label>
            <input className="input" required value={form.username} onChange={update("username")} />
          </div>
          <div>
            <label className="font-body text-sm block mb-1">Email</label>
            <input className="input" type="email" required value={form.email} onChange={update("email")} />
          </div>
          <div>
            <label className="font-body text-sm block mb-1">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
            />
            <p className="font-body text-xs text-ink/50 mt-1">At least 8 characters.</p>
          </div>
          {error && <p className="font-body text-sm text-tangerine">{error}</p>}
          <button className="btn-primary mt-2" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="font-body text-sm text-ink/60 mt-6">
          Already on Ply?{" "}
          <Link to="/login" className="text-cobalt font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
