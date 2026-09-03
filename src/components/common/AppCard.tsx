import React from 'react';
import {
  View,
  ViewProps,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/src/theme';
import { borderRadius } from '@/src/theme/borderRadius';
import { spacing } from '@/src/theme/spacing';
import { shadows } from '@/src/theme/shadows';

export type CardVariant = 'default' | 'elevated' | 'flat' | 'jama' | 'baki' | 'neutral';

export interface AppCardProps extends ViewProps {
  variant?: CardVariant;
  onPress?: TouchableOpacityProps['onPress'];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({
  variant = 'default',
  onPress,
  style,
  children,
  ...rest
}) => {
  const { colors, isDark } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.border,
          ...(isDark ? {} : shadows.md),
          marginBottom: spacing.md,
        };
      case 'flat':
        return {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
          borderRadius: borderRadius.md,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        };
      case 'jama':
        return {
          backgroundColor: colors.jamaBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.jamaBorder,
          ...(isDark ? {} : shadows.sm),
          marginBottom: spacing.md,
        };
      case 'baki':
        return {
          backgroundColor: colors.bakiBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.bakiBorder,
          ...(isDark ? {} : shadows.sm),
          marginBottom: spacing.md,
        };
      case 'neutral':
        return {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.border,
          ...(isDark ? {} : shadows.sm),
          marginBottom: spacing.md,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.cardPadding,
          borderWidth: 1,
          borderColor: colors.border,
          ...(isDark ? {} : shadows.sm),
          marginBottom: spacing.md,
        };
    }
  };

  // Prevent static light theme colors from overriding dark mode card backgrounds
  const resolvedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const cleanedStyle: ViewStyle = { ...resolvedStyle };
  if (isDark && cleanedStyle.backgroundColor) {
    const bg = String(cleanedStyle.backgroundColor).toLowerCase();
    if (
      bg === '#ffffff' ||
      bg === '#fff' ||
      bg === 'white' ||
      bg === '#f8fafc' ||
      bg === '#f1f5f9'
    ) {
      cleanedStyle.backgroundColor =
        variant === 'elevated' ? colors.surfaceElevated : colors.surface;
    }
  }

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[getVariantStyle(), cleanedStyle]}
        accessibilityRole="button"
        {...(rest as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getVariantStyle(), cleanedStyle]} {...rest}>
      {children}
    </View>
  );
};
