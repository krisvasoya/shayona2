import { useAuthStore } from '@/src/store/authStore';

export function useAuth() {
  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const profile = useAuthStore(state => state.profile);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const rememberMe = useAuthStore(state => state.rememberMe);
  const initialize = useAuthStore(state => state.initialize);
  const setSession = useAuthStore(state => state.setSession);
  const setProfile = useAuthStore(state => state.setProfile);
  const setRememberMe = useAuthStore(state => state.setRememberMe);
  const signOut = useAuthStore(state => state.signOut);

  return {
    user,
    session,
    profile,
    isAuthenticated,
    isLoading,
    isInitialized,
    rememberMe,
    initialize,
    setSession,
    setProfile,
    setRememberMe,
    signOut,
  };
}
