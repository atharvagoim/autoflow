import axios, { AxiosError } from "axios";

// The API lives on the same origin ("/api") in production and in dev (Vite proxy).
export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

const KEYS = { access: "af-access", refresh: "af-refresh", user: "af-user" };

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode — session lives in memory only */
  }
}

let accessToken: string | null = read(KEYS.access);

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  currency: string;
}

export const session = {
  user(): User | null {
    try {
      const raw = read(KEYS.user);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  save(s: Session) {
    accessToken = s.accessToken;
    write(KEYS.access, s.accessToken);
    write(KEYS.refresh, s.refreshToken);
    write(KEYS.user, JSON.stringify(s.user));
  },
  saveUser(u: User) {
    write(KEYS.user, JSON.stringify(u));
  },
  refreshToken() {
    return read(KEYS.refresh);
  },
  clear() {
    accessToken = null;
    write(KEYS.access, null);
    write(KEYS.refresh, null);
    write(KEYS.user, null);
  },
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// When the access token expires, refresh it once (shared by concurrent
// requests) and retry. Auth calls themselves are never retried, so a wrong
// password shows its message instead of reloading the page.
let refreshing: Promise<string> | null = null;
let onSessionEnd: () => void = () => undefined;
export function setSessionEndHandler(fn: () => void) {
  onSessionEnd = fn;
}

async function doRefresh(): Promise<string> {
  const refreshToken = session.refreshToken();
  if (!refreshToken) throw new Error("No session");
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  session.save(data.data);
  return data.data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith("/auth/") && !original.url.startsWith("/auth/me");
    if (error.response?.status !== 401 || !original || original._retry || isAuthCall) throw error;
    original._retry = true;
    try {
      refreshing = refreshing || doRefresh().finally(() => (refreshing = null));
      const token = await refreshing;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      session.clear();
      onSessionEnd();
      throw error;
    }
  }
);

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as AxiosError<{ message?: string }>;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === "ECONNABORTED") return "The server took too long to answer. Please try again.";
  if (e?.isAxiosError && !e.response) return "Can't reach AutoFlow. Check your connection and try again.";
  return fallback;
}

// Unwraps { success, data } responses.
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return (await api.get(url, { params })).data.data as T;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post(url, body ?? {})).data.data as T;
}
export async function put<T>(url: string, body: unknown): Promise<T> {
  return (await api.put(url, body)).data.data as T;
}
export async function patch<T>(url: string, body: unknown): Promise<T> {
  return (await api.patch(url, body)).data.data as T;
}
export async function del(url: string): Promise<void> {
  await api.delete(url);
}

// Opens an invoice PDF (fetched with the login token) in a new tab.
export async function openPdf(invoiceId: string, fileName: string) {
  const win = window.open("", "_blank");
  try {
    const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    if (win) win.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.pdf`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}
