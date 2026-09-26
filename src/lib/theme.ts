import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

// Must match the inline boot script in index.html, which applies the theme before first paint.
const KEY = "theme";
const NEXT: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };
const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function apply(mode: ThemeMode): void {
  const resolved = mode === "system" ? (darkQuery().matches ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
}

export function useTheme(): readonly [ThemeMode, () => void] {
  const [mode, setMode] = useState(readMode);

  useEffect(() => {
    apply(mode);
    if (mode !== "system") return;
    const query = darkQuery();
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const cycle = () => {
    const next = NEXT[mode];
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this page view.
    }
    setMode(next);
  };

  return [mode, cycle] as const;
}
