import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          <AppText variant="h3" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {rightAction ? <View style={styles.rightContainer}>{rightAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});
