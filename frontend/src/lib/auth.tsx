import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, post, session, Session, setSessionEndHandler, User } from "./api";

interface AuthValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  demo: () => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => session.user());
  const queryClient = useQueryClient();

  const start = useCallback(
    (s: Session) => {
      queryClient.clear(); // never show the previous account's data
      session.save(s);
      setUserState(s.user);
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    const refreshToken = session.refreshToken();
    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    session.clear();
    queryClient.clear();
    setUserState(null);
  }, [queryClient]);

  useEffect(() => {
    setSessionEndHandler(() => {
      queryClient.clear();
      setUserState(null);
    });
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      login: async (email, password) => start(await post<Session>("/auth/login", { email, password })),
      signup: async (name, email, password) => start(await post<Session>("/auth/signup", { name, email, password })),
      demo: async () => start(await post<Session>("/auth/demo")),
      logout,
      setUser: (u) => {
        session.saveUser(u);
        setUserState(u);
      },
    }),
    [user, start, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
