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
import { PartyType } from '@/src/types/database';
import { formatCurrency } from '@/src/utils';

type FilterTab = 'ALL' | 'CUSTOMERS' | 'BUYERS' | 'BAKI' | 'PAID';

export default function InvoicesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

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

  const renderInvoiceCard = ({ item }: { item: InvoiceSummary }) => {
    const isPaid = Number(item.remaining_amount) === 0;
    const hasBaki = Number(item.remaining_amount) > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/invoices/${item.id}` as any)}
      >
        <AppCard style={styles.invoiceCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.invoiceNumRow}>
                <AppText variant="bodyLargeBold">Bill #{item.invoice_number}</AppText>
                <AppBadge
                  label={item.party_type}
                  variant={item.party_type === 'CUSTOMER' ? 'neutral' : 'info'}
                  style={styles.partyBadge}
                />
              </View>

              <AppText variant="bodyBold" color={colors.textPrimary} numberOfLines={1}>
                {item.party_name}
              </AppText>

              <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                {new Date(item.invoice_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                • {item.items_count} item{item.items_count === 1 ? '' : 's'}
              </AppText>
            </View>

            <View style={styles.cardAmountCol}>
              <AppText variant="bodyLargeBold" style={styles.totalAmountText}>
                {formatCurrency(Number(item.total_amount))}
              </AppText>

              <AppBadge
                label={isPaid ? 'PAID' : `Baki: ${formatCurrency(Number(item.remaining_amount))}`}
                variant={isPaid ? 'success' : hasBaki ? 'danger' : 'neutral'}
              />
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <AppScreenContainer
      edges={['top']}
      style={styles.container}
      header={
        <AppHeader
          title="Invoices"
          subtitle="Bill History & Records"
          showMenu={true}
          rightAction={
            <AppButton
              title="+ Create Bill"
              size="sm"
              variant="primary"
              onPress={() => router.push('/(app)/invoices/create' as any)}
            />
          }
        />
      }
    >
      {/* Summary Metrics Banner */}
      <AppCard style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            TOTAL BILLS
          </AppText>
          <AppText variant="h3">{invoices?.length || 0}</AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            TOTAL BILLED
          </AppText>
          <AppText variant="h3" color={colors.primary}>
            {formatCurrency(totalBilledPaise)}
          </AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            TOTAL BAKI
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
          placeholder="Search by invoice #, customer, or buyer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
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
            onPress={() => setActiveTab(tab)}
          >
            <AppText
              variant="captionBold"
              color={activeTab === tab ? colors.textInverse : colors.textSecondary}
            >
              {tab === 'ALL'
                ? 'All'
                : tab === 'CUSTOMERS'
                  ? 'Customers'
                  : tab === 'BUYERS'
                    ? 'Buyers'
                    : tab === 'BAKI'
                      ? 'Baki Due'
                      : 'Paid'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List / States */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.stateText}>
            Loading invoice records...
          </AppText>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <AppText variant="bodyLargeBold" color={colors.danger} style={styles.stateTitle}>
            Failed to load invoices
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {(error as Error)?.message || 'Please check your connection and try again.'}
          </AppText>
          <AppButton title="Retry" onPress={() => refetch()} style={styles.retryBtn} />
        </View>
      ) : invoices && invoices.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
          <AppText variant="bodyLargeBold" style={styles.stateTitle}>
            {searchQuery ? 'No matching bills found' : 'No invoices created yet'}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {searchQuery
              ? 'Try searching with a different bill number or party name.'
              : 'Create your first bill to record items, calculate totals, and track payments.'}
          </AppText>
          {!searchQuery && (
            <AppButton
              title="+ Create First Bill"
              onPress={() => router.push('/(app)/invoices/create' as any)}
              style={styles.retryBtn}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={renderInvoiceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  container: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  headerAddBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
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
    marginHorizontal: spacing.xs,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 14,
    zIndex: 1,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  searchInput: {
    paddingLeft: spacing.xl + spacing.xs,
    paddingRight: spacing.xl,
    minHeight: 46,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 14,
    zIndex: 1,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  invoiceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  partyBadge: {
    paddingVertical: 1,
    paddingHorizontal: spacing.xs,
  },
  cardAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  totalAmountText: {
    fontSize: 16,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  stateText: {
    marginTop: spacing.md,
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
    minWidth: 160,
  },
});
