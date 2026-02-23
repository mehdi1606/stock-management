import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'glass';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  isGlass: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'glass'];

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage.getItem('app_general_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.theme === 'dark') return 'dark';
        if (s.theme === 'glass') return 'glass';
        if (s.theme === 'light') return 'light';
        if (s.theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      }
    } catch {}
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    if (stored && THEME_CYCLE.includes(stored)) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for external theme changes (e.g. from SettingsContext)
  useEffect(() => {
    const handler = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme') as ThemeMode;
      if (dataTheme && THEME_CYCLE.includes(dataTheme)) {
        setThemeState(dataTheme);
      } else if (document.documentElement.classList.contains('dark')) {
        setThemeState('dark');
      } else {
        setThemeState('light');
      }
    };
    window.addEventListener('theme:changed', handler);
    return () => window.removeEventListener('theme:changed', handler);
  }, []);

  const setTheme = (t: ThemeMode) => setThemeState(t);

  const toggleTheme = () => {
    setThemeState(prev => {
      const idx = THEME_CYCLE.indexOf(prev);
      return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    });
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark: theme === 'dark',
      isGlass: theme === 'glass',
      toggleTheme,
      setTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
