import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useBuyers, useCreateBuyer, buyerFormSchema, BuyerSummary } from '@/src/features/buyers';
import { useLanguage } from '@/src/localization';
import { formatCurrency, formatPhoneDisplay } from '@/src/utils';

export default function BuyersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

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
      const errMap: { [key: string]: string } = {};
      parseResult.error.errors.forEach(err => {
        if (err.path[0]) errMap[err.path[0] as string] = err.message;
      });
      setFormErrors(errMap);
      return;
    }

    const res = await createBuyerMutation.mutateAsync(parseResult.data);

    if (res.error) {
      Alert.alert(t.common.error, res.error);
    } else {
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const totalOutstandingBaki = (buyers || []).reduce(
    (sum, b) => sum + Number(b.total_baki || 0),
    0,
  );

  const renderBuyerItem = ({ item }: { item: BuyerSummary }) => {
    const hasBaki = Number(item.total_baki) > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/buyers/${item.id}` as any)}
      >
        <AppCard style={styles.buyerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarCircle}>
              <AppText variant="bodyLargeBold" color={colors.primary}>
                {item.name.slice(0, 2).toUpperCase()}
              </AppText>
            </View>

            <View style={styles.buyerInfo}>
              <AppText variant="bodyLargeBold" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.phoneText}>
                {item.phone ? formatPhoneDisplay(item.phone) : '—'}
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
                label={hasBaki ? t.invoices.filterBaki : t.invoices.fullyPaid}
                variant={hasBaki ? 'danger' : 'success'}
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
      header={
        <AppHeader
          title={t.buyers.title}
          subtitle={t.buyers.subtitle}
          rightAction={
            <AppButton
              title={t.buyers.addBuyer}
              size="sm"
              variant="primary"
              onPress={() => setIsAddModalOpen(true)}
              style={styles.headerAddBtn}
            />
          }
        />
      }
    >
      {/* Outstanding Stats Banner */}
      <AppCard style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.buyers.title.toUpperCase()}
          </AppText>
          <AppText variant="h3">{buyers?.length || 0}</AppText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.buyers.totalBaki.toUpperCase()}
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
          placeholder={t.buyers.searchPlaceholder}
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
      ) : buyers && buyers.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="business-outline" size={56} color={colors.textMuted} />
          <AppText variant="bodyLargeBold" style={styles.stateTitle}>
            {t.buyers.noBuyers}
          </AppText>
          {!searchQuery && (
            <AppButton
              title={t.buyers.addBuyer}
              onPress={() => setIsAddModalOpen(true)}
              style={styles.retryBtn}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={buyers ? buyers.slice(0, displayLimit) : []}
          keyExtractor={item => item.id}
          renderItem={renderBuyerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={true}
          onEndReached={() => {
            if (buyers && displayLimit < buyers.length) {
              setDisplayLimit(prev => prev + 20);
            }
          }}
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

      {/* Add Buyer Full-Screen Modal Popup */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        statusBarTranslucent
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalHeader}>
            <AppText variant="h3">{t.buyers.createBuyerTitle}</AppText>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.fullscreenModalScroll}
            contentContainerStyle={styles.fullscreenModalContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <AppTextInput
              label={`${t.buyers.buyerName} *`}
              placeholder="e.g. Mahavir Textiles"
              value={name}
              onChangeText={setName}
              error={formErrors.name}
              autoFocus
            />

            <AppTextInput
              label={t.buyers.phoneNumber}
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              error={formErrors.phone}
            />

            <AppTextInput
              label={t.buyers.address}
              placeholder="Shop address, market, or city"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              error={formErrors.address}
            />

            <View style={styles.fullscreenModalActionRow}>
              <AppButton
                title={t.common.cancel}
                variant="outline"
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                style={styles.modalBtn}
              />
              <AppButton
                title={t.buyers.saveBuyer}
                variant="primary"
                loading={createBuyerMutation.isPending}
                onPress={handleCreateBuyer}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: spacing.md,
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
    padding: 4,
  },
  listContent: {
    paddingBottom: 160,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginBottom: 2,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.md,
  },
  retryBtn: {
    minWidth: 140,
    marginTop: spacing.sm,
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fullscreenModalScroll: {
    flex: 1,
  },
  fullscreenModalContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  fullscreenModalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    flex: 1,
  },
});
