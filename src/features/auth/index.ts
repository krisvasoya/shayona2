/**
 * Authentication Feature Module Placeholder
 * Real Google OAuth + Supabase auth integration will be added in Phase 2.
 */

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  shopName: string | null;
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  userId: null,
  userEmail: null,
  shopName: null,
};
