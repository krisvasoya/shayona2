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
  primaryAccentPressed: string;
  primaryAccentSoft: string;

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

  // Expense / Warning (Amber/Gold)
  expense: string;
  expenseBackground: string;

  // Status Colors
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  info: string;
  infoBackground: string;
  danger: string;
  dangerBackground: string;

  // Neutrals & Surfaces
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceInput: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;

  // Borders & Dividers
  border: string;
  borderDark: string;
  borderLight: string;
  divider: string;

  // Controls & Disabled
  disabled: string;
  disabledText: string;
  white: string;

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
  primaryAccentPressed: '#1D4ED8',
  primaryAccentSoft: '#EFF6FF',

  // Financial Semantics
  jama: '#059669', // Emerald 600
  jamaLight: '#10B981',
  jamaBackground: '#ECFDF5', // Emerald 50
  jamaBorder: '#A7F3D0', // Emerald 200

  baki: '#DC2626', // Red 600
  bakiLight: '#EF4444',
  bakiBackground: '#FEF2F2', // Red 50
  bakiBorder: '#FECACA', // Red 200

  // Expense
  expense: '#D97706', // Amber 600
  expenseBackground: '#FFFBEB', // Amber 50

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
  surfaceElevated: '#FFFFFF',
  surfaceInput: '#FFFFFF',

  // Text Colors
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textTertiary: '#94A3B8', // Slate 400
  textMuted: '#94A3B8', // Slate 400
  textInverse: '#FFFFFF',
  textLink: '#2563EB',

  // Borders & Dividers
  border: '#E2E8F0', // Slate 200
  borderDark: '#CBD5E1', // Slate 300
  borderLight: '#F1F5F9', // Slate 100
  divider: '#E2E8F0',

  // Controls & Disabled
  disabled: '#CBD5E1',
  disabledText: '#94A3B8',
  white: '#FFFFFF',

  // Special UI
  overlay: 'rgba(15, 23, 42, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: ThemeColors = {
  // Brand & Primary
  primary: '#4F8CFF', // PRIMARY ACCENT
  primaryLight: '#54B8FF',
  primaryDark: '#3D73D9', // PRIMARY ACCENT PRESSED
  accent: '#4F8CFF', // PRIMARY ACCENT
  accentLight: '#54B8FF',
  accentSubtle: '#1E3A68', // PRIMARY ACCENT SOFT
  primaryAccentPressed: '#3D73D9',
  primaryAccentSoft: '#1E3A68',

  // Financial Semantics
  // Jama / Received Amount (Green)
  jama: '#35D08A', // SUCCESS / JAMA
  jamaLight: '#4EE39D',
  jamaBackground: '#123D30', // SUCCESS SOFT
  jamaBorder: '#35D08A',

  // Baki / Outstanding / Due Amount (Red)
  baki: '#FF626B', // DANGER / BAKI
  bakiLight: '#FF858C',
  bakiBackground: '#4A2027', // DANGER SOFT
  bakiBorder: '#FF626B',

  // Expense / Warning (Amber/Gold)
  expense: '#F3B94B', // EXPENSE / WARNING
  expenseBackground: '#493718', // EXPENSE SOFT

  // Status Colors
  success: '#35D08A',
  successBackground: '#123D30',
  warning: '#F3B94B',
  warningBackground: '#493718',
  info: '#54B8FF',
  infoBackground: '#1E3A68',
  danger: '#FF626B',
  dangerBackground: '#4A2027',

  // Neutrals & Surfaces (Depth Hierarchy)
  background: '#0B1220', // BACKGROUND
  surface: '#151F33', // PRIMARY SURFACE (Cards / Headers / Modals)
  surfaceSubtle: '#1C2940', // ELEVATED SURFACE
  surfaceElevated: '#1C2940', // ELEVATED SURFACE
  surfaceInput: '#202D44', // INPUT / CONTROL SURFACE

  // Text Colors
  textPrimary: '#F5F7FB', // PRIMARY TEXT
  textSecondary: '#AEB9CA', // SECONDARY TEXT
  textTertiary: '#7F8CA1', // TERTIARY TEXT
  textMuted: '#7F8CA1', // Hints / Placeholder
  textInverse: '#0B1220',
  textLink: '#4F8CFF',

  // Borders & Dividers
  border: '#33435C', // BORDER
  borderDark: '#415574',
  borderLight: '#202D44',
  divider: '#33435C',

  // Controls & Disabled
  disabled: '#566276', // DISABLED
  disabledText: '#737F92', // DISABLED TEXT
  white: '#FFFFFF',

  // Special UI
  overlay: 'rgba(11, 18, 32, 0.75)',
  backdrop: 'rgba(0, 0, 0, 0.65)',
};

// Default fallback colors matching Light theme
export const colors: ThemeColors = lightColors;

export type ColorName = keyof ThemeColors;
export type ThemeMode = 'system' | 'light' | 'dark';
