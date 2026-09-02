import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Translations } from './translations';
import { supabase } from '@/src/services/supabase/client';

export type SupportedLanguage = 'en' | 'gu';

export const supportedLanguages: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

const LANGUAGE_STORAGE_KEY = '@shayona_language_preference';

interface LanguageStoreState {
  language: SupportedLanguage;
  isInitialized: boolean;
  setLanguage: (lang: SupportedLanguage, userId?: string) => Promise<void>;
  initializeLanguage: (userPreferredLang?: string | null) => Promise<void>;
}

export const useLanguageStore = create<LanguageStoreState>((set, get) => ({
  language: 'en',
  isInitialized: false,

  initializeLanguage: async (userPreferredLang?: string | null) => {
    try {
      if (userPreferredLang === 'en' || userPreferredLang === 'gu') {
        set({ language: userPreferredLang, isInitialized: true });
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, userPreferredLang);
        return;
      }

      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'gu') {
        set({ language: stored, isInitialized: true });
      } else {
        set({ language: 'en', isInitialized: true });
      }
    } catch {
      set({ language: 'en', isInitialized: true });
    }
  },

  setLanguage: async (lang: SupportedLanguage, userId?: string) => {
    try {
      set({ language: lang });
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

      // Sync with Supabase profile if userId is available
      if (userId) {
        await (supabase.from('profiles') as any)
          .update({ language: lang, updated_at: new Date().toISOString() })
          .eq('id', userId);
      }
    } catch {
      // Non-blocking fallback
    }
  },
}));

/**
 * Custom hook to access current translations and language state
 */
export function useLanguage() {
  const language = useLanguageStore(state => state.language);
  const setLanguage = useLanguageStore(state => state.setLanguage);
  const initializeLanguage = useLanguageStore(state => state.initializeLanguage);

  const t: Translations = translations[language] || translations.en;

  return {
    language,
    isGu: language === 'gu',
    setLanguage,
    initializeLanguage,
    t,
  };
}

export { translations };
