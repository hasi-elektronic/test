// Kleiner Fetch-Wrapper – bei 401 zurück zum Login

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new ApiError("Nicht angemeldet", 401);
  }
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new ApiError(data.error || `Fehler ${res.status}`, res.status);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
