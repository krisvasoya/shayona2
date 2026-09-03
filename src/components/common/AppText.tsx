import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/src/theme';
import { typography } from '@/src/theme/typography';

export interface AppTextProps extends RNTextProps {
  variant?: keyof typeof typography;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}) => {
  const { colors } = useTheme();
  const variantStyle = typography[variant] || typography.body;
  const textColor = color || colors.textPrimary;

  return (
    <RNText style={[styles.base, variantStyle, { color: textColor }, style]} {...rest}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
