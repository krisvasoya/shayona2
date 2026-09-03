import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from './colors';

export const THEME_STORAGE_KEY = '@shayona_theme_preference';

interface ThemeStoreState {
  themeMode: ThemeMode;
  isInitialized: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  themeMode: 'system',
  isInitialized: false,

  initializeTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ themeMode: stored, isInitialized: true });
      } else {
        set({ themeMode: 'system', isInitialized: true });
      }
    } catch {
      set({ themeMode: 'system', isInitialized: true });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    try {
      set({ themeMode: mode });
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Non-blocking fallback
    }
  },
}));
