import * as React from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  isAccentId,
  isFontId,
  isPaletteId,
  resolveAppearanceTheme,
  type AccentId,
  type FontId,
  type PaletteId,
} from '@withink/tokens/native';

import { buildAppTheme, type AppTheme } from '@/constants/theme';

const STORAGE_KEY = 'withink.appearance.v1';
const LEGACY_KEYS = [
  'withink-palette',
  'withink-font',
  'withink-accent',
  'withink-paper-scale',
] as const;

export interface AppearancePrefs {
  palette: PaletteId;
  font: FontId;
  accent: AccentId;
  /** Web parity: 0.80–1.20, default 1. */
  scale: number;
}

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  palette: 'desk',
  font: 'alegreya',
  accent: 'gold',
  scale: 1,
};

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1.2, Math.max(0.8, Math.round(value * 100) / 100));
}

async function readStoredPrefs(): Promise<Partial<AppearancePrefs>> {
  try {
    if (Platform.OS === 'web') {
      const raw =
        typeof localStorage === 'undefined'
          ? null
          : localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Partial<AppearancePrefs>) : {};
    }
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppearancePrefs>) : {};
  } catch {
    return {};
  }
}

async function writeStoredPrefs(prefs: AppearancePrefs): Promise<void> {
  const raw = JSON.stringify(prefs);
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, raw);
      }
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  } catch {
    // Appearance is a preference; failing to persist must never block use.
  }
}

interface AppearanceContextValue {
  prefs: AppearancePrefs;
  /** Resolved tokens + legacy aliases for the active scheme. */
  theme: AppTheme;
  mode: 'light' | 'dark';
  loaded: boolean;
  setPalette: (palette: PaletteId) => void;
  setFont: (font: FontId) => void;
  setAccent: (accent: AccentId) => void;
  setScale: (scale: number) => void;
  reset: () => void;
}

const fallbackTheme = buildAppTheme(
  resolveAppearanceTheme('desk', 'gold', 'light'),
  'alegreya',
);

const AppearanceContext = React.createContext<AppearanceContextValue>({
  prefs: DEFAULT_APPEARANCE,
  theme: fallbackTheme,
  mode: 'light',
  loaded: false,
  setPalette: () => {},
  setFont: () => {},
  setAccent: () => {},
  setScale: () => {},
  reset: () => {},
});

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const [prefs, setPrefs] = React.useState<AppearancePrefs>(DEFAULT_APPEARANCE);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStoredPrefs();
      if (cancelled) return;
      setPrefs({
        palette: isPaletteId(stored.palette ?? '')
          ? stored.palette!
          : DEFAULT_APPEARANCE.palette,
        font: isFontId(stored.font ?? '')
          ? stored.font!
          : DEFAULT_APPEARANCE.font,
        accent: isAccentId(stored.accent ?? '')
          ? stored.accent!
          : DEFAULT_APPEARANCE.accent,
        scale: clampScale(stored.scale ?? 1),
      });
      // One-time migration from the web key names.
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = React.useCallback((patch: Partial<AppearancePrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      next.scale = clampScale(next.scale);
      void writeStoredPrefs(next);
      return next;
    });
  }, []);

  const mode = scheme === 'dark' ? 'dark' : 'light';
  const theme = React.useMemo(
    () =>
      buildAppTheme(
        resolveAppearanceTheme(prefs.palette, prefs.accent, mode),
        prefs.font,
        prefs.scale,
      ),
    [prefs.palette, prefs.accent, prefs.font, prefs.scale, mode],
  );

  const value = React.useMemo<AppearanceContextValue>(
    () => ({
      prefs,
      theme,
      mode,
      loaded,
      setPalette: (palette) => update({ palette }),
      setFont: (font) => update({ font }),
      setAccent: (accent) => update({ accent }),
      setScale: (scale) => update({ scale }),
      reset: () => update(DEFAULT_APPEARANCE),
    }),
    [prefs, theme, mode, loaded, update],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  return React.useContext(AppearanceContext);
}
