/**
 * Centralized Color Palette for Shayona Invoice
 * Designed for clean, professional, high-contrast, small-retailer mobile UX.
 */

export const colors = {
  // Brand & Primary
  primary: '#1E293B', // Slate 800 (Dark elegant primary)
  primaryLight: '#334155',
  primaryDark: '#0F172A', // Slate 900
  accent: '#2563EB', // Royal Blue
  accentLight: '#3B82F6',
  accentSubtle: '#EFF6FF',

  // Financial Semantics
  // Jama / Received Amount (Green)
  jama: '#059669', // Emerald 600
  jamaLight: '#10B981',
  jamaBackground: '#ECFDF5', // Emerald 50

  // Baki / Outstanding / Due Amount (Red/Rose)
  baki: '#DC2626', // Red 600
  bakiLight: '#EF4444',
  bakiBackground: '#FEF2F2', // Red 50

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
  background: '#F8FAFC', // Slate 50 (Screen background)
  surface: '#FFFFFF', // Card / Modal / Input background
  surfaceSubtle: '#F1F5F9', // Secondary container background

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
} as const;

export type ColorName = keyof typeof colors;
