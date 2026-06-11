import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<SessionUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await api.post<SessionUser>("/auth/login", { email, password });
    setUser(u);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
