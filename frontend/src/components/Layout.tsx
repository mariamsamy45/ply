import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/matches", label: "Matches" },
  { to: "/requests", label: "Requests" },
  { to: "/trades", label: "Trades" },
  { to: "/messages", label: "Messages" },
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `font-body text-sm px-3 py-2 transition-colors ${isActive ? "text-cobalt font-semibold" : "text-ink/70 hover:text-ink"}`;

  return (
    <div className="min-h-screen bg-bone flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:border-r-2 md:border-ink md:h-screen md:sticky md:top-0 md:justify-between md:p-6">
        <div>
          <button onClick={() => navigate("/")} className="font-display text-3xl font-semibold mb-10 block">
            Ply
          </button>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1">
          {user && (
            <button
              onClick={() => navigate(`/profile/${user.id}`)}
              className="font-body text-sm px-3 py-2 text-left text-ink/70 hover:text-ink"
            >
              {user.name}
            </button>
          )}
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 border-b-2 border-ink">
        <span className="font-display text-2xl font-semibold">Ply</span>
        <button onClick={() => navigate("/settings")} className="pill">
          Settings
        </button>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bone border-t-2 border-ink flex justify-around py-2 z-20">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `font-body text-xs px-2 py-1 ${isActive ? "text-cobalt font-semibold" : "text-ink/60"}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
