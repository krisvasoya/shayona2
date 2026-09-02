import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
import { useLanguage } from '@/src/localization';
import { useUpdateStore } from '@/src/services/update.service';
import { useNetworkStore } from '@/src/services/network.service';

export default function AppUpdatesScreen() {
  const { t } = useLanguage();
  const isOnline = useNetworkStore(state => state.isOnline);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const {
    isUpdateAvailable,
    isChecking,
    isDownloading,
    isUpdateReady,
    lastChecked,
    error,
    updateId,
    runtimeVersion,
    channel,
    appVersion,
    isUpdatesEnabled,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
  } = useUpdateStore();

  useEffect(() => {
    // Check automatically on screen mount if not recently checked
    checkForUpdate(false);
  }, [checkForUpdate]);

  const handleManualCheck = async () => {
    if (!isOnline) {
      Alert.alert(t.common.error, t.updates.unableToCheckUpdates);
      return;
    }

    const res = await checkForUpdate(true);
    if (!res.isAvailable && !res.error) {
      Alert.alert(t.updates.title, t.updates.upToDateToast);
    } else if (res.error) {
      Alert.alert(t.common.error, t.updates.unableToCheckUpdates);
    }
  };

  const handleDownload = async () => {
    if (!isOnline) {
      Alert.alert(t.common.error, t.updates.unableToCheckUpdates);
      return;
    }

    const res = await downloadUpdate();
    if (!res.success) {
      Alert.alert(t.common.error, res.error || t.updates.unableToCheckUpdates);
    }
  };

  const handleApply = async () => {
    await applyUpdate();
  };

  const formattedLastChecked = lastChecked
    ? new Date(lastChecked).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <AppScreenContainer
      scrollable
      edges={['top']}
      header={<AppHeader title={t.updates.title} subtitle={t.updates.subtitle} showBack={true} />}
    >
      {/* Main Version Status Card */}
      <AppCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.appIconContainer}>
            <Ionicons name="sparkles" size={26} color={colors.primary} />
          </View>
          <View style={styles.headerDetails}>
            <AppText variant="h3">Shayona Invoice</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {t.updates.currentVersion} {appVersion}
            </AppText>
          </View>
          {isUpdateAvailable ? (
            <View style={styles.updateBadgeContainer}>
              <View style={styles.redDot} />
              <AppBadge label="Update" variant="danger" />
            </View>
          ) : (
            <AppBadge label="Latest" variant="success" />
          )}
        </View>

        <View style={styles.statusDivider} />

        {/* State Information */}
        <View style={styles.statusBox}>
          {isChecking ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText variant="bodyMedium" style={{ marginLeft: spacing.sm }}>
                {t.updates.checking}
              </AppText>
            </View>
          ) : isDownloading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.jama} />
              <AppText variant="bodyMedium" color={colors.jama} style={{ marginLeft: spacing.sm }}>
                {t.updates.downloading}
              </AppText>
            </View>
          ) : isUpdateReady ? (
            <View>
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.jama} />
                <AppText
                  variant="bodyLargeBold"
                  color={colors.jama}
                  style={{ marginLeft: spacing.xs }}
                >
                  {t.updates.updateReady}
                </AppText>
              </View>
              <AppText
                variant="caption"
                color={colors.textSecondary}
                style={{ marginTop: spacing.xs }}
              >
                Restart the app to apply the newest updates and features.
              </AppText>
            </View>
          ) : isUpdateAvailable ? (
            <View>
              <View style={styles.statusRow}>
                <View style={styles.redDot} />
                <AppText
                  variant="bodyLargeBold"
                  color={colors.danger}
                  style={{ marginLeft: spacing.xs }}
                >
                  {t.updates.newUpdateAvailable}
                </AppText>
              </View>
              <AppText
                variant="body"
                color={colors.textSecondary}
                style={{ marginTop: spacing.xs }}
              >
                {t.updates.newUpdateDesc}
              </AppText>
            </View>
          ) : error ? (
            <View style={styles.statusRow}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
              <AppText
                variant="body"
                color={colors.danger}
                style={{ marginLeft: spacing.sm, flex: 1 }}
              >
                {t.updates.unableToCheckUpdates}
              </AppText>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="shield-checkmark" size={22} color={colors.jama} />
              <AppText
                variant="bodyLargeBold"
                color={colors.textPrimary}
                style={{ marginLeft: spacing.sm }}
              >
                {t.updates.latestVersionMessage}
              </AppText>
            </View>
          )}

          {formattedLastChecked && (
            <AppText
              variant="caption"
              color={colors.textMuted}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
            >
              Last checked: {formattedLastChecked}
            </AppText>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {isUpdateReady ? (
            <AppButton
              title={t.updates.restartAndUpdate}
              variant="primary"
              onPress={handleApply}
              icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
            />
          ) : isUpdateAvailable ? (
            <AppButton
              title={t.updates.updateNow}
              variant="primary"
              loading={isDownloading}
              disabled={isDownloading || !isOnline}
              onPress={handleDownload}
              icon={<Ionicons name="cloud-download" size={18} color="#FFFFFF" />}
            />
          ) : (
            <AppButton
              title={isChecking ? t.updates.checking : t.updates.checkForUpdates}
              variant="outline"
              loading={isChecking}
              disabled={isChecking}
              onPress={handleManualCheck}
              icon={<Ionicons name="sync" size={18} color={colors.primary} />}
            />
          )}
        </View>
      </AppCard>

      {/* Diagnostics / Channel Information Card */}
      <AppCard style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.diagHeaderRow}
          onPress={() => setShowDiagnostics(!showDiagnostics)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <AppText variant="bodyLargeBold" style={{ marginLeft: spacing.sm }}>
              {t.updates.diagnosticInfo}
            </AppText>
          </View>
          <Ionicons
            name={showDiagnostics ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showDiagnostics && (
          <View style={styles.diagContent}>
            <View style={styles.diagRow}>
              <AppText variant="body" color={colors.textSecondary}>
                {t.updates.channel}
              </AppText>
              <AppText variant="bodyBold">{channel || 'preview'}</AppText>
            </View>

            <View style={styles.diagRow}>
              <AppText variant="body" color={colors.textSecondary}>
                {t.updates.runtimeVersion}
              </AppText>
              <AppText variant="bodyBold">{runtimeVersion || '1.0.1'}</AppText>
            </View>

            <View style={styles.diagRow}>
              <AppText variant="body" color={colors.textSecondary}>
                EAS Updates
              </AppText>
              <AppBadge
                label={isUpdatesEnabled ? 'Active' : 'Dev Mode'}
                variant={isUpdatesEnabled ? 'success' : 'info'}
              />
            </View>

            {updateId && (
              <View style={styles.diagRow}>
                <AppText variant="body" color={colors.textSecondary}>
                  {t.updates.updateId}
                </AppText>
                <AppText variant="caption" color={colors.textPrimary} numberOfLines={1}>
                  {updateId.substring(0, 16)}...
                </AppText>
              </View>
            )}

            {!isUpdatesEnabled && (
              <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                {t.updates.devModeNotice}
              </AppText>
            )}
          </View>
        )}
      </AppCard>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerDetails: {
    flex: 1,
  },
  updateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  statusDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  statusBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContainer: {
    marginTop: spacing.md,
  },
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagContent: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
