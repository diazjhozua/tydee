"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

type ResolvedTheme = "light" | "dark";

type ThemeSnapshot = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
};

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * The theme lives in a module-level store rather than component state so it can
 * be read through useSyncExternalStore. Syncing it with setState inside an
 * effect is rejected by the react-hooks/set-state-in-effect lint rule.
 *
 * The anti-flash script in app/layout.tsx has already put the right class on
 * <html> before hydration; this store only mirrors that decision into React.
 */
let theme: Theme = "system";
let resolvedTheme: ResolvedTheme = "light";
let snapshot: ThemeSnapshot = { theme, resolvedTheme };
let hydrated = false;
let mediaAttached = false;

const listeners = new Set<() => void>();

function emit() {
  snapshot = { theme, resolvedTheme };
  for (const listener of listeners) {
    listener();
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Fall back to
    // the system preference.
  }

  return "system";
}

function applyToDocument(value: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", value === "dark");
  root.style.colorScheme = value;
}

function syncFromEnvironment() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  theme = readStoredTheme();
  resolvedTheme = theme === "system" ? systemTheme() : theme;
  applyToDocument(resolvedTheme);
  emit();
}

function handleSystemChange() {
  if (theme !== "system") {
    return;
  }

  resolvedTheme = systemTheme();
  applyToDocument(resolvedTheme);
  emit();
}

function attachMediaListener() {
  if (mediaAttached || typeof window === "undefined") {
    return;
  }

  mediaAttached = true;
  window.matchMedia(MEDIA_QUERY).addEventListener("change", handleSystemChange);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  syncFromEnvironment();
  attachMediaListener();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "system", resolvedTheme: "light" };

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

function setTheme(next: Theme) {
  theme = next;
  resolvedTheme = next === "system" ? systemTheme() : next;
  applyToDocument(resolvedTheme);

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }

  emit();
}

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(
    () => ({ theme: current.theme, resolvedTheme: current.resolvedTheme, setTheme }),
    [current],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
