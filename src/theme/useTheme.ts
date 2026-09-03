import { useColorScheme } from 'react-native';
import { useThemeStore } from './themeStore';
import { lightColors, darkColors, ThemeColors, ThemeMode } from './colors';

export interface ThemeContextValue {
  themeMode: ThemeMode;
  activeTheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export function useTheme(): ThemeContextValue {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore(state => state.themeMode);
  const setThemeMode = useThemeStore(state => state.setThemeMode);
  const initializeTheme = useThemeStore(state => state.initializeTheme);

  const activeTheme: 'light' | 'dark' =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  const isDark = activeTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return {
    themeMode,
    activeTheme,
    isDark,
    colors,
    setThemeMode,
    initializeTheme,
  };
}
