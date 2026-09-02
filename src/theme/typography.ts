import { TextStyle } from 'react-native';

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: 26,
  },
  h4: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: 22,
  },
  bodyLargeMedium: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: 22,
  },
  bodyLargeBold: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: 22,
  },
  body: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: 16,
  },
  button: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  metric: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
};
