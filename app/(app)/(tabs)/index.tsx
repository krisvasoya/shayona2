import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppButton,
  AppBadge,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { formatCurrency } from '@/src/utils';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <AppScreenContainer
      scrollable
      header={
        <AppHeader
          title="Dashboard"
          subtitle="Shayona Enterprise"
          rightAction={
            <AppButton
              title="+ New Bill"
              size="sm"
              variant="accent"
              onPress={() => router.push('/(app)/invoices/create')}
            />
          }
        />
      }
    >
      {/* Date Filter Tabs Placeholder */}
      <View style={styles.filterRow}>
        <AppBadge label="Today" variant="neutral" style={styles.filterActive} />
        <AppBadge label="This Week" variant="neutral" />
        <AppBadge label="This Month" variant="neutral" />
        <AppBadge label="This Year" variant="neutral" />
        <AppBadge label="Custom" variant="neutral" />
      </View>

      {/* Summary Stat Cards */}
      <View style={styles.metricsContainer}>
        {/* Jama / Received */}
        <AppCard variant="jama" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <AppText variant="captionBold" color={colors.jama}>
              JAMA (RECEIVED)
            </AppText>
            <Ionicons name="arrow-down-circle" size={18} color={colors.jama} />
          </View>
          <AppText variant="metric" color={colors.jama}>
            {formatCurrency(0)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            0 transactions
          </AppText>
        </AppCard>

        {/* Baki / Due */}
        <AppCard variant="baki" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <AppText variant="captionBold" color={colors.baki}>
              BAKI (PENDING)
            </AppText>
            <Ionicons name="alert-circle" size={18} color={colors.baki} />
          </View>
          <AppText variant="metric" color={colors.baki}>
            {formatCurrency(0)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            0 pending
          </AppText>
        </AppCard>
      </View>

      {/* Quick Actions */}
      <AppCard style={styles.quickActionCard}>
        <AppText variant="h4" style={styles.sectionTitle}>
          Quick Actions
        </AppText>
        <View style={styles.actionButtonsRow}>
          <AppButton
            title="Create Invoice"
            variant="primary"
            style={styles.actionBtn}
            onPress={() => router.push('/(app)/invoices/create')}
          />
          <AppButton
            title="View Invoices"
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => router.push('/(app)/(tabs)/invoices')}
          />
        </View>
      </AppCard>

      {/* Recent Invoices Placeholder */}
      <AppCard>
        <View style={styles.sectionHeaderRow}>
          <AppText variant="h4">Recent Bills</AppText>
          <AppText
            variant="captionBold"
            color={colors.accent}
            onPress={() => router.push('/(app)/(tabs)/invoices')}
          >
            View All
          </AppText>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
          <AppText variant="bodyMedium" color={colors.textSecondary} style={styles.emptyText}>
            No invoices recorded for this period.
          </AppText>
          <AppButton
            title="Create First Bill"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(app)/invoices/create')}
          />
        </View>
      </AppCard>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metricCard: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionCard: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginVertical: spacing.sm,
  },
});
