/**
 * Light/dark theme preference, mirroring web's src/hooks/useTheme.ts:
 * a user-togglable "light" | "dark" | "system" preference persisted to
 * disk (web: localStorage key `koda_theme`; mobile: expo-secure-store,
 * same key, following the pattern in api/tokenStore.ts), defaulting to
 * the OS preference when nothing has been chosen yet.
 *
 * NativeWind v4's `dark:` className variant is driven by its own
 * `colorScheme` store (react-native-css-interop), not by React state --
 * calling `colorScheme.set(...)` is what actually flips every `dark:`
 * class in the app. This hook is a thin wrapper that also persists the
 * choice and exposes it for a Settings screen control.
 */
import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { colorScheme, useColorScheme } from "nativewind";

export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "koda_theme";

async function getStoredPreference(): Promise<ThemePreference> {
  try {
    const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch (err) {
    console.warn("[useAppTheme] Failed to read stored theme:", err);
  }
  return "system";
}

/** Call once, near app start (before first paint of themed content) to
 * apply any previously-saved preference. Safe to call multiple times. */
export async function initAppTheme(): Promise<void> {
  const stored = await getStoredPreference();
  colorScheme.set(stored);
}

export function useAppTheme(): {
  /** The user's stored choice, including "system". */
  preference: ThemePreference;
  /** The resolved light/dark scheme actually in effect right now. */
  activeScheme: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
} {
  const { colorScheme: activeScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    getStoredPreference().then(setPreferenceState);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    colorScheme.set(next);
    SecureStore.setItemAsync(THEME_STORAGE_KEY, next).catch((err) => {
      console.warn("[useAppTheme] Failed to persist theme:", err);
    });
  }, []);

  return { preference, activeScheme: activeScheme ?? "light", setPreference };
}
