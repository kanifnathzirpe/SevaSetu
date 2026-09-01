"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { api, apiFetch, tokenStore, type AuthUser, type Role, type TokenPair } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  locality?: string;
  gender?: string;
  date_of_birth?: string | null;
}

export const ROLE_HOME: Record<Role, string> = {
  patient: "/patient",
  asha: "/asha",
  doctor: "/doctor",
  hospital_admin: "/admin",
  dho: "/admin",
  emergency: "/emergency",
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const cached = tokenStore.user;
    if (cached) setUser(cached);
    if (tokenStore.access) {
      apiFetch<AuthUser>("/api/v1/auth/me")
        .then((fresh) => {
          setUser(fresh);
          tokenStore.saveUser(fresh);
        })
        .catch(() => {
          tokenStore.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const pair = await apiFetch<TokenPair>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    });
    tokenStore.save(pair);
    setUser(pair.user);
    return pair.user;
  }, []);

  const register = React.useCallback(async (payload: RegisterPayload) => {
    const pair = await apiFetch<TokenPair>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      skipAuth: true,
    });
    tokenStore.save(pair);
    setUser(pair.user);
    return pair.user;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout", { refresh_token: tokenStore.refresh });
    } catch {
      /* token may already be expired */
    }
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = React.useCallback(async () => {
    const fresh = await apiFetch<AuthUser>("/api/v1/auth/me");
    setUser(fresh);
    tokenStore.saveUser(fresh);
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
