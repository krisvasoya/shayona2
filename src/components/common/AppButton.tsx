import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/src/theme';
import { borderRadius } from '@/src/theme/borderRadius';
import { spacing } from '@/src/theme/spacing';
import { fontSize, fontWeight } from '@/src/theme/typography';

export type ButtonVariant =
  'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success' | 'jama' | 'baki';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  textStyle,
  ...rest
}) => {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; indicator: string } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: {
            color: colors.textPrimary,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: colors.textPrimary,
        };
      case 'accent':
        return {
          container: {
            backgroundColor: colors.accent,
          },
          text: {
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: '#FFFFFF',
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDark ? colors.border : colors.borderDark,
          },
          text: {
            color: colors.textPrimary,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: colors.textPrimary,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: colors.textPrimary,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: colors.textPrimary,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.danger,
          },
          text: {
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: '#FFFFFF',
        };
      case 'jama':
      case 'success':
        return {
          container: {
            backgroundColor: colors.jama,
          },
          text: {
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: '#FFFFFF',
        };
      case 'baki':
        return {
          container: {
            backgroundColor: colors.baki,
          },
          text: {
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: isDark ? colors.accent : colors.primary,
          },
          text: {
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          },
          indicator: '#FFFFFF',
        };
    }
  };

  const currentVariant = getVariantStyles();
  const sizeStyle = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : undefined;
  const isDisabled = disabled || loading;

  const disabledContainerStyle: ViewStyle = isDark
    ? { backgroundColor: colors.disabled, borderColor: colors.border }
    : styles.disabled;

  const disabledTextStyle: TextStyle = isDark ? { color: colors.disabledText } : {};

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        currentVariant.container,
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && disabledContainerStyle,
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.indicator} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? icon : null}
          <AppText
            variant="button"
            style={[
              currentVariant.text,
              icon && iconPosition === 'left' ? { marginLeft: 8 } : undefined,
              icon && iconPosition === 'right' ? { marginRight: 8 } : undefined,
              isDisabled && disabledTextStyle,
              textStyle,
            ]}
          >
            {title}
          </AppText>
          {icon && iconPosition === 'right' ? icon : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
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
