import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import Requests from "./pages/Requests";
import Trades from "./pages/Trades";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center font-body text-ink/60">Loading Ply…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
