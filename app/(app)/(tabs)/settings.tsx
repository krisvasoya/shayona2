import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenContainer, AppHeader, AppText, AppCard, AppBadge } from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useAuth } from '@/src/features/auth';
import { formatPhoneDisplay } from '@/src/utils/phone';

export default function SettingsScreen() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutPress = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout from your account?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await signOut();
          setLoggingOut(false);
        },
      },
    ]);
  };

  const shopName = profile?.shop_name || 'Shayona Enterprise';
  const displayPhone = profile?.phone
    ? formatPhoneDisplay(profile.phone)
    : user?.phone
      ? formatPhoneDisplay(user.phone)
      : null;
  const userEmail = user?.email || null;
  const authProvider = user?.app_metadata?.provider === 'google' ? 'Google' : 'Mobile Number';

  return (
    <AppScreenContainer
      scrollable
      edges={['top']}
      header={<AppHeader title="Settings" subtitle="App & Business Preferences" showBack={true} />}
    >
      {/* Business Profile Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Business Profile
        </AppText>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Ionicons name="storefront" size={24} color={colors.primary} />
          </View>
          <View style={styles.profileDetails}>
            <AppText variant="bodyLargeBold">{shopName}</AppText>
            {displayPhone ? (
              <AppText variant="body" color={colors.textSecondary}>
                {displayPhone}
              </AppText>
            ) : userEmail ? (
              <AppText variant="body" color={colors.textSecondary}>
                {userEmail}
              </AppText>
            ) : null}
          </View>
          <AppBadge label="Active" variant="success" />
        </View>
      </AppCard>

      {/* Account & Security Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Account & Security
        </AppText>
        <View style={styles.settingRow}>
          <View>
            <AppText variant="bodyMedium">Sign-in Method</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Primary identity provider
            </AppText>
          </View>
          <AppBadge label={authProvider} variant="info" />
        </View>
      </AppCard>

      {/* Language Preferences */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Language / ભાષા
        </AppText>
        <View style={styles.settingRow}>
          <View>
            <AppText variant="bodyMedium">Application Language</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              English & ગુજરાતી supported
            </AppText>
          </View>
          <AppBadge label="English" variant="neutral" />
        </View>
      </AppCard>

      {/* Sign Out Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          Session
        </AppText>
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogoutPress}
          disabled={loggingOut || isLoading}
          accessibilityRole="button"
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          )}
          <AppText variant="bodyLargeBold" color={colors.danger} style={styles.logoutText}>
            {loggingOut ? 'Logging out...' : 'Sign Out'}
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileDetails: {
    flex: 1,
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
