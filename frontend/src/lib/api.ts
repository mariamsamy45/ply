const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("ply_token");
}

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(body?.error || "Something went wrong. Please try again.");
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new ApiError("Upload failed. Try a smaller file.");
    return res.json();
  },
};

export function setToken(token: string | null) {
  if (token) localStorage.setItem("ply_token", token);
  else localStorage.removeItem("ply_token");
}

export function hasToken() {
  return Boolean(getToken());
}
