export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCESS_KEY = "sevasetu.access";
const REFRESH_KEY = "sevasetu.refresh";
const USER_KEY = "sevasetu.user";

export type Role =
  | "patient"
  | "asha"
  | "doctor"
  | "hospital_admin"
  | "dho"
  | "emergency";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  is_active: boolean;
  locality?: string | null;
  avatar_url?: string | null;
  preferred_language: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  get user(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  save(pair: TokenPair) {
    window.localStorage.setItem(ACCESS_KEY, pair.access_token);
    window.localStorage.setItem(REFRESH_KEY, pair.refresh_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(pair.user));
  },
  saveUser(user: AuthUser) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
  skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!response.ok) {
    tokenStore.clear();
    return null;
  }
  const pair = (await response.json()) as TokenPair;
  tokenStore.save(pair);
  return pair.access_token;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, raw, skipAuth, headers, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const buildHeaders = (token?: string | null): HeadersInit => ({
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  });

  let response = await fetch(url, {
    ...rest,
    headers: buildHeaders(tokenStore.access),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    const token = await refreshAccessToken();
    if (token) {
      response = await fetch(url, {
        ...rest,
        headers: buildHeaders(token),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") message = data.detail;
      else if (Array.isArray(data?.detail)) message = data.detail[0]?.msg ?? message;
    } catch {
      /* keep default message */
    }
    throw new ApiError(message, response.status);
  }

  if (raw) return (await response.text()) as unknown as T;
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  getText: (path: string) => apiFetch<string>(path, { raw: true }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
