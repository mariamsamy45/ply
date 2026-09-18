import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-semibold mb-1">Ply</h1>
        <p className="font-body text-ink/60 mb-8">Trade skills, not money.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-sm block mb-1">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-sm block mb-1">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="font-body text-sm text-tangerine">{error}</p>}
          <button className="btn-primary mt-2" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="font-body text-sm text-ink/60 mt-6">
          New to Ply?{" "}
          <Link to="/register" className="text-cobalt font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
