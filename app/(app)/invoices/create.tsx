import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import {
  useCreateInvoice,
  useUpdateInvoice,
  useInvoiceDetails,
  useNextInvoiceNumber,
  invoiceFormSchema,
} from '@/src/features/invoices';
import { useCustomers } from '@/src/features/customers';
import { useBuyers } from '@/src/features/buyers';
import { useLanguage } from '@/src/localization';
import { PartyType } from '@/src/types/database';
import { formatCurrency, paiseToRupees } from '@/src/utils';

interface LineItemState {
  id: string;
  item_name: string;
  quantity: string;
  rate_rupees: string;
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    id?: string;
    partyType?: PartyType;
    partyId?: string;
    partyName?: string;
  }>();

  const isEditing = Boolean(params.id);

  // Existing invoice query for edit mode
  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoiceDetails(params.id || '');
  const { data: autoInvoiceNumber } = useNextInvoiceNumber();

  // Mutations
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();

  // Party data queries for selector modal
  const { data: customers } = useCustomers();
  const { data: buyers } = useBuyers();

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [partyType, setPartyType] = useState<PartyType>(params.partyType || 'CUSTOMER');
  const [partyId, setPartyId] = useState(params.partyId || '');
  const [partyName, setPartyName] = useState(params.partyName || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmountRupees, setPaidAmountRupees] = useState('');
  const [notes, setNotes] = useState('');

  // Line items state
  const [items, setItems] = useState<LineItemState[]>([
    { id: '1', item_name: '', quantity: '1', rate_rupees: '' },
  ]);

  // Modals & Errors
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize auto invoice number
  useEffect(() => {
    if (!isEditing && autoInvoiceNumber && !invoiceNumber) {
      setInvoiceNumber(autoInvoiceNumber);
    }
  }, [autoInvoiceNumber, isEditing, invoiceNumber]);

  // Populate data when editing existing invoice
  useEffect(() => {
    if (isEditing && existingInvoice) {
      setInvoiceNumber(existingInvoice.invoice_number);
      setPartyType(existingInvoice.party_type);
      setPartyId(existingInvoice.party_id);
      setPartyName(existingInvoice.party_name);
      setInvoiceDate(existingInvoice.invoice_date);
      setPaidAmountRupees(paiseToRupees(existingInvoice.paid_amount).toString());
      setNotes(existingInvoice.notes || '');

      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setItems(
          existingInvoice.items.map(item => ({
            id: item.id,
            item_name: item.item_name,
            quantity: item.quantity.toString(),
            rate_rupees: paiseToRupees(item.rate).toString(),
          })),
        );
      }
    }
  }, [isEditing, existingInvoice]);

  // Calculations
  const totalBillRupees = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate_rupees) || 0;
    return sum + qty * rate;
  }, 0);

  const parsedPaidRupees = parseFloat(paidAmountRupees) || 0;
  const remainingDueRupees = Math.max(0, totalBillRupees - parsedPaidRupees);

  // Line items management
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), item_name: '', quantity: '1', rate_rupees: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert(t.common.error, t.createInvoice.pleaseAddItems);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemState, value: string) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSetFullPaid = () => {
    setPaidAmountRupees(totalBillRupees.toFixed(2));
  };

  // Submit invoice
  const handleSaveInvoice = async () => {
    setFormErrors({});

    const formattedItems = items
      .filter(item => item.item_name.trim() !== '')
      .map(item => ({
        item_name: item.item_name.trim(),
        quantity: parseFloat(item.quantity) || 1,
        rate_rupees: parseFloat(item.rate_rupees) || 0,
      }));

    const parseResult = invoiceFormSchema.safeParse({
      invoice_number: invoiceNumber.trim(),
      party_type: partyType,
      party_id: partyId,
      party_name: partyName.trim(),
      invoice_date: invoiceDate.trim(),
      items: formattedItems,
      paid_amount_rupees: parsedPaidRupees,
      notes: notes.trim() || undefined,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      parseResult.error.errors.forEach(err => {
        if (err.path[0]) errMap[err.path[0] as string] = err.message;
      });
      setFormErrors(errMap);
      Alert.alert(
        t.createInvoice.validationError,
        parseResult.error.errors[0]?.message || 'Invalid form data.',
      );
      return;
    }

    if (parsedPaidRupees > totalBillRupees && totalBillRupees > 0) {
      Alert.alert(t.createInvoice.validationError, t.createInvoice.paidExceedsTotal);
      return;
    }

    if (isEditing && params.id) {
      const res = await updateInvoiceMutation.mutateAsync({
        invoiceId: params.id,
        data: parseResult.data,
      });

      if (res.data) {
        router.back();
      } else {
        Alert.alert(t.common.error, res.error || 'Failed to update invoice.');
      }
    } else {
      const res = await createInvoiceMutation.mutateAsync(parseResult.data);

      if (res.data) {
        router.replace(`/(app)/invoices/${res.data.id}` as any);
      } else {
        Alert.alert(t.common.error, res.error || 'Failed to create invoice.');
      }
    }
  };

  const availableParties = partyType === 'CUSTOMER' ? customers || [] : buyers || [];
  const filteredParties = availableParties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()),
  );

  if (isEditing && isLoadingInvoice) {
    return (
      <AppScreenContainer edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t.common.loading}
          </AppText>
        </View>
      </AppScreenContainer>
    );
  }

  return (
    <AppScreenContainer edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="h3" style={styles.headerTitle}>
          {isEditing ? t.createInvoice.titleEdit : t.createInvoice.titleNew}
        </AppText>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Bill Header & Party */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={styles.sectionHeader}>
            1. {t.createInvoice.partyDetails}
          </AppText>

          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <AppTextInput
                label={`${t.createInvoice.invoiceNumber} *`}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="e.g. INV-0001"
                error={formErrors.invoice_number}
                editable={!isEditing}
              />
            </View>

            <View style={{ flex: 1 }}>
              <AppTextInput
                label={`${t.createInvoice.invoiceDate} *`}
                value={invoiceDate}
                onChangeText={setInvoiceDate}
                placeholder="2026-09-02"
                error={formErrors.invoice_date}
              />
            </View>
          </View>

          {/* Party Type Toggle */}
          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={{ marginBottom: spacing.xs }}
          >
            {t.createInvoice.partyType.toUpperCase()} *
          </AppText>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, partyType === 'CUSTOMER' && styles.toggleBtnActive]}
              onPress={() => {
                if (partyType !== 'CUSTOMER') {
                  setPartyType('CUSTOMER');
                  setPartyId('');
                  setPartyName('');
                }
              }}
            >
              <AppText
                variant="bodyBold"
                color={partyType === 'CUSTOMER' ? colors.textInverse : colors.textSecondary}
              >
                {t.createInvoice.customer}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, partyType === 'BUYER' && styles.toggleBtnActive]}
              onPress={() => {
                if (partyType !== 'BUYER') {
                  setPartyType('BUYER');
                  setPartyId('');
                  setPartyName('');
                }
              }}
            >
              <AppText
                variant="bodyBold"
                color={partyType === 'BUYER' ? colors.textInverse : colors.textSecondary}
              >
                {t.createInvoice.buyer}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Select Party Field */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsPartyModalOpen(true)}
            style={styles.partySelectBtn}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.createInvoice.selectParty.toUpperCase()} ({partyType}) *
              </AppText>
              <AppText
                variant="bodyLargeBold"
                color={partyName ? colors.textPrimary : colors.textMuted}
              >
                {partyName || `${t.createInvoice.selectParty}...`}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {formErrors.party_id && (
            <AppText variant="caption" color={colors.danger} style={{ marginTop: 4 }}>
              {formErrors.party_id}
            </AppText>
          )}
        </AppCard>

        {/* Section 2: Line Items */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="bodyLargeBold" style={styles.sectionHeader}>
              2. {t.createInvoice.itemsTitle} ({items.length})
            </AppText>

            <AppButton
              title={t.createInvoice.addItem}
              variant="outline"
              onPress={handleAddItem}
              style={styles.smallAddBtn}
            />
          </View>

          {items.map((item, index) => {
            const itemQty = parseFloat(item.quantity) || 0;
            const itemRate = parseFloat(item.rate_rupees) || 0;
            const itemTotal = itemQty * itemRate;

            return (
              <View key={item.id} style={styles.itemBox}>
                <View style={styles.itemBoxHeader}>
                  <AppText variant="bodyBold" color={colors.primary}>
                    #{index + 1}
                  </AppText>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <AppTextInput
                  label={`${t.createInvoice.itemNamePlaceholder} *`}
                  placeholder="e.g. Cotton Fabric 40m"
                  value={item.item_name}
                  onChangeText={val => handleItemChange(index, 'item_name', val)}
                />

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label={`${t.createInvoice.qtyPlaceholder} *`}
                      placeholder="1"
                      value={item.quantity}
                      onChangeText={val => handleItemChange(index, 'quantity', val)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label={`${t.createInvoice.ratePlaceholder} *`}
                      placeholder="0.00"
                      value={item.rate_rupees}
                      onChangeText={val => handleItemChange(index, 'rate_rupees', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.itemTotalRow}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {t.createInvoice.amountCalculated}:
                  </AppText>
                  <AppText variant="bodyLargeBold">
                    {formatCurrency(Math.round(itemTotal * 100))}
                  </AppText>
                </View>
              </View>
            );
          })}
        </AppCard>

        {/* Section 3: Calculation & Payment (Jama/Baki) */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={styles.sectionHeader}>
            3. {t.createInvoice.paymentLedger}
          </AppText>

          <View style={styles.calcSummaryRow}>
            <AppText variant="bodyLargeBold">{t.createInvoice.totalBillAmount}</AppText>
            <AppText variant="h2" color={colors.primary}>
              {formatCurrency(Math.round(totalBillRupees * 100))}
            </AppText>
          </View>

          <View style={{ marginVertical: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <AppText variant="caption" color={colors.textSecondary}>
                {t.createInvoice.paidJama}
              </AppText>
              <TouchableOpacity onPress={handleSetFullPaid}>
                <AppText variant="caption" color={colors.textLink}>
                  {t.invoices.filterPaid} (100%)
                </AppText>
              </TouchableOpacity>
            </View>

            <AppTextInput
              placeholder="Enter received amount (₹)"
              value={paidAmountRupees}
              onChangeText={setPaidAmountRupees}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bakiBanner}>
            <View>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.createInvoice.remainingBaki}
              </AppText>
              <AppText variant="h3" color={remainingDueRupees > 0 ? colors.baki : colors.jama}>
                {formatCurrency(Math.round(remainingDueRupees * 100))}
              </AppText>
            </View>

            <AppBadge
              label={remainingDueRupees > 0 ? t.invoices.filterBaki : t.invoices.filterPaid}
              variant={remainingDueRupees > 0 ? 'danger' : 'success'}
            />
          </View>

          <AppTextInput
            label={t.createInvoice.notesOptional}
            placeholder={t.createInvoice.notesPlaceholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </AppCard>

        {/* Submit Action Button */}
        <AppButton
          title={isEditing ? t.createInvoice.updateBill : t.createInvoice.saveBill}
          variant="primary"
          loading={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
          onPress={handleSaveInvoice}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* Party Selection Modal */}
      <Modal
        visible={isPartyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPartyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">
                {t.createInvoice.selectParty} ({partyType})
              </AppText>
              <TouchableOpacity onPress={() => setIsPartyModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AppTextInput
              placeholder={`${t.createInvoice.selectParty}...`}
              value={partySearch}
              onChangeText={setPartySearch}
            />

            <FlatList
              data={filteredParties}
              keyExtractor={item => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.partyOptionItem}
                  onPress={() => {
                    setPartyId(item.id);
                    setPartyName(item.name);
                    setIsPartyModalOpen(false);
                  }}
                >
                  <View style={styles.partyOptionInfo}>
                    <AppText variant="bodyLargeBold">{item.name}</AppText>
                    {item.phone && (
                      <AppText variant="caption" color={colors.textSecondary}>
                        {item.phone}
                      </AppText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  smallAddBtn: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  partySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    marginTop: spacing.xs,
  },
  itemBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  itemBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  calcSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bakiBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  partyOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  partyOptionInfo: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
