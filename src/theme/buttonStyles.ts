import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './borderRadius';
import { spacing } from './spacing';
import { fontSize, fontWeight } from './typography';

export interface ButtonVariantStyle {
  container: ViewStyle;
  text: TextStyle;
}

export const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48, // Large accessible touch target
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  lg: {
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export const buttonVariants: Record<string, ButtonVariantStyle> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
    },
    text: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
  accent: {
    container: {
      backgroundColor: colors.accent,
    },
    text: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
  jama: {
    container: {
      backgroundColor: colors.jama,
    },
    text: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
  baki: {
    container: {
      backgroundColor: colors.baki,
    },
    text: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      color: colors.textPrimary,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    text: {
      color: colors.primary,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: colors.textSecondary,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
  },
  danger: {
    container: {
      backgroundColor: colors.danger,
    },
    text: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  },
};
