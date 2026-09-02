import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

export interface AppTextProps extends RNTextProps {
  variant?: keyof typeof typography;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = colors.textPrimary,
  style,
  children,
  ...rest
}) => {
  const variantStyle = typography[variant] || typography.body;

  return (
    <RNText style={[styles.base, variantStyle, { color }, style]} {...rest}>
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
