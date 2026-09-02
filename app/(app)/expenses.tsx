import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppText,
  AppCard,
  AppButton,
  AppTextInput,
  AppModal,
} from '@/src/components/common';
import { useDrawer } from '@/src/components/navigation/DrawerContext';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { formatCurrency, paiseToRupees } from '@/src/utils';
import { useLanguage } from '@/src/localization';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  expenseFormSchema,
} from '@/src/features/expenses';
import { DateFilter, getDateRange } from '@/src/features/dashboard';
import { ExpenseSummary } from '@/src/types/expense';

export default function ExpensesScreen() {
  const { openDrawer } = useDrawer();
  const { t } = useLanguage();

  // Date Filter State
  const [activeFilter, setActiveFilter] = useState<DateFilter>('THIS_MONTH');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>(
    undefined,
  );
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');

  const currentRange = getDateRange(activeFilter, customRange);

  // Expenses Query
  const {
    data: expenses,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useExpenses(currentRange.startDate, currentRange.endDate);

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  // Add / Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSummary | null>(null);

  // Form Fields
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountInput, setAmountInput] = useState('');
  const [formErrors, setFormErrors] = useState<{ expense_date?: string; amount?: string }>({});

  const resetForm = () => {
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setAmountInput('');
    setFormErrors({});
    setSelectedExpense(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (expense: ExpenseSummary) => {
    setSelectedExpense(expense);
    setExpenseDate(expense.expense_date);
    setAmountInput(paiseToRupees(expense.amount).toString());
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveExpense = async () => {
    const parsedAmount = parseFloat(amountInput);
    const result = expenseFormSchema.safeParse({
      expense_date: expenseDate.trim(),
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
    });

    if (!result.success) {
      const errMap: { expense_date?: string; amount?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path.includes('expense_date')) errMap.expense_date = err.message;
        if (err.path.includes('amount')) errMap.amount = err.message;
      });
      setFormErrors(errMap);
      return;
    }

    try {
      const res = await createExpenseMutation.mutateAsync({
        expense_date: result.data.expense_date,
        amount: result.data.amount,
      });

      if (res.error) {
        Alert.alert(t.common.error, res.error);
        return;
      }

      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to save expense');
    }
  };

  const handleUpdateExpense = async () => {
    if (!selectedExpense) return;

    const parsedAmount = parseFloat(amountInput);
    const result = expenseFormSchema.safeParse({
      expense_date: expenseDate.trim(),
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
    });

    if (!result.success) {
      const errMap: { expense_date?: string; amount?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path.includes('expense_date')) errMap.expense_date = err.message;
        if (err.path.includes('amount')) errMap.amount = err.message;
      });
      setFormErrors(errMap);
      return;
    }

    try {
      const res = await updateExpenseMutation.mutateAsync({
        id: selectedExpense.id,
        values: {
          expense_date: result.data.expense_date,
          amount: result.data.amount,
        },
      });

      if (res.error) {
        Alert.alert(t.common.error, res.error);
        return;
      }

      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to update expense');
    }
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert(t.expenses.deleteConfirmTitle, t.expenses.deleteConfirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await deleteExpenseMutation.mutateAsync(id);
            if (res.error) {
              Alert.alert(t.common.error, res.error);
            }
          } catch (err) {
            Alert.alert(t.common.error, (err as Error).message || 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  const handleApplyCustomRange = () => {
    if (!tempFrom.trim() || !tempTo.trim()) {
      Alert.alert(t.common.error, 'Please enter valid start and end dates.');
      return;
    }
    setCustomRange({ from: tempFrom.trim(), to: tempTo.trim() });
    setActiveFilter('CUSTOM');
    setIsCustomModalOpen(false);
  };

  // Compute Total for period
  const totalPeriodPaise = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const filterButtons: { label: string; value: DateFilter }[] = [
    { label: t.dashboard.today, value: 'TODAY' },
    { label: t.dashboard.thisWeek, value: 'THIS_WEEK' },
    { label: t.dashboard.thisMonth, value: 'THIS_MONTH' },
    { label: t.dashboard.thisYear, value: 'THIS_YEAR' },
    { label: t.dashboard.custom, value: 'CUSTOM' },
  ];

  return (
    <AppScreenContainer>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.hamburgerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu-outline" size={26} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <AppText variant="h2">{t.expenses.title}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t.expenses.subtitle}
            </AppText>
          </View>
        </View>

        <AppButton
          title={t.expenses.addExpense}
          size="sm"
          onPress={openAddModal}
          style={styles.headerAddBtn}
        />
      </View>

      {/* 2. Date Filter Pill Row */}
      <View style={{ marginTop: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterButtons.map(btn => {
            const isActive = activeFilter === btn.value;
            return (
              <TouchableOpacity
                key={btn.value}
                activeOpacity={0.7}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => {
                  if (btn.value === 'CUSTOM') {
                    setTempFrom(currentRange.startDate);
                    setTempTo(currentRange.endDate);
                    setIsCustomModalOpen(true);
                  } else {
                    setActiveFilter(btn.value);
                  }
                }}
              >
                <AppText
                  style={isActive ? styles.filterPillTextActive : styles.filterPillTextInactive}
                >
                  {btn.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Active Period Display */}
      <View style={styles.periodRow}>
        <Ionicons name="calendar-outline" size={15} color="#64748B" />
        <AppText variant="caption" style={styles.periodText}>
          {t.dashboard.period}: {currentRange.startDate} to {currentRange.endDate}
        </AppText>
      </View>

      {/* 4. Total Expenses Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wallet-outline" size={20} color="#B45309" />
            <AppText variant="captionBold" style={styles.summaryLabel}>
              {t.expenses.totalExpenses}
            </AppText>
          </View>
          <AppText variant="h1" style={styles.summaryAmount}>
            {formatCurrency(totalPeriodPaise)}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.periodCountText}>
          {(expenses || []).length} {t.expenses.title.toLowerCase()}
        </AppText>
      </View>

      {/* 5. Expense List / States */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t.expenses.calculating}
          </AppText>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <AppText variant="h3" color={colors.danger} style={styles.stateTitle}>
            {t.expenses.loadError}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.stateSubtitle}>
            {(error as Error)?.message || 'Something went wrong.'}
          </AppText>
          <AppButton title={t.common.retry} variant="outline" onPress={() => refetch()} />
        </View>
      ) : (expenses || []).length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
          <AppText variant="bodyLargeBold" style={styles.stateTitle}>
            {t.expenses.noExpenses}
          </AppText>
          <AppButton
            title={t.expenses.createFirstExpense}
            variant="primary"
            onPress={openAddModal}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <AppCard style={styles.expenseCard}>
              <View style={styles.expenseCardRow}>
                {/* Date & Icon */}
                <View style={styles.expenseInfo}>
                  <View style={styles.calendarTag}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <AppText variant="bodyBold" style={{ marginLeft: 6 }}>
                      {item.expense_date}
                    </AppText>
                  </View>
                </View>

                {/* Amount */}
                <View style={styles.amountActionWrap}>
                  <AppText variant="h3" style={styles.expenseItemAmount}>
                    {formatCurrency(item.amount)}
                  </AppText>

                  {/* Actions: Edit / Delete */}
                  <View style={styles.cardActionButtons}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteExpense(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* 6. Add Expense Full-Screen Modal Popup */}
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
            <AppText variant="h3">{t.expenses.createExpenseTitle}</AppText>
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
              label={`${t.expenses.expenseDate} (YYYY-MM-DD) *`}
              placeholder="YYYY-MM-DD"
              value={expenseDate}
              onChangeText={setExpenseDate}
              error={formErrors.expense_date}
            />

            <AppTextInput
              label={`${t.expenses.amount} *`}
              placeholder={t.expenses.amountPlaceholder || 'e.g. 150'}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              error={formErrors.amount}
              autoFocus
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
                title={t.expenses.saveExpense}
                variant="primary"
                loading={createExpenseMutation.isPending}
                onPress={handleSaveExpense}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 7. Edit Expense Full-Screen Modal Popup */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        onRequestClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        statusBarTranslucent
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalHeader}>
            <AppText variant="h3">{t.expenses.editExpenseTitle}</AppText>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                setIsEditModalOpen(false);
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
              label={`${t.expenses.expenseDate} (YYYY-MM-DD) *`}
              placeholder="YYYY-MM-DD"
              value={expenseDate}
              onChangeText={setExpenseDate}
              error={formErrors.expense_date}
            />

            <AppTextInput
              label={`${t.expenses.amount} *`}
              placeholder={t.expenses.amountPlaceholder || 'e.g. 150'}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              error={formErrors.amount}
              autoFocus
            />

            <View style={styles.fullscreenModalActionRow}>
              <AppButton
                title={t.common.cancel}
                variant="outline"
                onPress={() => {
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                style={styles.modalBtn}
              />
              <AppButton
                title={t.expenses.updateExpense}
                variant="primary"
                loading={updateExpenseMutation.isPending}
                onPress={handleUpdateExpense}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 8. Custom Date Range Modal */}
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

        <View style={styles.customModalActionRow}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  hamburgerBtn: {
    padding: 2,
    marginRight: 4,
  },
  headerAddBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },

  // Date Filter Pills
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

  // Period Row
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

  // Summary Banner
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 4,
  },
  periodCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // List & Cards
  listContent: {
    paddingBottom: 120,
  },
  expenseCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  expenseCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseInfo: {
    flex: 1,
  },
  calendarTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  expenseItemAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Center States
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
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

  // Full-Screen Modal Styles
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
  customModalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
