import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
import { useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import {
  useCustomers,
  useCreateCustomer,
  customerFormSchema,
  CustomerSummary,
} from '@/src/features/customers';
import { useLanguage } from '@/src/localization';
import { formatCurrency } from '@/src/utils';
import { formatPhoneDisplay } from '@/src/utils/phone';

export default function CustomersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // TanStack Query hooks
  const {
    data: customers,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCustomers(searchQuery);
  const createCustomerMutation = useCreateCustomer();

  // Reset Add Form
  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setFormErrors({});
  };

  // Submit Add Customer
  const handleCreateCustomer = async () => {
    setFormErrors({});

    const parseResult = customerFormSchema.safeParse({
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

    const res = await createCustomerMutation.mutateAsync({
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    });

    if (res.error) {
      setFormErrors({ form: res.error || 'Failed to create customer.' });
    } else {
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  // Aggregated Baki
  const totalOutstandingBaki = (customers || []).reduce(
    (sum, c) => sum + Number(c.total_baki || 0),
    0,
  );

  const renderCustomerItem = ({ item }: { item: CustomerSummary }) => {
    const hasBaki = Number(item.total_baki) > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/customers/${item.id}` as any)}
      >
        <AppCard variant="elevated" style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText
                variant="bodyLargeBold"
                color={isDark ? colors.accent : colors.primary}
              >
                {item.name.slice(0, 2).toUpperCase()}
              </AppText>
            </View>

            <View style={styles.customerInfo}>
              <AppText variant="bodyLargeBold" color={colors.textPrimary} numberOfLines={1}>
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
          title={t.customers.title}
          subtitle={t.customers.subtitle}
          rightAction={
            <AppButton
              title={t.customers.addCustomer}
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
      <AppCard variant="elevated" style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.customers.title.toUpperCase()}
          </AppText>
          <AppText variant="h3" color={colors.textPrimary}>
            {customers?.length || 0}
          </AppText>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryCol}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t.customers.totalBaki.toUpperCase()}
          </AppText>
          <AppText variant="h3" color={colors.baki}>
            {formatCurrency(totalOutstandingBaki)}
          </AppText>
        </View>
      </AppCard>

      {/* Search Bar with Native Icons */}
      <AppTextInput
        placeholder={t.customers.searchPlaceholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={styles.searchContainer}
        autoCapitalize="none"
        leftIcon={
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />
        }
        rightIcon={
          searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Customer List / States */}
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
      ) : customers && customers.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons
            name="people-outline"
            size={56}
            color={isDark ? colors.accent : colors.textMuted}
          />
          <AppText variant="bodyLargeBold" color={colors.textPrimary} style={styles.stateTitle}>
            {t.customers.noCustomers}
          </AppText>
          <AppButton
            title={`+ ${t.customers.addCustomer}`}
            onPress={() => setIsAddModalOpen(true)}
            style={styles.retryBtn}
          />
        </View>
      ) : (
        <FlatList
          data={customers ? customers.slice(0, displayLimit) : []}
          keyExtractor={item => item.id}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={true}
          onEndReached={() => {
            if (customers && displayLimit < customers.length) {
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

      {/* Add Customer Full-Screen Modal Popup */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        statusBarTranslucent
      >
        <SafeAreaView
          edges={['top', 'bottom']}
          style={[styles.fullscreenModalContainer, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.fullscreenModalHeader,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <AppText variant="h3" style={{ color: colors.textPrimary }}>
              {t.customers.createCustomerTitle}
            </AppText>
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
              label={`${t.customers.customerName} *`}
              placeholder="e.g. Ramesh Patel"
              value={name}
              onChangeText={setName}
              error={formErrors.name}
              autoFocus
            />

            <AppTextInput
              label={t.customers.phoneNumber}
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              error={formErrors.phone}
            />

            <AppTextInput
              label={t.customers.address}
              placeholder="Shop address, village, or area"
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
                title={t.customers.saveCustomer}
                variant="primary"
                loading={createCustomerMutation.isPending}
                onPress={handleCreateCustomer}
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
    marginVertical: spacing.xs,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 160,
  },
  customerCard: {
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
  customerInfo: {
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
