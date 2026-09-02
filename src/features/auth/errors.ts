/**
 * Retailer-Friendly Auth Error Mapping
 * Translates technical Supabase and network errors into clean, intuitive messages.
 */

export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = (error as { message?: string }).message || String(error);
  const status = (error as { status?: number }).status;

  const lower = message.toLowerCase();

  // Invalid login credentials
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('user not found') ||
    lower.includes('invalid credentials')
  ) {
    return 'Incorrect mobile number or password. Please verify and try again.';
  }

  // Duplicate registration
  if (
    lower.includes('user already registered') ||
    lower.includes('already exists') ||
    lower.includes('phone number already in use')
  ) {
    return 'An account with this mobile number already exists. Please login instead.';
  }

  // Phone number format issues
  if (lower.includes('invalid phone') || lower.includes('phone format')) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  // OTP / Verification errors
  if (
    lower.includes('token has expired') ||
    lower.includes('token is invalid') ||
    lower.includes('otp expired') ||
    lower.includes('invalid token') ||
    lower.includes('verification code')
  ) {
    return 'The verification code is invalid or has expired. Please request a new code.';
  }

  // Rate limiting / Too many requests
  if (lower.includes('rate limit') || lower.includes('too many requests') || status === 429) {
    return 'Too many attempts. Please wait a minute before trying again.';
  }

  // Password requirements
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password must be at least 6 characters long.';
  }

  // Network / connection errors
  if (
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('connection refused') ||
    lower.includes('failed to fetch')
  ) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Google OAuth cancellation / failure
  if (
    lower.includes('user_cancelled') ||
    lower.includes('cancelled') ||
    lower.includes('dismiss')
  ) {
    return 'Google sign-in was cancelled.';
  }

  // Safe fallback
  return message || 'An error occurred during authentication. Please try again.';
}
