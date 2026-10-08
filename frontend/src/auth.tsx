import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setUnauthorizedHandler, TOKEN_KEY } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { cancelAllReminders } from "@/src/notifications";
import type { AuthOut, User } from "@/src/types";
import { storage } from "@/src/utils/storage";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    await cancelAllReminders();
    queryClient.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession());
    (async () => {
      const token = await storage.secureGet(TOKEN_KEY, "");
      if (token) {
        try {
          setUser(await api.me());
        } catch {
          // offline or expired: an expired token is cleared by the 401 handler
        }
      }
      setLoading(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const applyAuth = useCallback(async (res: AuthOut) => {
    await storage.secureSet(TOKEN_KEY, res.access_token);
    queryClient.clear();
    setUser(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => applyAuth(await api.login(email.trim(), password)),
      register: async (name, email, password) =>
        applyAuth(await api.register(name.trim(), email.trim(), password)),
      logout: clearSession,
      deleteAccount: async () => {
        await api.deleteAccount();
        await clearSession();
      },
    }),
    [user, loading, applyAuth, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
