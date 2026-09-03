import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppBadge,
  AppButton,
  AppTextInput,
  AppModal,
} from '@/src/components/common';
import { colors, useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useAuth } from '@/src/features/auth';
import { useLanguage, SupportedLanguage } from '@/src/localization';
import { formatPhoneDisplay } from '@/src/utils/phone';
import { syncService } from '@/src/services/sync.service';
import { backupService } from '@/src/services/backup.service';
import { useNetworkStore } from '@/src/services/network.service';
import { localStore } from '@/src/database/localStore';
import { useUpdateStore } from '@/src/services/update.service';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore(state => state.isOnline);
  const isUpdateAvailable = useUpdateStore(state => state.isUpdateAvailable);
  const appVersion = useUpdateStore(state => state.appVersion);
  const checkForUpdate = useUpdateStore(state => state.checkForUpdate);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingLang, setSavingLang] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Phase 18: Backup & Restore state
  const [exportingBackup, setExportingBackup] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fetchPendingCount = React.useCallback(async () => {
    if (user?.id) {
      const queue = await localStore.getSyncQueue(user.id);
      setPendingCount(queue.length);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPendingCount();
    checkForUpdate(false);
  }, [fetchPendingCount, checkForUpdate]);

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    try {
      setSavingLang(true);
      await setLanguage(newLang, user?.id);
    } finally {
      setSavingLang(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user?.id) return;
    try {
      setExportingBackup(true);
      const res = await backupService.exportBackup(user.id);
      if (res.success) {
        Alert.alert(
          t.settings.backupSuccessTitle || 'Backup Exported',
          t.settings.backupSuccessMessage ||
            'Your business data backup has been generated successfully.',
        );
      } else {
        Alert.alert(t.common.error, res.error || 'Failed to export backup.');
      }
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to export backup.');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!user?.id || !restoreJsonInput.trim()) return;

    // Validate backup format and financial invariants
    const validation = backupService.validateBackup(restoreJsonInput.trim());
    if (!validation.valid || !validation.data) {
      setRestoreError(validation.error || 'Invalid backup data format.');
      return;
    }

    try {
      setRestoring(true);
      setRestoreError(null);

      const res = await backupService.restoreBackup(validation.data, user.id);
      if (!res.success) {
        setRestoreError(res.error || 'Failed to restore backup.');
        return;
      }

      // Invalidate queries so all screens refresh with restored data
      queryClient.invalidateQueries();
      await fetchPendingCount();

      setIsRestoreModalOpen(false);
      setRestoreJsonInput('');

      Alert.alert(
        t.settings.restoreSuccessTitle || 'Restore Completed',
        `Restored: ${res.invoicesRestored} Invoices, ${res.customersRestored} Customers, ${res.buyersRestored} Buyers, ${res.paymentsRestored} Payments.`,
      );
    } catch (err) {
      setRestoreError((err as Error).message || 'Failed to restore backup.');
    } finally {
      setRestoring(false);
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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/business-profile' as any)}
      >
        <AppCard>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <AppText variant="h4" style={styles.cardSectionTitle}>
              {t.settings.businessProfile}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="caption" color={colors.primary} style={{ marginRight: 2, fontWeight: '600' }}>
                {t.settings.editBusinessProfile}
              </AppText>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>
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
              {profile?.address ? (
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                  {profile.address}
                </AppText>
              ) : null}
            </View>
            <AppBadge label={t.common.active} variant="success" />
          </View>
        </AppCard>
      </TouchableOpacity>

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

      {/* Appearance / Theme Preferences Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.appearance}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
          {t.settings.appearanceSubtitle}
        </AppText>

        <View style={styles.languageOptionsContainer}>
          {/* System Default Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.langChoiceCard,
              {
                backgroundColor: themeMode === 'system' ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#EEF2FF') : colors.surfaceSubtle,
                borderColor: themeMode === 'system' ? (isDark ? colors.accent : colors.primary) : colors.border,
              },
            ]}
            onPress={() => setThemeMode('system')}
          >
            <View style={styles.langChoiceLeft}>
              <View
                style={[
                  styles.radioCircle,
                  themeMode === 'system' && { borderColor: isDark ? colors.accent : colors.primary },
                ]}
              >
                {themeMode === 'system' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: isDark ? colors.accent : colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <AppText variant="bodyLargeBold">{t.settings.systemOption}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t.settings.systemOptionDesc}
                </AppText>
              </View>
            </View>
            {themeMode === 'system' && (
              <AppBadge label={language === 'gu' ? 'સક્રિય' : 'Active'} variant="success" />
            )}
          </TouchableOpacity>

          {/* Light Theme Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.langChoiceCard,
              {
                backgroundColor: themeMode === 'light' ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#EEF2FF') : colors.surfaceSubtle,
                borderColor: themeMode === 'light' ? (isDark ? colors.accent : colors.primary) : colors.border,
              },
            ]}
            onPress={() => setThemeMode('light')}
          >
            <View style={styles.langChoiceLeft}>
              <View
                style={[
                  styles.radioCircle,
                  themeMode === 'light' && { borderColor: isDark ? colors.accent : colors.primary },
                ]}
              >
                {themeMode === 'light' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: isDark ? colors.accent : colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <AppText variant="bodyLargeBold">{t.settings.lightOption}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t.settings.lightOptionDesc}
                </AppText>
              </View>
            </View>
            {themeMode === 'light' && (
              <AppBadge label={language === 'gu' ? 'સક્રિય' : 'Active'} variant="success" />
            )}
          </TouchableOpacity>

          {/* Dark Theme Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.langChoiceCard,
              {
                backgroundColor: themeMode === 'dark' ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#EEF2FF') : colors.surfaceSubtle,
                borderColor: themeMode === 'dark' ? (isDark ? colors.accent : colors.primary) : colors.border,
              },
            ]}
            onPress={() => setThemeMode('dark')}
          >
            <View style={styles.langChoiceLeft}>
              <View
                style={[
                  styles.radioCircle,
                  themeMode === 'dark' && { borderColor: isDark ? colors.accent : colors.primary },
                ]}
              >
                {themeMode === 'dark' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: isDark ? colors.accent : colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <AppText variant="bodyLargeBold">{t.settings.darkOption}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t.settings.darkOptionDesc}
                </AppText>
              </View>
            </View>
            {themeMode === 'dark' && (
              <AppBadge label={language === 'gu' ? 'સક્રિય' : 'Active'} variant="success" />
            )}
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

      {/* Phase 18: Data Backup & Restore Card */}
      <AppCard>
        <AppText variant="h4" style={styles.cardSectionTitle}>
          {t.settings.backupRestore || 'Data Backup & Restore'}
        </AppText>
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={{ marginBottom: spacing.md }}
        >
          {t.settings.backupRestoreSubtitle ||
            'Export or recover your business invoices & ledger records safely'}
        </AppText>

        <View style={{ gap: spacing.sm }}>
          <AppButton
            title={t.settings.exportBackupBtn || 'Backup / Export Data (JSON)'}
            onPress={handleExportBackup}
            loading={exportingBackup}
            disabled={exportingBackup}
            variant="primary"
            icon={<Ionicons name="cloud-download-outline" size={18} color={colors.surface} />}
          />

          <AppButton
            title={t.settings.restoreBackupBtn || 'Restore Data from Backup'}
            onPress={() => {
              setRestoreJsonInput('');
              setRestoreError(null);
              setIsRestoreModalOpen(true);
            }}
            variant="outline"
            icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />}
          />
        </View>
      </AppCard>

      {/* Phase 22: App Updates Card with Red Dot Indicator */}
      <AppCard>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.updateCardRow}
          onPress={() => router.push('/app-updates')}
          accessibilityRole="button"
          accessibilityLabel={t.updates.title}
        >
          <View style={styles.updateLeft}>
            <View style={styles.updateIconBox}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText variant="bodyLargeBold">{t.updates.title}</AppText>
                {isUpdateAvailable && <View style={styles.redDot} />}
              </View>
              <AppText
                variant="caption"
                color={isUpdateAvailable ? colors.danger : colors.textSecondary}
              >
                {isUpdateAvailable ? t.updates.newUpdateAvailable : t.updates.latestVersionMessage}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isUpdateAvailable ? (
              <AppBadge label="Update" variant="danger" />
            ) : (
              <AppBadge label={`v${appVersion}`} variant="neutral" />
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
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

      {/* Restore Data Modal */}
      <AppModal
        visible={isRestoreModalOpen}
        title={t.settings.restoreTitle || 'Restore Backup Data'}
        onClose={() => {
          if (!restoring) setIsRestoreModalOpen(false);
        }}
      >
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={{ marginBottom: spacing.md }}
        >
          {t.settings.restoreWarning ||
            'Restoring data will merge verified backup records with your current account.'}
        </AppText>

        <AppTextInput
          label={t.settings.pasteBackupLabel || 'Paste Backup JSON Data *'}
          placeholder='{"backupVersion": 1, ...}'
          value={restoreJsonInput}
          onChangeText={text => {
            setRestoreJsonInput(text);
            if (restoreError) setRestoreError(null);
          }}
          multiline
          numberOfLines={6}
          style={{ height: 120, textAlignVertical: 'top' }}
          error={restoreError || undefined}
        />

        <View style={styles.modalActionsRow}>
          <AppButton
            title={t.common.cancel}
            variant="outline"
            style={{ flex: 1 }}
            disabled={restoring}
            onPress={() => setIsRestoreModalOpen(false)}
          />
          <AppButton
            title={t.settings.restoreConfirmBtn || 'Confirm & Restore'}
            variant="primary"
            style={{ flex: 1 }}
            loading={restoring}
            disabled={restoring || !restoreJsonInput.trim()}
            onPress={handleConfirmRestore}
          />
        </View>
      </AppModal>
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
  updateCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  updateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  updateIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
