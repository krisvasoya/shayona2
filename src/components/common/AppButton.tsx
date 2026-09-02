import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { AppText } from './AppText';
import { colors } from '@/src/theme/colors';
import { buttonStyles, buttonVariants } from '@/src/theme/buttonStyles';

export type ButtonVariant = keyof typeof buttonVariants;
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
  const variantConfig = buttonVariants[variant] || buttonVariants.primary;
  const sizeStyle = size === 'sm' ? buttonStyles.sm : size === 'lg' ? buttonStyles.lg : undefined;
  const isDisabled = disabled || loading;

  const indicatorColor =
    variant === 'secondary' || variant === 'ghost' || variant === 'outline'
      ? colors.primary
      : colors.textInverse;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        buttonStyles.base,
        variantConfig.container,
        sizeStyle,
        fullWidth && buttonStyles.fullWidth,
        isDisabled && buttonStyles.disabled,
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={indicatorColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? icon : null}
          <AppText
            variant="button"
            style={[
              variantConfig.text,
              icon && iconPosition === 'left' ? { marginLeft: 8 } : undefined,
              icon && iconPosition === 'right' ? { marginRight: 8 } : undefined,
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
