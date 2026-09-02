import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabase/client';
import { authStorage } from '@/src/services/supabase/storage';
import { authService, UserProfile } from '@/src/services/auth.service';

export interface AuthStoreState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  rememberMe: boolean;

  // Actions
  initialize: () => Promise<void>;
  setSession: (session: Session | null, profile?: UserProfile | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setRememberMe: (enabled: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  rememberMe: true,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const rememberMe = await authStorage.getRememberMe();

      // Retrieve existing session from Supabase client
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          rememberMe,
        });
        return;
      }

      const session = data.session;
      const user = session.user;
      const profile = await authService.getUserProfile(user.id, user);

      set({
        user,
        session,
        profile,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        rememberMe,
      });
    } catch {
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  setSession: (session, profile = null) => {
    const user = session?.user || null;
    set({
      session,
      user,
      profile,
      isAuthenticated: Boolean(session && user),
      isLoading: false,
    });
  },

  setProfile: profile => {
    set({ profile });
  },

  setRememberMe: async enabled => {
    await authStorage.setRememberMe(enabled);
    set({ rememberMe: enabled });
  },

  signOut: async () => {
    set({ isLoading: true });
    await authService.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
