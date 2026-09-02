import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppText,
  AppCard,
  AppButton,
  AppTextInput,
  AppBadge,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useBuyers, useCreateBuyer, buyerFormSchema, BuyerSummary } from '@/src/features/buyers';
import { formatCurrency, formatPhoneDisplay } from '@/src/utils';

export default function BuyersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // TanStack Query hooks
  const { data: buyers, isLoading, isError, error, refetch, isRefetching } = useBuyers(searchQuery);
  const createBuyerMutation = useCreateBuyer();

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setFormErrors({});
  };

  const handleCreateBuyer = async () => {
    setFormErrors({});

    const parseResult = buyerFormSchema.safeParse({
      name,
      phone: phone || undefined,
      address: address || undefined,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      parseResult.error.issues.forEach(issue => {
        const path = issue.path[0] as string;
        errMap[path] = issue.message;
      });
      setFormErrors(errMap);
      return;
    }

    const res = await createBuyerMutation.mutateAsync({
      name: parseResult.data.name,
      phone: parseResult.data.phone,
      address: parseResult.data.address,
    });

    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  // Total Baki Calculation
  const totalOutstandingBaki = (buyers || []).reduce((acc, b) => acc + (b.total_baki || 0), 0);

  const renderBuyerItem = ({ item }: { item: BuyerSummary }) => {
    const hasBaki = item.total_baki > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/buyers/${item.id}` as any)}
      >
        <AppCard style={styles.buyerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarCircle}>
              <AppText variant="bodyLargeBold" color={colors.accent}>
                {item.name.slice(0, 2).toUpperCase()}
              </AppText>
            </View>

            <View style={styles.buyerInfo}>
              <AppText variant="bodyLargeBold" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.phoneText}>
                {item.phone ? formatPhoneDisplay(item.phone) : 'No phone number'}
              </AppText>
            </View>

            <View style={styles.amountContainer}>
              <AppText
                variant="bodyLargeBold"
                color={hasBaki ? colors.baki : colors.jama}
                style={styles.amountText}
              >
                {formatCurrency(item.total_baki)}
              </AppText>
              <AppBadge
                label={hasBaki ? 'Baki (Due)' : 'Clear'}
                variant={hasBaki ? 'danger' : 'success'}
              />
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <AppScreenContainer edges={['top']} style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="h2">Buyers</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Vyapari / Wholesale Directory
          </AppText>
        </View>

        <AppButton
          title="+ Add"
          variant="primary"
          onPress={() => setIsAddModalOpen(true)}
          style={styles.headerAddBtn}
        />
      </View>

      {/* Outstanding Stats Banner */}
      <AppCard style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            TOTAL BUYERS
          </AppText>
          <AppText variant="h3">{buyers?.length || 0}</AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            TOTAL BAKI (DUE)
          </AppText>
          <AppText variant="h3" color={colors.baki}>
            {formatCurrency(totalOutstandingBaki)}
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
          placeholder="Search by buyer name or phone..."
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

      {/* Buyer List / States */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.stateText}>
            Loading buyer accounts...
          </AppText>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <AppText variant="bodyLargeBold" color={colors.danger} style={styles.stateTitle}>
            Failed to load buyers
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {(error as Error)?.message || 'Please check your connection and try again.'}
          </AppText>
          <AppButton title="Retry" onPress={() => refetch()} style={styles.retryBtn} />
        </View>
      ) : buyers && buyers.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="business-outline" size={56} color={colors.textMuted} />
          <AppText variant="bodyLargeBold" style={styles.stateTitle}>
            {searchQuery ? 'No matching buyers found' : 'No buyers added yet'}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {searchQuery
              ? 'Try searching with a different name or mobile number.'
              : 'Add your wholesale buyers and merchants to track bills and outstanding balances.'}
          </AppText>
          {!searchQuery && (
            <AppButton
              title="+ Add First Buyer"
              onPress={() => setIsAddModalOpen(true)}
              style={styles.retryBtn}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={buyers}
          keyExtractor={item => item.id}
          renderItem={renderBuyerItem}
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

      {/* Add Buyer Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Add New Buyer</AppText>
              <TouchableOpacity
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppTextInput
                label="Buyer / Business Name *"
                placeholder="e.g. Mahavir Textiles"
                value={name}
                onChangeText={setName}
                error={formErrors.name}
                autoFocus
              />

              <AppTextInput
                label="Mobile Number (Optional)"
                placeholder="10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                error={formErrors.phone}
                helperText="Indian 10-digit mobile number"
              />

              <AppTextInput
                label="Address / Market (Optional)"
                placeholder="Shop number, market, or city"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                error={formErrors.address}
              />

              <View style={styles.modalActionRow}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Save Buyer"
                  variant="primary"
                  loading={createBuyerMutation.isPending}
                  onPress={handleCreateBuyer}
                  style={styles.modalBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginHorizontal: spacing.sm,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: spacing.md,
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
  listContent: {
    paddingBottom: spacing.xxl,
  },
  buyerCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  buyerInfo: {
    flex: 1,
  },
  phoneText: {
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    marginBottom: 4,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalBtn: {
    flex: 1,
  },
});
