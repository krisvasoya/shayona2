/**
 * Centralized Color Tokens for Shayona Invoice
 * High-contrast, elegant palette supporting Light Mode and Dark Mode.
 */

export interface ThemeColors {
  // Brand & Primary
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  accentSubtle: string;

  // Financial Semantics
  // Jama / Received Amount (Green)
  jama: string;
  jamaLight: string;
  jamaBackground: string;
  jamaBorder: string;

  // Baki / Outstanding / Due Amount (Red)
  baki: string;
  bakiLight: string;
  bakiBackground: string;
  bakiBorder: string;

  // Status Colors
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  info: string;
  infoBackground: string;
  danger: string;
  dangerBackground: string;

  // Neutrals & Backgrounds
  background: string;
  surface: string;
  surfaceSubtle: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;

  // Borders & Dividers
  border: string;
  borderDark: string;
  borderLight: string;
  divider: string;

  // Special UI
  overlay: string;
  backdrop: string;
}

export const lightColors: ThemeColors = {
  // Brand & Primary
  primary: '#1E293B', // Slate 800
  primaryLight: '#334155',
  primaryDark: '#0F172A',
  accent: '#2563EB', // Royal Blue
  accentLight: '#3B82F6',
  accentSubtle: '#EFF6FF',

  // Financial Semantics
  jama: '#059669', // Emerald 600
  jamaLight: '#10B981',
  jamaBackground: '#ECFDF5', // Emerald 50
  jamaBorder: '#A7F3D0', // Emerald 200

  baki: '#DC2626', // Red 600
  bakiLight: '#EF4444',
  bakiBackground: '#FEF2F2', // Red 50
  bakiBorder: '#FECACA', // Red 200

  // Status Colors
  success: '#16A34A',
  successBackground: '#F0FDF4',
  warning: '#D97706',
  warningBackground: '#FFFBEB',
  info: '#0284C7',
  infoBackground: '#F0F9FF',
  danger: '#DC2626',
  dangerBackground: '#FEF2F2',

  // Neutrals & Backgrounds
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF', // Clean White Card / Modal
  surfaceSubtle: '#F1F5F9', // Slate 100

  // Text Colors
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  textInverse: '#FFFFFF',
  textLink: '#2563EB',

  // Borders & Dividers
  border: '#E2E8F0', // Slate 200
  borderDark: '#CBD5E1', // Slate 300
  borderLight: '#F1F5F9', // Slate 100
  divider: '#E2E8F0',

  // Special UI
  overlay: 'rgba(15, 23, 42, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: ThemeColors = {
  // Brand & Primary
  primary: '#38BDF8', // Sky 400 (Readable brand in dark mode)
  primaryLight: '#0284C7',
  primaryDark: '#0369A1',
  accent: '#3B82F6', // Blue 500
  accentLight: '#60A5FA',
  accentSubtle: '#1E293B',

  // Financial Semantics
  jama: '#10B981', // Emerald 500
  jamaLight: '#34D399',
  jamaBackground: '#064E3B33', // Deep Emerald tint
  jamaBorder: '#065F46',

  baki: '#F87171', // Red 400
  bakiLight: '#EF4444',
  bakiBackground: '#7F1D1D33', // Deep Red tint
  bakiBorder: '#991B1B',

  // Status Colors
  success: '#10B981',
  successBackground: '#064E3B33',
  warning: '#FBBF24',
  warningBackground: '#78350F33',
  info: '#38BDF8',
  infoBackground: '#0C4A6E33',
  danger: '#F87171',
  dangerBackground: '#7F1D1D33',

  // Neutrals & Backgrounds
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800 (Card / Modal Surface)
  surfaceSubtle: '#334155', // Slate 700

  // Text Colors
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  textInverse: '#0F172A',
  textLink: '#60A5FA',

  // Borders & Dividers
  border: '#334155', // Slate 700
  borderDark: '#475569', // Slate 600
  borderLight: '#1E293B',
  divider: '#334155',

  // Special UI
  overlay: 'rgba(0, 0, 0, 0.75)',
  backdrop: 'rgba(0, 0, 0, 0.65)',
};

// Default fallback colors matching Light theme
export const colors: ThemeColors = lightColors;

export type ColorName = keyof ThemeColors;
export type ThemeMode = 'system' | 'light' | 'dark';
