import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore, THEME_STORAGE_KEY } from '../themeStore';
import { lightColors, darkColors, ThemeColors } from '../colors';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Global Theme System', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ themeMode: 'system', isInitialized: false });
  });

  describe('Theme Tokens Integrity', () => {
    const requiredKeys: (keyof ThemeColors)[] = [
      'primary',
      'primaryLight',
      'primaryDark',
      'accent',
      'accentLight',
      'accentSubtle',
      'jama',
      'jamaLight',
      'jamaBackground',
      'jamaBorder',
      'baki',
      'bakiLight',
      'bakiBackground',
      'bakiBorder',
      'success',
      'successBackground',
      'warning',
      'warningBackground',
      'info',
      'infoBackground',
      'danger',
      'dangerBackground',
      'background',
      'surface',
      'surfaceSubtle',
      'textPrimary',
      'textSecondary',
      'textMuted',
      'textInverse',
      'textLink',
      'border',
      'borderDark',
      'borderLight',
      'divider',
      'overlay',
      'backdrop',
    ];

    it('lightColors has valid string values for all required tokens', () => {
      for (const key of requiredKeys) {
        expect(lightColors[key]).toBeDefined();
        expect(typeof lightColors[key]).toBe('string');
        expect(lightColors[key].length).toBeGreaterThan(0);
      }
    });

    it('darkColors has valid string values for all required tokens', () => {
      for (const key of requiredKeys) {
        expect(darkColors[key]).toBeDefined();
        expect(typeof darkColors[key]).toBe('string');
        expect(darkColors[key].length).toBeGreaterThan(0);
      }
    });

    it('dark mode financial semantics (Jama & Baki) have high-contrast accessible tokens', () => {
      expect(darkColors.jama).toBe('#10B981');
      expect(darkColors.baki).toBe('#F87171');
      expect(darkColors.background).toBe('#0F172A');
      expect(darkColors.surface).toBe('#1E293B');
      expect(darkColors.textPrimary).toBe('#F8FAFC');
    });
  });

  describe('Theme Store & Persistence', () => {
    it('defaults to system theme when uninitialized', async () => {
      await useThemeStore.getState().initializeTheme();
      expect(useThemeStore.getState().themeMode).toBe('system');
      expect(useThemeStore.getState().isInitialized).toBe(true);
    });

    it('persists and switches to light mode', async () => {
      await useThemeStore.getState().setThemeMode('light');
      expect(useThemeStore.getState().themeMode).toBe('light');

      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      expect(stored).toBe('light');
    });

    it('persists and switches to dark mode', async () => {
      await useThemeStore.getState().setThemeMode('dark');
      expect(useThemeStore.getState().themeMode).toBe('dark');

      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      expect(stored).toBe('dark');
    });

    it('hydrates saved dark theme preference on bootstrap', async () => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
      await useThemeStore.getState().initializeTheme();
      expect(useThemeStore.getState().themeMode).toBe('dark');
    });

    it('safely recovers and falls back to system default if stored value is invalid/corrupted', async () => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, 'invalid_corrupted_value');
      await useThemeStore.getState().initializeTheme();
      expect(useThemeStore.getState().themeMode).toBe('system');
    });
  });
});
