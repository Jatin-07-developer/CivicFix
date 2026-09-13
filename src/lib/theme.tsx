import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isAutoTheme: boolean;
  setManualTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Returns 'dark' if current hour is evening/night (18:00–05:59) */
function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
}

/** Returns user's OS/browser preference */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const STORAGE_KEY = 'civicfix-theme';
const STORAGE_MANUAL_KEY = 'civicfix-theme-manual';

function resolveInitialTheme(): { theme: Theme; isManual: boolean } {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const isManual = localStorage.getItem(STORAGE_MANUAL_KEY) === 'true';
  if (stored && isManual) return { theme: stored, isManual: true };

  // Auto: prefer time-of-day, fall back to OS preference
  const timeBased = getTimeBasedTheme();
  return { theme: timeBased, isManual: false };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isAutoTheme, setIsAutoTheme] = useState(true);
  const [mounted, setMounted] = useState(false);

  // On mount: resolve initial theme
  useEffect(() => {
    const { theme: initial, isManual } = resolveInitialTheme();
    setTheme(initial);
    setIsAutoTheme(!isManual);
    setMounted(true);
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  // Auto-update theme every minute based on time (if not manually set)
  useEffect(() => {
    if (!isAutoTheme) return;
    const interval = setInterval(() => {
      const timeBased = getTimeBasedTheme();
      setTheme(timeBased);
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [isAutoTheme]);

  // Listen to OS theme changes (when in auto mode)
  useEffect(() => {
    if (!isAutoTheme) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // When OS changes, re-evaluate time-based (time takes priority)
      setTheme(getTimeBasedTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isAutoTheme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setIsAutoTheme(false);
    localStorage.setItem(STORAGE_MANUAL_KEY, 'true');
  };

  const setManualTheme = (t: Theme) => {
    setTheme(t);
    setIsAutoTheme(false);
    localStorage.setItem(STORAGE_MANUAL_KEY, 'true');
  };

  // Prevent flash of wrong theme
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isAutoTheme, setManualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
