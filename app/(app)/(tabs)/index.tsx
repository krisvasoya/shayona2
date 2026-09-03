import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppText,
  AppButton,
  AppTextInput,
  AppModal,
} from '@/src/components/common';
import { useDrawer } from '@/src/components/navigation/DrawerContext';
import { useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { formatCurrency } from '@/src/utils';
import { useAuth } from '@/src/features/auth';
import { useDashboard, DateFilter, getDateRange } from '@/src/features/dashboard';
import { useLanguage } from '@/src/localization';
import { InvoiceSummary } from '@/src/types/invoice';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      const month = MONTH_NAMES[monthIdx] || parts[1];
      return `${day} ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export default function DashboardScreen() {
  const router = useRouter();
  const drawer = useDrawer();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const shopName = profile?.shop_name || 'Shayona';

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
    { key: 'TODAY', label: t.dashboard.today },
    { key: 'THIS_WEEK', label: t.dashboard.thisWeek },
    { key: 'THIS_MONTH', label: t.dashboard.thisMonth },
    { key: 'THIS_YEAR', label: t.dashboard.thisYear },
    { key: 'CUSTOM', label: t.dashboard.custom },
  ];

  const totalInvoices = dashboardData?.totalInvoicesCount || 0;

  return (
    <AppScreenContainer
      scrollable={false}
      disableDefaultPadding={true}
      edges={['top']}
      backgroundColor={colors.background}
    >
      {/* 1. Header Row */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => drawer?.openDrawer()}
            style={styles.hamburgerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Open Navigation Drawer"
          >
            <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <AppText variant="h3" style={[styles.headerTitleText, { color: colors.textPrimary }]}>
              {t.dashboard.title}
            </AppText>
            <AppText
              variant="caption"
              style={[styles.headerSubtitleText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {shopName}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.newBillBtn,
            { backgroundColor: isDark ? colors.accent : colors.primary },
          ]}
          onPress={() => router.push('/(app)/invoices/create')}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 2 }} />
          <AppText variant="bodyLargeBold" style={styles.newBillBtnText}>
            {t.dashboard.newBill || 'New Bill'}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 2. Main Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[isDark ? colors.accent : colors.primary]}
            tintColor={isDark ? colors.accent : colors.primary}
          />
        }
      >
        {/* Date Filter Tabs (Horizontal Pill Scroll) */}
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
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? isDark
                        ? colors.accent
                        : colors.primary
                      : colors.surface,
                    borderColor: isActive ? 'transparent' : colors.border,
                  },
                ]}
              >
                <AppText
                  variant="captionBold"
                  style={{
                    color: isActive ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  }}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Period Badge */}
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption" style={[styles.periodText, { color: colors.textSecondary }]}>
            {t.dashboard.period}: {currentRange.startDate} to {currentRange.endDate}
          </AppText>
        </View>

        {/* Loading / Error / Data States */}
        {isLoading && !isRefetching ? (
          <View style={styles.centerLoadingState}>
            <ActivityIndicator size="large" color={isDark ? colors.accent : colors.primary} />
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {t.dashboard.calculating}
            </AppText>
          </View>
        ) : isError ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: colors.danger },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
            <AppText
              variant="bodyLargeBold"
              color={colors.danger}
              style={{ marginTop: spacing.xs }}
            >
              {t.dashboard.loadError}
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ marginVertical: spacing.xs, textAlign: 'center' }}
            >
              {(error as Error)?.message || 'Please check your connection and try again.'}
            </AppText>
            <AppButton title={t.dashboard.retry} size="sm" onPress={() => refetch()} />
          </View>
        ) : (
          <>
            {/* 3. Total Billed Sales Card */}
            <View
              style={[
                styles.totalSalesCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.totalSalesTopRow}>
                <AppText
                  variant="captionBold"
                  style={[styles.totalSalesLabel, { color: colors.textSecondary }]}
                >
                  {t.dashboard.totalBilledSales}
                </AppText>
                <View
                  style={[
                    styles.billCountBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(30, 41, 59, 0.08)',
                    },
                  ]}
                >
                  <AppText
                    variant="captionBold"
                    style={{
                      color: isDark ? colors.accent : colors.primary,
                      fontSize: 12,
                    }}
                  >
                    {`${totalInvoices} ${totalInvoices === 1 ? t.dashboard.bill : t.dashboard.bills}`}
                  </AppText>
                </View>
              </View>

              <View style={styles.totalSalesBottomRow}>
                <AppText
                  variant="h1"
                  style={[styles.totalSalesAmount, { color: colors.textPrimary }]}
                >
                  {formatCurrency(dashboardData?.totalBilledPaise || 0)}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
                  {t.dashboard.inSelectedPeriod}
                </AppText>
              </View>
            </View>

            {/* 4. Jama & Baki 2-Column Row */}
            <View style={styles.jamaBakiContainer}>
              {/* Jama Card */}
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.jamaBackground,
                    borderColor: colors.jamaBorder,
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <AppText
                    variant="captionBold"
                    style={[styles.metricLabel, { color: colors.jama }]}
                  >
                    {t.dashboard.jamaReceived}
                  </AppText>
                  <Ionicons name="arrow-down-circle" size={18} color={colors.jama} />
                </View>
                <AppText variant="h2" style={[styles.metricAmount, { color: colors.jama }]}>
                  {formatCurrency(dashboardData?.totalJamaPaise || 0)}
                </AppText>
                <AppText variant="caption" style={[styles.metricSubtext, { color: colors.jama }]}>
                  {dashboardData?.paidTransactionsCount || 0}{' '}
                  {dashboardData?.paidTransactionsCount === 1
                    ? t.dashboard.transaction
                    : t.dashboard.transactions}
                </AppText>
              </View>

              {/* Baki Card */}
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.bakiBackground,
                    borderColor: colors.bakiBorder,
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <AppText
                    variant="captionBold"
                    style={[styles.metricLabel, { color: colors.baki }]}
                  >
                    {t.dashboard.bakiPending}
                  </AppText>
                  <Ionicons name="alert-circle" size={18} color={colors.baki} />
                </View>
                <AppText variant="h2" style={[styles.metricAmount, { color: colors.baki }]}>
                  {formatCurrency(dashboardData?.totalBakiPaise || 0)}
                </AppText>
                <AppText variant="caption" style={[styles.metricSubtext, { color: colors.baki }]}>
                  {dashboardData?.pendingInvoicesCount || 0} {t.dashboard.pending}
                </AppText>
              </View>
            </View>

            {/* 5. Expenses Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.expensesCard,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
              onPress={() => router.push('/(app)/expenses' as any)}
            >
              <View style={styles.expensesTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="wallet-outline" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
                  <AppText
                    variant="captionBold"
                    style={{
                      color: isDark ? '#FBBF24' : '#B45309',
                      fontSize: 13,
                      letterSpacing: 0.5,
                    }}
                  >
                    {t.dashboard.expenses}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
              </View>
              <View style={styles.expensesBottomRow}>
                <AppText
                  variant="h2"
                  style={[
                    styles.expensesAmount,
                    { color: isDark ? '#FBBF24' : '#92400E' },
                  ]}
                >
                  {formatCurrency(dashboardData?.totalExpensesPaise || 0)}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
                  {t.dashboard.inSelectedPeriod}
                </AppText>
              </View>
            </TouchableOpacity>

            {/* 6. Quick Actions Card */}
            <View
              style={[
                styles.quickActionsCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText
                variant="h4"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.dashboard.quickActions}
              </AppText>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isDark ? colors.accent : colors.primary,
                      flex: 1,
                    },
                  ]}
                  onPress={() => router.push('/(app)/invoices/create')}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                  <AppText variant="bodyLargeBold" style={styles.actionBtnPrimaryText}>
                    {t.dashboard.createInvoice}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      borderWidth: 1,
                      flex: 1,
                    },
                  ]}
                  onPress={() => router.push('/(app)/(tabs)/invoices')}
                >
                  <Ionicons name="eye-outline" size={18} color={colors.textPrimary} />
                  <AppText
                    variant="bodyLargeBold"
                    style={[styles.actionBtnSecondaryText, { color: colors.textPrimary }]}
                  >
                    {t.dashboard.viewInvoices}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 7. Recent Bills Card */}
            <View
              style={[
                styles.recentBillsCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <AppText
                  variant="h4"
                  style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}
                >
                  {t.dashboard.recentBills}
                </AppText>
                <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/invoices')}>
                  <AppText
                    variant="captionBold"
                    style={{ color: isDark ? colors.accent : colors.primary }}
                  >
                    {t.dashboard.viewAll}
                  </AppText>
                </TouchableOpacity>
              </View>

              {!dashboardData?.recentInvoices || dashboardData.recentInvoices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                  <AppText
                    variant="bodyMedium"
                    color={colors.textSecondary}
                    style={styles.emptyText}
                  >
                    {t.dashboard.noInvoices}
                  </AppText>
                  <AppButton
                    title={t.dashboard.createFirstBill}
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(app)/invoices/create')}
                  />
                </View>
              ) : (
                dashboardData.recentInvoices.map((inv: InvoiceSummary, idx: number) => {
                  const isPaid = Number(inv.remaining_amount) === 0;
                  const isLast = idx === dashboardData.recentInvoices.length - 1;
                  return (
                    <TouchableOpacity
                      key={inv.id}
                      activeOpacity={0.7}
                      style={[
                        styles.invoiceItemRow,
                        { borderBottomColor: colors.border },
                        isLast && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => router.push(`/(app)/invoices/${inv.id}` as any)}
                    >
                      {/* Row 1: Invoice # + Party Badge (Left) vs Total Amount (Right) */}
                      <View style={styles.invoiceRow1}>
                        <View style={styles.invoiceRow1Left}>
                          <AppText
                            variant="bodyLargeBold"
                            style={{ color: colors.textPrimary }}
                          >
                            #{inv.invoice_number}
                          </AppText>
                          <View
                            style={[
                              styles.partyTypeBadge,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(56, 189, 248, 0.15)'
                                  : 'rgba(30, 41, 59, 0.08)',
                              },
                            ]}
                          >
                            <AppText
                              variant="captionBold"
                              style={{
                                color: isDark ? colors.accent : colors.primary,
                                fontSize: 10,
                              }}
                            >
                              {inv.party_type === 'CUSTOMER' ? 'CUSTOMER' : 'BUYER'}
                            </AppText>
                          </View>
                        </View>
                        <AppText
                          variant="bodyLargeBold"
                          style={{ color: colors.textPrimary }}
                        >
                          {formatCurrency(Number(inv.total_amount))}
                        </AppText>
                      </View>

                      {/* Row 2: Customer Name (Left) vs Baki/Paid Badge (Right) */}
                      <View style={styles.invoiceRow2}>
                        <AppText
                          variant="bodyBold"
                          style={[styles.invPartyName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {inv.party_name}
                        </AppText>
                        <View
                          style={[
                            styles.statusPillBadge,
                            {
                              backgroundColor: isPaid
                                ? colors.jamaBackground
                                : colors.bakiBackground,
                              borderColor: isPaid
                                ? colors.jamaBorder
                                : colors.bakiBorder,
                            },
                          ]}
                        >
                          <AppText
                            variant="captionBold"
                            style={{
                              color: isPaid ? colors.jama : colors.baki,
                              fontSize: 11,
                            }}
                          >
                            {isPaid
                              ? 'PAID'
                              : `Baki: ${formatCurrency(Number(inv.remaining_amount))}`}
                          </AppText>
                        </View>
                      </View>

                      {/* Row 3: Date */}
                      <View style={styles.invoiceRow3}>
                        <AppText
                          variant="caption"
                          style={{ color: colors.textMuted, fontSize: 11 }}
                        >
                          {formatDisplayDate(inv.invoice_date)}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Custom Date Range Picker Modal */}
      <AppModal
        visible={isCustomModalOpen}
        title={t.dashboard.customRangeTitle}
        onClose={() => setIsCustomModalOpen(false)}
      >
        <AppTextInput
          label={t.dashboard.fromDate}
          value={tempFrom}
          onChangeText={setTempFrom}
          placeholder="2026-09-01"
        />

        <AppTextInput
          label={t.dashboard.toDate}
          value={tempTo}
          onChangeText={setTempTo}
          placeholder="2026-09-30"
        />

        <View style={styles.modalActionsRow}>
          <AppButton
            title={t.dashboard.cancel}
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => setIsCustomModalOpen(false)}
          />
          <AppButton
            title={t.dashboard.applyFilter}
            variant="primary"
            style={{ flex: 1 }}
            onPress={handleApplyCustomRange}
          />
        </View>
      </AppModal>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  // 1. Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hamburgerBtn: {
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  headerSubtitleText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  newBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  newBillBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // 2. Scrollable Container
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120, // Clean clearance for bottom navigation
  },

  // 3. Filter Pills
  filterScroll: {
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 4. Period Row
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // 5. Total Billed Sales Card
  totalSalesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: 12,
  },
  totalSalesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalSalesLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  billCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  totalSalesBottomRow: {
    marginTop: 2,
  },
  totalSalesAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // 6. Jama & Baki 2-Column Container
  jamaBakiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.85,
  },

  // 7. Expenses Card
  expensesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: 12,
  },
  expensesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expensesBottomRow: {
    marginTop: 2,
  },
  expensesAmount: {
    fontSize: 22,
    fontWeight: '700',
  },

  // 8. Quick Actions Card
  quickActionsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    gap: 6,
    minHeight: 46,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 9. Recent Bills Card
  recentBillsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginVertical: 8,
    textAlign: 'center',
  },
  invoiceItemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  invoiceRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceRow1Left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  invPartyName: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  invoiceRow3: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 2,
  },

  // Loading & Error States
  centerLoadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Actions
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
