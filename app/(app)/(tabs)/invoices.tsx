import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppButton,
  AppTextInput,
  AppBadge,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useInvoices, InvoiceSummary } from '@/src/features/invoices';
import { useLanguage } from '@/src/localization';
import { PartyType } from '@/src/types/database';
import { formatCurrency } from '@/src/utils';

type FilterTab = 'ALL' | 'CUSTOMERS' | 'BUYERS' | 'BAKI' | 'PAID';

const PAGE_CHUNK_SIZE = 20;

export default function InvoicesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [displayLimit, setDisplayLimit] = useState(PAGE_CHUNK_SIZE);

  // Convert tab to query filters
  const partyTypeFilter: PartyType | undefined =
    activeTab === 'CUSTOMERS' ? 'CUSTOMER' : activeTab === 'BUYERS' ? 'BUYER' : undefined;

  const paymentStatusFilter: 'ALL' | 'PAID' | 'BAKI' =
    activeTab === 'PAID' ? 'PAID' : activeTab === 'BAKI' ? 'BAKI' : 'ALL';

  const {
    data: invoices,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInvoices({
    partyType: partyTypeFilter,
    paymentStatus: paymentStatusFilter,
    searchQuery,
  });

  // Calculate high-level metrics
  const totalBilledPaise = (invoices || []).reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0,
  );
  const totalBakiPaise = (invoices || []).reduce(
    (sum, inv) => sum + Number(inv.remaining_amount || 0),
    0,
  );

  const paginatedInvoices = invoices ? invoices.slice(0, displayLimit) : [];

  const handleEndReached = () => {
    if (invoices && displayLimit < invoices.length) {
      setDisplayLimit(prev => prev + PAGE_CHUNK_SIZE);
    }
  };

  const renderInvoiceCard = ({ item }: { item: InvoiceSummary }) => {
    const isPaid = Number(item.remaining_amount) === 0;
    const hasBaki = Number(item.remaining_amount) > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/invoices/${item.id}` as any)}
      >
        <AppCard style={styles.invoiceCard}>
          {/* Card Header: Invoice # & Date */}
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <AppText variant="bodyLargeBold">#{item.invoice_number}</AppText>
              <AppBadge
                label={
                  item.party_type === 'CUSTOMER' ? t.invoices.customerBill : t.invoices.buyerBill
                }
                variant={item.party_type === 'CUSTOMER' ? 'neutral' : 'info'}
              />
            </View>

            <AppText variant="caption" color={colors.textSecondary}>
              {new Date(item.invoice_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </AppText>
          </View>

          {/* Party Name */}
          <View style={styles.partyRow}>
            <Ionicons
              name={item.party_type === 'CUSTOMER' ? 'person-outline' : 'business-outline'}
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <AppText variant="bodyLargeBold" numberOfLines={1} style={{ flex: 1 }}>
              {item.party_name}
            </AppText>
          </View>

          {/* Items count summary */}
          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={{ marginBottom: spacing.xs }}
          >
            {item.items_count} {t.invoices.item.toLowerCase()}
            {item.items_count === 1 ? '' : 's'}
          </AppText>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Card Footer: Financial Summary */}
          <View style={styles.cardFooter}>
            <View>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.invoices.totalAmount}
              </AppText>
              <AppText variant="bodyLargeBold">{formatCurrency(Number(item.total_amount))}</AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppBadge
                label={
                  isPaid
                    ? t.invoices.fullyPaid
                    : hasBaki
                      ? `${t.invoices.filterBaki}: ${formatCurrency(Number(item.remaining_amount))}`
                      : t.invoices.unpaid
                }
                variant={isPaid ? 'success' : 'danger'}
              />
              {hasBaki && Number(item.paid_amount) > 0 && (
                <AppText variant="caption" color={colors.jama} style={{ marginTop: 2 }}>
                  {t.invoices.paidAmount}: {formatCurrency(Number(item.paid_amount))}
                </AppText>
              )}
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <AppScreenContainer
      edges={['top']}
      header={
        <AppHeader
          title={t.invoices.title}
          subtitle={t.invoices.subtitle}
          rightAction={
            <AppButton
              title={t.invoices.createFirstBill}
              size="sm"
              variant="primary"
              onPress={() => router.push('/(app)/invoices/create')}
              style={styles.headerAddBtn}
            />
          }
        />
      }
    >
      {/* High-Level Ledger Summary Bar */}
      <AppCard style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.invoices.title.toUpperCase()}
          </AppText>
          <AppText variant="h3">{invoices?.length || 0}</AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.invoices.totalAmount.toUpperCase()}
          </AppText>
          <AppText variant="h3" color={colors.primary}>
            {formatCurrency(totalBilledPaise)}
          </AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.invoices.filterBaki.toUpperCase()}
          </AppText>
          <AppText variant="h3" color={colors.baki}>
            {formatCurrency(totalBakiPaise)}
          </AppText>
        </View>
      </AppCard>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <AppTextInput
          placeholder={t.invoices.searchPlaceholder}
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            setDisplayLimit(PAGE_CHUNK_SIZE);
          }}
          containerStyle={styles.searchInputContainer}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(['ALL', 'CUSTOMERS', 'BUYERS', 'BAKI', 'PAID'] as FilterTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}
            onPress={() => {
              setActiveTab(tab);
              setDisplayLimit(PAGE_CHUNK_SIZE);
            }}
          >
            <AppText
              variant="captionBold"
              color={activeTab === tab ? colors.textInverse : colors.textSecondary}
            >
              {tab === 'ALL'
                ? t.invoices.filterAll
                : tab === 'CUSTOMERS'
                  ? t.invoices.filterCustomers
                  : tab === 'BUYERS'
                    ? t.invoices.filterBuyers
                    : tab === 'BAKI'
                      ? t.invoices.filterBaki
                      : t.invoices.filterPaid}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List / States */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.stateText}>
            {t.common.loading}
          </AppText>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <AppText variant="bodyLargeBold" color={colors.danger} style={styles.stateTitle}>
            {t.common.error}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {(error as Error)?.message || 'Please check your connection and try again.'}
          </AppText>
          <AppButton title={t.common.retry} onPress={() => refetch()} style={styles.retryBtn} />
        </View>
      ) : invoices && invoices.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
          <AppText variant="bodyLargeBold" style={styles.stateTitle}>
            {t.invoices.noInvoicesFound}
          </AppText>
          {!searchQuery && (
            <AppButton
              title={t.invoices.createFirstBill}
              onPress={() => router.push('/(app)/invoices/create' as any)}
              style={styles.retryBtn}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={paginatedInvoices}
          keyExtractor={item => item.id}
          renderItem={renderInvoiceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={true}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerAddBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    zIndex: 1,
  },
  searchInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  searchInput: {
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    backgroundColor: colors.surface,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: spacing.sm,
    zIndex: 1,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listContent: {
    paddingBottom: 160,
  },
  invoiceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    marginTop: spacing.sm,
  },
  stateTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  stateSubtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    marginTop: spacing.md,
  },
});
