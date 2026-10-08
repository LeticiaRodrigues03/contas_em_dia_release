import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { setColorScheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export type ThemePref = "system" | "light" | "dark";

export interface Prefs {
  notificationsEnabled: boolean;
  daysBefore: number; // 5 | 3 | 1
  notifyOnDueDay: boolean;
  theme: ThemePref;
}

const DEFAULTS: Prefs = { notificationsEnabled: true, daysBefore: 5, notifyOnDueDay: true, theme: "system" };
const KEY = "contas_em_dia_prefs";

interface PrefsState {
  prefs: Prefs;
  ready: boolean;
  update: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(KEY, "");
      if (raw) {
        try {
          setPrefs({ ...DEFAULTS, ...(JSON.parse(String(raw)) as Partial<Prefs>) });
        } catch {
          // ignore corrupted prefs
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    setColorScheme(prefs.theme === "system" ? null : prefs.theme);
  }, [prefs.theme]);

  const value = useMemo<PrefsState>(
    () => ({
      prefs,
      ready,
      update: (patch) =>
        setPrefs((prev) => {
          const next = { ...prev, ...patch };
          void storage.setItem(KEY, JSON.stringify(next));
          return next;
        }),
    }),
    [prefs, ready],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
