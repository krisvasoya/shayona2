import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppButton,
  AppBadge,
  AppTextInput,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { formatCurrency } from '@/src/utils';
import { useAuth } from '@/src/features/auth';
import { useDashboard, DateFilter, getDateRange } from '@/src/features/dashboard';
import { InvoiceSummary } from '@/src/types/invoice';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const shopName = profile?.shop_name || 'Shayona Enterprise';

  const [activeFilter, setActiveFilter] = useState<DateFilter>('TODAY');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  // Custom range picker modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(customRange.from);
  const [tempTo, setTempTo] = useState(customRange.to);

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDashboard(activeFilter, activeFilter === 'CUSTOM' ? customRange : undefined);

  const currentRange = getDateRange(
    activeFilter,
    activeFilter === 'CUSTOM' ? customRange : undefined,
  );

  const handleSelectFilter = (filter: DateFilter) => {
    if (filter === 'CUSTOM') {
      setTempFrom(customRange.from);
      setTempTo(customRange.to);
      setIsCustomModalOpen(true);
    } else {
      setActiveFilter(filter);
    }
  };

  const handleApplyCustomRange = () => {
    const from = tempFrom.trim();
    const to = tempTo.trim();

    if (!from || !to) {
      Alert.alert('Invalid Date', 'Please enter both From and To dates.');
      return;
    }

    if (from > to) {
      Alert.alert('Invalid Date Range', 'From date cannot be after To date.');
      return;
    }

    setCustomRange({ from, to });
    setActiveFilter('CUSTOM');
    setIsCustomModalOpen(false);
  };

  const filtersList: { key: DateFilter; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'THIS_WEEK', label: 'This Week' },
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'THIS_YEAR', label: 'This Year' },
    { key: 'CUSTOM', label: 'Custom' },
  ];

  return (
    <AppScreenContainer
      scrollable={false}
      edges={['top']}
      header={
        <AppHeader
          title="Dashboard"
          subtitle={shopName}
          rightAction={
            <AppButton
              title="+ New Bill"
              size="sm"
              variant="primary"
              onPress={() => router.push('/(app)/invoices/create')}
              style={styles.headerBtn}
            />
          }
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {/* Date Filter Tabs (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {filtersList.map(item => {
            const isActive = activeFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.7}
                onPress={() => handleSelectFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <AppText
                  variant="captionBold"
                  color={isActive ? colors.textInverse : colors.textSecondary}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Date Range Indicator */}
        <View style={styles.dateIndicatorRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption" color={colors.textSecondary}>
            Period: {currentRange.startDate} to {currentRange.endDate}
          </AppText>
        </View>

        {/* Loading State */}
        {isLoading && !isRefetching ? (
          <View style={styles.centerLoadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              Calculating ledger metrics...
            </AppText>
          </View>
        ) : isError ? (
          <AppCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
            <AppText
              variant="bodyLargeBold"
              color={colors.danger}
              style={{ marginTop: spacing.xs }}
            >
              Failed to load dashboard data
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ marginVertical: spacing.xs, textAlign: 'center' }}
            >
              {(error as Error)?.message || 'Please check your connection and try again.'}
            </AppText>
            <AppButton title="Retry" size="sm" onPress={() => refetch()} />
          </AppCard>
        ) : (
          <>
            {/* Total Billed High-Level Metric Banner */}
            <AppCard style={styles.totalSalesBanner}>
              <View style={styles.totalSalesContent}>
                <View>
                  <AppText variant="caption" color={colors.textSecondary}>
                    TOTAL BILLED SALES
                  </AppText>
                  <AppText variant="h2" color={colors.primary}>
                    {formatCurrency(dashboardData?.totalBilledPaise || 0)}
                  </AppText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <AppBadge
                    label={`${dashboardData?.totalInvoicesCount || 0} BILL${
                      dashboardData?.totalInvoicesCount === 1 ? '' : 'S'
                    }`}
                    variant="neutral"
                  />
                  <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    in selected period
                  </AppText>
                </View>
              </View>
            </AppCard>

            {/* Summary Stat Cards (Jama & Baki) */}
            <View style={styles.metricsContainer}>
              {/* Jama / Received */}
              <AppCard variant="jama" style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <AppText variant="captionBold" color={colors.jama}>
                    JAMA (RECEIVED)
                  </AppText>
                  <Ionicons name="arrow-down-circle" size={18} color={colors.jama} />
                </View>
                <AppText variant="h2" color={colors.jama}>
                  {formatCurrency(dashboardData?.totalJamaPaise || 0)}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {dashboardData?.paidTransactionsCount || 0} transaction
                  {dashboardData?.paidTransactionsCount === 1 ? '' : 's'}
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
                <AppText variant="h2" color={colors.baki}>
                  {formatCurrency(dashboardData?.totalBakiPaise || 0)}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {dashboardData?.pendingInvoicesCount || 0} pending
                </AppText>
              </AppCard>
            </View>

            {/* Quick Actions */}
            <AppCard style={styles.quickActionCard}>
              <AppText variant="bodyLargeBold" style={styles.sectionTitle}>
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

            {/* Recent Bills Section */}
            <AppCard style={styles.recentBillsCard}>
              <View style={styles.sectionHeaderRow}>
                <AppText variant="bodyLargeBold">Recent Bills</AppText>
                <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/invoices')}>
                  <AppText variant="captionBold" color={colors.primary}>
                    View All
                  </AppText>
                </TouchableOpacity>
              </View>

              {!dashboardData?.recentInvoices || dashboardData.recentInvoices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                  <AppText
                    variant="bodyMedium"
                    color={colors.textSecondary}
                    style={styles.emptyText}
                  >
                    No invoices recorded for this period.
                  </AppText>
                  <AppButton
                    title="+ Create First Bill"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(app)/invoices/create')}
                  />
                </View>
              ) : (
                dashboardData.recentInvoices.map((inv: InvoiceSummary) => {
                  const isPaid = Number(inv.remaining_amount) === 0;
                  return (
                    <TouchableOpacity
                      key={inv.id}
                      activeOpacity={0.7}
                      style={styles.invoiceItemRow}
                      onPress={() => router.push(`/(app)/invoices/${inv.id}` as any)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="bodyBold">#{inv.invoice_number}</AppText>
                          <AppBadge
                            label={inv.party_type}
                            variant={inv.party_type === 'CUSTOMER' ? 'neutral' : 'info'}
                            style={{ paddingVertical: 1, paddingHorizontal: 4 }}
                          />
                        </View>
                        <AppText variant="body" color={colors.textPrimary} numberOfLines={1}>
                          {inv.party_name}
                        </AppText>
                        <AppText variant="caption" color={colors.textSecondary}>
                          {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </AppText>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <AppText variant="bodyLargeBold">
                          {formatCurrency(Number(inv.total_amount))}
                        </AppText>
                        <AppBadge
                          label={
                            isPaid
                              ? 'PAID'
                              : `Baki: ${formatCurrency(Number(inv.remaining_amount))}`
                          }
                          variant={isPaid ? 'success' : 'danger'}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </AppCard>
          </>
        )}
      </ScrollView>

      {/* Custom Date Range Picker Modal */}
      <Modal
        visible={isCustomModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCustomModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Select Custom Date Range</AppText>
              <TouchableOpacity onPress={() => setIsCustomModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AppTextInput
              label="From Date (YYYY-MM-DD)"
              value={tempFrom}
              onChangeText={setTempFrom}
              placeholder="2026-09-01"
            />

            <AppTextInput
              label="To Date (YYYY-MM-DD)"
              value={tempTo}
              onChangeText={setTempTo}
              placeholder="2026-09-30"
            />

            <View style={styles.modalActionsRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setIsCustomModalOpen(false)}
              />
              <AppButton
                title="Apply Filter"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleApplyCustomRange}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.screenPadding,
    paddingBottom: 160,
  },
  headerBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  filterScroll: {
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  centerLoadingState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  totalSalesBanner: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  totalSalesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  recentBillsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    marginVertical: spacing.xs,
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
