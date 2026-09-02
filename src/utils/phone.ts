/**
 * Indian Mobile Number Validation and Normalization Utilities
 */

export const PHONE_AUTH_DOMAIN = 'phone.shayona.internal';

/**
 * Checks if a string is a valid Indian 10-digit mobile number.
 * Valid Indian mobile numbers:
 * - 10 digits
 * - Starting with 6, 7, 8, or 9
 * Allows spaces, hyphens, and leading '+91' or '0' or '91' when entering.
 */
export function isValidIndianMobile(raw: string): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return /^[6-9]\d{9}$/.test(digits.slice(1));
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return false;
}

/**
 * Normalizes any valid Indian phone input into standard E.164 format:
 * e.g. "9876543210" -> "+919876543210"
 */
export function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91${digits.slice(2)}`;
  }
  if (raw.startsWith('+')) {
    return `+${digits}`;
  }
  return `+91${digits}`;
}

/**
 * Extracts 10-digit standard display mobile number:
 * e.g. "+919876543210" -> "9876543210"
 */
export function extract10DigitPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Formats a phone number for user-friendly display in UI:
 * e.g. "+919876543210" -> "+91 98765 43210"
 */
export function formatPhoneDisplay(raw: string): string {
  const tenDigits = extract10DigitPhone(raw);
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  return raw;
}

/**
 * Maps a 10-digit Indian mobile number to a zero-cost Supabase Auth identity:
 * e.g. "9876543210" -> "9876543210@phone.shayona.internal"
 */
export function phoneToSyntheticEmail(rawPhone: string): string {
  const tenDigits = extract10DigitPhone(rawPhone);
  return `${tenDigits}@${PHONE_AUTH_DOMAIN}`;
}

/**
 * Checks if an email is a synthetic phone identity
 */
export function isSyntheticPhoneEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.endsWith(`@${PHONE_AUTH_DOMAIN}`);
}

/**
 * Extracts the 10-digit mobile number from a synthetic email
 */
export function syntheticEmailToPhone(email: string): string {
  if (isSyntheticPhoneEmail(email)) {
    return email.split('@')[0];
  }
  return email;
}
