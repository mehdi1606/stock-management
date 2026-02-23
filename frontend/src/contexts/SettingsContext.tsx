// frontend/src/contexts/SettingsContext.tsx
// Global settings context – loads from localStorage and applies ALL live effects

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneralSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  densityMode: 'comfortable' | 'compact' | 'spacious';
  showAvatars: boolean;
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  lowStockAlerts: boolean;
  movementAlerts: boolean;
  qualityAlerts: boolean;
  systemAlerts: boolean;
  alertFrequency: 'realtime' | 'hourly' | 'daily';
  // Localization
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: 'comma' | 'dot';
  // Security
  sessionTimeout: number;  // minutes; 0 = never
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  // Data & Display
  defaultPageSize: number;
  autoRefreshInterval: number;  // seconds; 0 = disabled
}

export interface SettingsContextType {
  settings: GeneralSettings;
  updateSettings: (partial: Partial<GeneralSettings>) => void;
  saveSettings: () => void;
  resetSettings: () => void;
  isDark: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: GeneralSettings = {
  theme: 'system',
  accentColor: '#3B82F6',
  compactMode: false,
  sidebarCollapsed: false,
  densityMode: 'comfortable',
  showAvatars: true,
  emailNotifications: true,
  pushNotifications: true,
  soundEnabled: false,
  lowStockAlerts: true,
  movementAlerts: true,
  qualityAlerts: true,
  systemAlerts: true,
  alertFrequency: 'realtime',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '24h',
  currency: 'USD',
  numberFormat: 'comma',
  sessionTimeout: 60,
  twoFactorEnabled: false,
  loginNotifications: true,
  defaultPageSize: 20,
  autoRefreshInterval: 0,
};

export const SETTINGS_KEY = 'app_general_settings';

export function loadSettingsFromStorage(): GeneralSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function persistSettings(s: GeneralSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveTheme(theme: GeneralSettings['theme']): 'dark' | 'light' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  // system
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'dark' | 'light') {
  const html = document.documentElement;
  if (resolved === 'dark') {
    html.classList.add('dark');
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
  // Notify ThemeContext so its isDark stays in sync
  window.dispatchEvent(new CustomEvent('theme:changed'));
}

function applyAccentColor(color: string) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', color + 'dd');
  // Also update meta theme-color
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function applyDensity(mode: GeneralSettings['densityMode'], compact: boolean) {
  const html = document.documentElement;
  html.removeAttribute('data-density');
  html.setAttribute('data-density', compact ? 'compact' : mode);

  // Remove old density classes
  html.classList.remove('density-comfortable', 'density-compact', 'density-spacious');
  const effective = compact ? 'compact' : mode;
  html.classList.add(`density-${effective}`);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<GeneralSettings>(loadSettingsFromStorage);
  const [isDark, setIsDark] = useState(() => resolveTheme(loadSettingsFromStorage().theme) === 'dark');

  // Auto-refresh timer ref
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Session timeout timer ref
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ── Apply theme ──────────────────────────────────────────────────────
  useEffect(() => {
    const resolved = resolveTheme(settings.theme);
    applyTheme(resolved);
    setIsDark(resolved === 'dark');

    // Listen for system theme changes when set to "system"
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const r = e.matches ? 'dark' : 'light';
        applyTheme(r);
        setIsDark(r === 'dark');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // ── Apply accent color ────────────────────────────────────────────────
  useEffect(() => {
    applyAccentColor(settings.accentColor);
  }, [settings.accentColor]);

  // ── Apply density ─────────────────────────────────────────────────────
  useEffect(() => {
    applyDensity(settings.densityMode, settings.compactMode);
  }, [settings.densityMode, settings.compactMode]);

  // ── Auto-refresh dashboard ────────────────────────────────────────────
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (settings.autoRefreshInterval > 0) {
      autoRefreshRef.current = setInterval(() => {
        // Dispatch a custom event; DashboardPage listens for it
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      }, settings.autoRefreshInterval * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [settings.autoRefreshInterval]);

  // ── Session timeout ───────────────────────────────────────────────────
  useEffect(() => {
    const clearTimer = () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };

    if (settings.sessionTimeout <= 0) {
      clearTimer();
      return;
    }

    const timeoutMs = settings.sessionTimeout * 60 * 1000;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      clearTimer();
      sessionTimerRef.current = setTimeout(() => {
        // Log out user by clearing tokens and reloading
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('session:timeout'));
        window.location.href = '/login';
      }, timeoutMs);
    };

    // Start immediately
    resetTimer();

    // Reset on user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const throttledReset = () => {
      const now = Date.now();
      // Only reset if > 30 seconds since last activity to avoid hammering
      if (now - lastActivityRef.current > 30_000) {
        resetTimer();
      }
    };

    events.forEach(e => document.addEventListener(e, throttledReset, { passive: true }));

    return () => {
      clearTimer();
      events.forEach(e => document.removeEventListener(e, throttledReset));
    };
  }, [settings.sessionTimeout]);

  // ── Push notifications permission ────────────────────────────────────
  useEffect(() => {
    if (settings.pushNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [settings.pushNotifications]);

  // ── Persist on every change ───────────────────────────────────────────
  const updateSettings = useCallback((partial: Partial<GeneralSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      persistSettings(next);
      return next;
    });
  }, []);

  const saveSettings = useCallback(() => {
    persistSettings(settings);
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    persistSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, resetSettings, isDark }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
