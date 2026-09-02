import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenContainer, AppHeader, AppText, AppCard, AppBadge } from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <AppScreenContainer
      scrollable
      header={<AppHeader title="Settings" subtitle="App & Business Preferences" />}
    >
      {/* Business Info */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Business Profile
        </AppText>
        <View style={styles.settingRow}>
          <View>
            <AppText variant="bodyLargeBold">Shayona Enterprise</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Retail & Distribution
            </AppText>
          </View>
          <AppBadge label="Active" variant="success" />
        </View>
      </AppCard>

      {/* Language Preferences */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Language / ભાષા
        </AppText>
        <View style={styles.settingRow}>
          <AppText variant="bodyMedium">Selected Language</AppText>
          <AppBadge label="English" variant="neutral" />
        </View>
      </AppCard>

      {/* Account / Session */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Account
        </AppText>
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <AppText variant="bodyLargeBold" color={colors.danger} style={styles.logoutText}>
            Sign Out
          </AppText>
        </TouchableOpacity>
      </AppCard>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardSectionTitle: {
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutText: {
    marginLeft: spacing.sm,
  },
});
