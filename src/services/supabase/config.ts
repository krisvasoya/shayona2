/**
 * Supabase Client Configuration
 * Safely loads public credentials and provides diagnostics when unconfigured.
 */

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zuupwlmockewznmnvqik.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_JWXGW8SNfc7M9a2VmsPnHg_pC9iaYFL';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_ANON_KEY;

  return (
    Boolean(url) && Boolean(key) && !url.includes('your-supabase-project') && !url.includes('fake')
  );
};
