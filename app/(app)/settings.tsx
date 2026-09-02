import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppBadge,
  AppButton,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useAuth } from '@/src/features/auth';
import { useLanguage, SupportedLanguage } from '@/src/localization';
import { formatPhoneDisplay } from '@/src/utils/phone';
import { syncService } from '@/src/services/sync.service';
import { useNetworkStore } from '@/src/services/network.service';
import { localStore } from '@/src/database/localStore';

export default function SettingsScreen() {
  const { user, profile, signOut, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isOnline = useNetworkStore(state => state.isOnline);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingLang, setSavingLang] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = React.useCallback(async () => {
    if (user?.id) {
      const queue = await localStore.getSyncQueue(user.id);
      setPendingCount(queue.length);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    try {
      setSavingLang(true);
      await setLanguage(newLang, user?.id);
    } finally {
      setSavingLang(false);
    }
  };

  const handleManualSync = async () => {
    if (!user?.id) return;
    if (!isOnline) {
      Alert.alert(t.common.error, t.common.offlineMode);
      return;
    }

    try {
      setSyncing(true);
      const res = await syncService.syncAll(user.id);
      await fetchPendingCount();
      if (res.success) {
        Alert.alert(t.common.success, t.settings.allSynced);
      } else {
        Alert.alert(t.common.error, res.error || 'Sync encountered issues');
      }
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(t.settings.confirmLogoutTitle, t.settings.confirmLogoutMessage, [
      {
        text: t.common.cancel,
        style: 'cancel',
      },
      {
        text: t.settings.signOut,
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
      header={<AppHeader title={t.settings.title} subtitle={t.settings.subtitle} showBack={true} />}
    >
      {/* Business Profile Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.businessProfile}
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
          <AppBadge label={t.common.active} variant="success" />
        </View>
      </AppCard>

      {/* Language Preferences Card with Radio Selection */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.languagePreferences}
        </AppText>

        <View style={styles.languageOptionsContainer}>
          {/* English Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={savingLang}
            style={[styles.langChoiceCard, language === 'en' && styles.langChoiceCardSelected]}
            onPress={() => handleLanguageChange('en')}
          >
            <View style={styles.langChoiceLeft}>
              <View style={[styles.radioCircle, language === 'en' && styles.radioCircleSelected]}>
                {language === 'en' && <View style={styles.radioInner} />}
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <AppText variant="bodyLargeBold">English</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  Default App Language
                </AppText>
              </View>
            </View>
            {language === 'en' && <AppBadge label="Active" variant="success" />}
          </TouchableOpacity>

          {/* Gujarati Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={savingLang}
            style={[styles.langChoiceCard, language === 'gu' && styles.langChoiceCardSelected]}
            onPress={() => handleLanguageChange('gu')}
          >
            <View style={styles.langChoiceLeft}>
              <View style={[styles.radioCircle, language === 'gu' && styles.radioCircleSelected]}>
                {language === 'gu' && <View style={styles.radioInner} />}
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <AppText variant="bodyLargeBold">ગુજરાતી (Gujarati)</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  ગુજરાતી ભાષા પસંદ કરો
                </AppText>
              </View>
            </View>
            {language === 'gu' && <AppBadge label="સક્રિય" variant="success" />}
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Data Synchronization Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.dataSync}
        </AppText>
        <View style={styles.settingRow}>
          <View>
            <AppText variant="bodyMedium">
              {isOnline ? t.settings.onlineStatus : t.settings.offlineStatus}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {pendingCount === 0
                ? t.settings.allSynced
                : `${pendingCount} ${t.settings.pendingSync}`}
            </AppText>
          </View>
          <AppBadge
            label={isOnline ? t.settings.onlineStatus : t.settings.offlineStatus}
            variant={isOnline ? 'success' : 'warning'}
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <AppButton
            title={syncing ? t.settings.syncing : t.settings.syncNow}
            onPress={handleManualSync}
            loading={syncing}
            disabled={!isOnline || syncing}
            variant="outline"
            icon={<Ionicons name="sync" size={16} color={colors.primary} />}
          />
        </View>
      </AppCard>

      {/* Account & Security Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.accountSecurity}
        </AppText>
        <View style={styles.settingRow}>
          <View>
            <AppText variant="bodyMedium">{t.settings.signInMethod}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t.settings.primaryIdentity}
            </AppText>
          </View>
          <AppBadge label={authProvider} variant="info" />
        </View>
      </AppCard>

      {/* Sign Out Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.session}
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
            {loggingOut ? t.settings.loggingOut : t.settings.signOut}
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
  languageOptionsContainer: {
    gap: spacing.sm,
  },
  langChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  langChoiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  langChoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
