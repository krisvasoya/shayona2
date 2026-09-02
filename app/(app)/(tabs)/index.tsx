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
import { colors } from '@/src/theme/colors';
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
    <AppScreenContainer scrollable={false} edges={['top']}>
      {/* 1. Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => drawer?.openDrawer()}
            style={styles.hamburgerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Open Navigation Drawer"
          >
            <Ionicons name="menu-outline" size={26} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <AppText variant="h3" style={styles.headerTitleText}>
              {t.dashboard.title}
            </AppText>
            <AppText variant="caption" style={styles.headerSubtitleText} numberOfLines={1}>
              {shopName}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.newBillBtn}
          onPress={() => router.push('/(app)/invoices/create')}
        >
          <AppText variant="bodyLargeBold" style={styles.newBillBtnText}>
            {t.dashboard.newBill || '+ New Bill'}
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {/* 2. Date Filter Tabs (Horizontal Pill Scroll) */}
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
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <AppText
                  variant="captionBold"
                  style={isActive ? styles.filterPillTextActive : styles.filterPillTextInactive}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. Active Period Display */}
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={15} color="#64748B" />
          <AppText variant="caption" style={styles.periodText}>
            {t.dashboard.period}: {currentRange.startDate} to {currentRange.endDate}
          </AppText>
        </View>

        {/* 4. Loading State */}
        {isLoading && !isRefetching ? (
          <View style={styles.centerLoadingState}>
            <ActivityIndicator size="large" color="#1E293B" />
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {t.dashboard.calculating}
            </AppText>
          </View>
        ) : isError ? (
          <View style={styles.errorCard}>
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
            {/* 5. Total Billed Sales Card */}
            <View style={styles.totalSalesCard}>
              <View style={styles.totalSalesTopRow}>
                <AppText variant="captionBold" style={styles.totalSalesLabel}>
                  {t.dashboard.totalBilledSales}
                </AppText>
                <View style={styles.billCountBadge}>
                  <AppText variant="captionBold" style={styles.billCountBadgeText}>
                    {`${totalInvoices} ${totalInvoices === 1 ? t.dashboard.bill : t.dashboard.bills}`}
                  </AppText>
                </View>
              </View>

              <View style={styles.totalSalesBottomRow}>
                <AppText variant="h1" style={styles.totalSalesAmount}>
                  {formatCurrency(dashboardData?.totalBilledPaise || 0)}
                </AppText>
                <AppText variant="caption" style={styles.inSelectedPeriodText}>
                  {t.dashboard.inSelectedPeriod}
                </AppText>
              </View>
            </View>

            {/* 6. Jama & Baki Side-by-Side Cards */}
            <View style={styles.jamaBakiContainer}>
              {/* Jama / Received Card */}
              <View style={styles.jamaCard}>
                <View style={styles.cardHeaderRow}>
                  <AppText variant="captionBold" style={styles.jamaLabel}>
                    {t.dashboard.jamaReceived}
                  </AppText>
                  <Ionicons name="arrow-down-circle" size={18} color="#059669" />
                </View>
                <AppText variant="h2" style={styles.jamaAmount}>
                  {formatCurrency(dashboardData?.totalJamaPaise || 0)}
                </AppText>
                <AppText variant="caption" style={styles.jamaSubtext}>
                  {dashboardData?.paidTransactionsCount || 0}{' '}
                  {dashboardData?.paidTransactionsCount === 1
                    ? t.dashboard.transaction
                    : t.dashboard.transactions}
                </AppText>
              </View>

              {/* Baki / Due Card */}
              <View style={styles.bakiCard}>
                <View style={styles.cardHeaderRow}>
                  <AppText variant="captionBold" style={styles.bakiLabel}>
                    {t.dashboard.bakiPending}
                  </AppText>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                </View>
                <AppText variant="h2" style={styles.bakiAmount}>
                  {formatCurrency(dashboardData?.totalBakiPaise || 0)}
                </AppText>
                <AppText variant="caption" style={styles.bakiSubtext}>
                  {dashboardData?.pendingInvoicesCount || 0} {t.dashboard.pending}
                </AppText>
              </View>
            </View>

            {/* 7. Quick Actions Card */}
            <View style={styles.standardCard}>
              <AppText variant="h4" style={styles.sectionTitle}>
                {t.dashboard.quickActions}
              </AppText>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.actionBtnPrimary}
                  onPress={() => router.push('/(app)/invoices/create')}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                  <AppText variant="bodyLargeBold" style={styles.actionBtnPrimaryText}>
                    {t.dashboard.createInvoice}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.actionBtnSecondary}
                  onPress={() => router.push('/(app)/(tabs)/invoices')}
                >
                  <Ionicons name="eye-outline" size={18} color="#0F172A" />
                  <AppText variant="bodyLargeBold" style={styles.actionBtnSecondaryText}>
                    {t.dashboard.viewInvoices}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 8. Recent Bills Card */}
            <View style={styles.standardCard}>
              <View style={styles.sectionHeaderRow}>
                <AppText variant="h4" style={styles.sectionTitle}>
                  {t.dashboard.recentBills}
                </AppText>
                <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/invoices')}>
                  <AppText variant="captionBold" style={styles.viewAllText}>
                    {t.dashboard.viewAll}
                  </AppText>
                </TouchableOpacity>
              </View>

              {!dashboardData?.recentInvoices || dashboardData.recentInvoices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
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
                      style={[styles.invoiceItemRow, isLast && styles.invoiceItemRowLast]}
                      onPress={() => router.push(`/(app)/invoices/${inv.id}` as any)}
                    >
                      {/* Row 1: Invoice # + Party Type Badge (Left) vs Total Amount (Right) */}
                      <View style={styles.invoiceRow1}>
                        <View style={styles.invoiceRow1Left}>
                          <AppText variant="bodyLargeBold" style={styles.invNumberText}>
                            #{inv.invoice_number}
                          </AppText>
                          <View style={styles.partyTypeBadge}>
                            <AppText variant="captionBold" style={styles.partyTypeBadgeText}>
                              {inv.party_type === 'CUSTOMER' ? 'CUSTOMER' : 'BUYER'}
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="bodyLargeBold" style={styles.invTotalText}>
                          {formatCurrency(Number(inv.total_amount))}
                        </AppText>
                      </View>

                      {/* Row 2: Customer Name (Left) vs Baki/Paid Badge (Right) */}
                      <View style={styles.invoiceRow2}>
                        <AppText variant="bodyBold" style={styles.invPartyName} numberOfLines={1}>
                          {inv.party_name}
                        </AppText>
                        <View
                          style={[
                            styles.statusPillBadge,
                            isPaid ? styles.paidStatusPill : styles.bakiStatusPill,
                          ]}
                        >
                          <AppText
                            variant="captionBold"
                            style={isPaid ? styles.paidStatusText : styles.bakiStatusText}
                          >
                            {isPaid
                              ? 'PAID'
                              : `Baki: ${formatCurrency(Number(inv.remaining_amount))}`}
                          </AppText>
                        </View>
                      </View>

                      {/* Row 3: Date */}
                      <View style={styles.invoiceRow3}>
                        <AppText variant="caption" style={styles.invDateText}>
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
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hamburgerBtn: {
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  headerSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  newBillBtn: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  newBillBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Container & Scroll
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },

  // 2. Date Filter Pill Row
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextInactive: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },

  // 3. Period Row
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  periodText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // 4. Loading & Error
  centerLoadingState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    padding: spacing.lg,
    marginVertical: spacing.md,
  },

  // 5. Total Billed Sales Card
  totalSalesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  totalSalesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSalesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  billCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  billCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  totalSalesBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  totalSalesAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
  },
  inSelectedPeriodText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 2,
  },

  // 6. Jama & Baki Side-by-Side Cards
  jamaBakiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  jamaCard: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
  },
  bakiCard: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 16,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jamaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.3,
  },
  bakiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  jamaAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    lineHeight: 28,
  },
  bakiAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#DC2626',
    lineHeight: 28,
  },
  jamaSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  bakiSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },

  // Common Standard Card
  standardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // 7. Quick Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnSecondaryText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },

  // 8. Recent Bills Item Rows
  invoiceItemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invoiceItemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  invoiceRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceRow1Left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  partyTypeBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  partyTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  invTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  invoiceRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invPartyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 10,
  },
  statusPillBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  paidStatusPill: {
    backgroundColor: '#ECFDF5',
  },
  paidStatusText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  bakiStatusPill: {
    backgroundColor: '#FFF1F2',
  },
  bakiStatusText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceRow3: {
    marginTop: 2,
  },
  invDateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    marginVertical: spacing.xs,
  },

  // Modal Styles
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
