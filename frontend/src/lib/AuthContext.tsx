import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, hasToken } from "./api";

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  country?: string;
  mode?: string;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; username: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!hasToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<CurrentUser>("/api/auth/me");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<{ token: string; user: CurrentUser }>("/api/auth/login", { email, password });
    setToken(result.token);
    await refresh();
  }

  async function register(data: { email: string; password: string; name: string; username: string }) {
    const result = await api.post<{ token: string; user: CurrentUser }>("/api/auth/register", data);
    setToken(result.token);
    await refresh();
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
