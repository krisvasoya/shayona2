import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@/src/theme/colors';
import { borderRadius } from '@/src/theme/borderRadius';
import { spacing } from '@/src/theme/spacing';
import { fontSize, fontWeight } from '@/src/theme/typography';

export type BadgeVariant = 'jama' | 'baki' | 'danger' | 'success' | 'warning' | 'info' | 'neutral';

export interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'neutral',
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'jama':
        return {
          container: { backgroundColor: colors.jamaBackground, borderColor: '#A7F3D0' },
          text: { color: colors.jama },
        };
      case 'baki':
      case 'danger':
        return {
          container: { backgroundColor: colors.bakiBackground, borderColor: '#FECACA' },
          text: { color: colors.baki },
        };
      case 'success':
        return {
          container: { backgroundColor: colors.successBackground, borderColor: '#BBF7D0' },
          text: { color: colors.success },
        };
      case 'warning':
        return {
          container: { backgroundColor: colors.warningBackground, borderColor: '#FDE68A' },
          text: { color: colors.warning },
        };
      case 'info':
        return {
          container: { backgroundColor: colors.infoBackground, borderColor: '#BAE6FD' },
          text: { color: colors.info },
        };
      default:
        return {
          container: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          text: { color: colors.textSecondary },
        };
    }
  };

  const currentVariant = getVariantStyles();

  return (
    <View style={[styles.badge, currentVariant.container, style]}>
      <AppText style={[styles.badgeText, currentVariant.text, textStyle]}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
