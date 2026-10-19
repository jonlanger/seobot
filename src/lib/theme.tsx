import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's preference. */
  theme: Theme;
  /** What is actually rendered right now ("system" resolved). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "seobot-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

/** ?theme=light|dark forces a theme for demo embeds and screenshots. */
function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced === "light" || forced === "dark") return forced;
  } catch {
    /* URL unavailable */
  }
  return readStoredTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and first client render both start from "system"/"light" so
  // hydration matches the prerendered markup; the real preference is read
  // right after mount. index.html's pre-paint script already set the `dark`
  // class, so nothing flashes in between.
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(readInitialTheme());
    setSystemTheme(getSystemTheme());
    setReady(true);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (ready) document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [ready, resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    // The ?theme= override did its job at first paint; drop it so the toggle sticks.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("theme")) {
        url.searchParams.delete("theme");
        window.history.replaceState(null, "", url);
      }
    } catch {
      /* URL unavailable */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within <ThemeProvider>.");
  return context;
}
