import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase/client';
import { authStorage } from './supabase/storage';
import {
  normalizePhoneE164,
  phoneToSyntheticEmail,
  isSyntheticPhoneEmail,
  syntheticEmailToPhone,
} from '@/src/utils/phone';
import { mapAuthError } from '@/src/features/auth/errors';
import { User, Session } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  shop_name: string;
  phone?: string | null;
  language: 'en' | 'gu';
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  error?: string;
}

export const authService = {
  /**
   * Register a new user with Shop Name, Mobile Number and Password
   * (Zero-cost native Supabase Auth engine)
   */
  async signUpWithPhone(shopName: string, rawPhone: string, password: string): Promise<AuthResult> {
    try {
      const syntheticEmail = phoneToSyntheticEmail(rawPhone);
      const normalizedPhone = normalizePhoneE164(rawPhone);

      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
          data: {
            shop_name: shopName.trim(),
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        return {
          user: null,
          session: null,
          profile: null,
          error: mapAuthError(error),
        };
      }

      const user = data.user;
      if (!user) {
        return {
          user: null,
          session: null,
          profile: null,
          error: 'Registration failed. Please try again.',
        };
      }

      // Create / upsert profile record in database
      const profileData: UserProfile = {
        id: user.id,
        shop_name: shopName.trim(),
        phone: normalizedPhone,
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
      } catch {
        // Profile table might not be initialized yet in early Phase 2 before DB migration
      }

      return {
        user,
        session: data.session,
        profile: profileData,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        profile: null,
        error: mapAuthError(err),
      };
    }
  },

  /**
   * Login with Mobile Number and Password
   */
  async signInWithPhone(
    rawPhone: string,
    password: string,
    rememberMe = true,
  ): Promise<AuthResult> {
    try {
      const syntheticEmail = phoneToSyntheticEmail(rawPhone);

      // Save Remember Me preference
      await authStorage.setRememberMe(rememberMe);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          profile: null,
          error: mapAuthError(error),
        };
      }

      const user = data.user;
      const profile = user ? await this.getUserProfile(user.id, user) : null;

      return {
        user,
        session: data.session,
        profile,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        profile: null,
        error: mapAuthError(err),
      };
    }
  },

  /**
   * Google OAuth Login via Supabase & WebBrowser
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'shayonainvoice',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        return {
          user: null,
          session: null,
          profile: null,
          error: mapAuthError(error || 'Failed to initialize Google login.'),
        };
      }

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success' && res.url) {
        // Parse access_token and refresh_token from redirect url hash/query
        const parsedUrl = new URL(res.url);
        const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(parsedUrl.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionErr) {
            return {
              user: null,
              session: null,
              profile: null,
              error: mapAuthError(sessionErr),
            };
          }

          const user = sessionData.user;
          const profile = user ? await this.getUserProfile(user.id, user) : null;

          return {
            user,
            session: sessionData.session,
            profile,
          };
        }
      }

      if (res.type === 'cancel' || res.type === 'dismiss') {
        return {
          user: null,
          session: null,
          profile: null,
          error: 'Google login was cancelled.',
        };
      }

      // Check if session is already refreshed
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session?.user) {
        const user = currentSession.session.user;
        const profile = await this.getUserProfile(user.id, user);
        return {
          user,
          session: currentSession.session,
          profile,
        };
      }

      return {
        user: null,
        session: null,
        profile: null,
        error: 'Authentication incomplete. Please try again.',
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        profile: null,
        error: mapAuthError(err),
      };
    }
  },

  /**
   * Request password recovery for mobile number
   */
  async requestPasswordResetOtp(rawPhone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const syntheticEmail = phoneToSyntheticEmail(rawPhone);

      const { error } = await supabase.auth.resetPasswordForEmail(syntheticEmail);

      if (error) {
        return { success: false, error: mapAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: mapAuthError(err) };
    }
  },

  /**
   * Verify OTP / Recovery token and update password
   */
  async verifyOtpAndResetPassword(
    rawPhone: string,
    otp: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const syntheticEmail = phoneToSyntheticEmail(rawPhone);

      // Verify recovery token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: syntheticEmail,
        token: otp.trim(),
        type: 'recovery',
      });

      if (verifyError) {
        return { success: false, error: mapAuthError(verifyError) };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: mapAuthError(updateError) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: mapAuthError(err) };
    }
  },

  /**
   * Fetch or create user profile
   */
  async getUserProfile(userId: string, userFallback?: User): Promise<UserProfile> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (data && !error) {
        return data as UserProfile;
      }
    } catch {
      // Handled by fallback below
    }

    // Fallback profile if record does not exist yet
    const shopName =
      (userFallback?.user_metadata?.shop_name as string) ||
      (userFallback?.user_metadata?.full_name as string) ||
      'Shayona Enterprise';

    let displayPhone =
      userFallback?.phone || (userFallback?.user_metadata?.phone as string) || null;
    if (!displayPhone && isSyntheticPhoneEmail(userFallback?.email)) {
      displayPhone = `+91${syntheticEmailToPhone(userFallback?.email || '')}`;
    }

    return {
      id: userId,
      shop_name: shopName,
      phone: displayPhone,
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  /**
   * Sign out and clear stored sessions
   */
  async signOut(): Promise<{ error?: string }> {
    try {
      await supabase.auth.signOut();
      await authStorage.clearAllAuth();
      return {};
    } catch (err) {
      return { error: mapAuthError(err) };
    }
  },
};
