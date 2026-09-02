import React from 'react';
import {
  View,
  ViewProps,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { cardStyles } from '@/src/theme/cardStyles';

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
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return cardStyles.cardElevated;
      case 'flat':
        return cardStyles.cardFlat;
      case 'jama':
        return cardStyles.metricCardJama;
      case 'baki':
        return cardStyles.metricCardBaki;
      case 'neutral':
        return cardStyles.metricCardNeutral;
      default:
        return cardStyles.card;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[getVariantStyle(), style]}
        accessibilityRole="button"
        {...(rest as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getVariantStyle(), style]} {...rest}>
      {children}
    </View>
  );
};
