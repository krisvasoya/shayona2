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
      setPaidAmountRupees(String(paiseToRupees(Number(existingInvoice.paid_amount))));
      setNotes(existingInvoice.notes || '');

      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setItems(
          existingInvoice.items.map((it, index) => ({
            id: String(index + 1),
            item_name: it.item_name,
            quantity: String(it.quantity),
            rate_rupees: String(paiseToRupees(Number(it.rate))),
          })),
        );
      }
    }
  }, [isEditing, existingInvoice]);

  // Line item helpers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(Date.now()), item_name: '', quantity: '1', rate_rupees: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one line item is required on the bill.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemState, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Real-time calculations (in Rupees)
  const totalBillRupees = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rate_rupees) || 0;
    return sum + qty * rate;
  }, 0);

  const numericPaidRupees = parseFloat(paidAmountRupees) || 0;
  const remainingDueRupees = Math.max(0, totalBillRupees - numericPaidRupees);

  // Quick action: Set full paid
  const handleSetFullPaid = () => {
    setPaidAmountRupees(String(totalBillRupees.toFixed(2)));
  };

  // Submit invoice
  const handleSaveInvoice = async () => {
    setFormErrors({});

    const formattedItems = items.map(it => ({
      item_name: it.item_name.trim(),
      quantity: parseFloat(it.quantity) || 0,
      rate_rupees: parseFloat(it.rate_rupees) || 0,
    }));

    const parseResult = invoiceFormSchema.safeParse({
      invoice_number: invoiceNumber,
      party_type: partyType,
      party_id: partyId,
      party_name: partyName,
      invoice_date: invoiceDate,
      items: formattedItems,
      paid_amount_rupees: numericPaidRupees,
      notes: notes || undefined,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      parseResult.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        errMap[path] = issue.message;
      });
      setFormErrors(errMap);
      Alert.alert(
        'Validation Error',
        parseResult.error.issues[0]?.message || 'Please check the form inputs.',
      );
      return;
    }

    if (isEditing && params.id) {
      const res = await updateInvoiceMutation.mutateAsync({
        invoiceId: params.id,
        data: parseResult.data,
      });

      if (res.error) {
        Alert.alert('Error', res.error);
      } else {
        Alert.alert('Success', 'Invoice updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } else {
      const res = await createInvoiceMutation.mutateAsync(parseResult.data);

      if (res.error) {
        Alert.alert('Error', res.error);
      } else {
        Alert.alert('Success', `Invoice #${invoiceNumber} created successfully.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    }
  };

  // Party selector list
  const partyList = partyType === 'CUSTOMER' ? customers || [] : buyers || [];
  const filteredParties = partyList.filter(
    p =>
      p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
      (p.phone && p.phone.includes(partySearch)),
  );

  if (isEditing && isLoadingInvoice) {
    return (
      <AppScreenContainer edges={['top']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          Loading invoice details...
        </AppText>
      </AppScreenContainer>
    );
  }

  return (
    <AppScreenContainer edges={['top']} style={styles.container}>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="h3" style={styles.headerTitle}>
          {isEditing ? `Edit Bill #${invoiceNumber}` : 'Create New Bill'}
        </AppText>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Bill Header & Party */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={styles.sectionHeader}>
            1. Bill & Party Details
          </AppText>

          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <AppTextInput
                label="Invoice Number *"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="e.g. INV-0001"
                error={formErrors.invoice_number}
                editable={!isEditing}
              />
            </View>

            <View style={{ flex: 1 }}>
              <AppTextInput
                label="Bill Date (YYYY-MM-DD) *"
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
            PARTY TYPE *
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
                Customer (Grahak)
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
                Buyer (Vyapari)
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
                SELECT {partyType} *
              </AppText>
              <AppText
                variant="bodyLargeBold"
                color={partyName ? colors.textPrimary : colors.textMuted}
              >
                {partyName || `Tap to choose ${partyType.toLowerCase()}...`}
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
              2. Items / Products ({items.length})
            </AppText>

            <AppButton
              title="+ Add Item"
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
                    Item #{index + 1}
                  </AppText>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <AppTextInput
                  label="Item Name / Description *"
                  placeholder="e.g. Cotton Shirt Material"
                  value={item.item_name}
                  onChangeText={val => handleItemChange(index, 'item_name', val)}
                />

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label="Quantity *"
                      placeholder="1"
                      value={item.quantity}
                      onChangeText={val => handleItemChange(index, 'quantity', val)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppTextInput
                      label="Rate (₹) *"
                      placeholder="0.00"
                      value={item.rate_rupees}
                      onChangeText={val => handleItemChange(index, 'rate_rupees', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.itemTotalRow}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Item Subtotal:
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
            3. Payment & Ledger
          </AppText>

          <View style={styles.calcSummaryRow}>
            <AppText variant="bodyLargeBold">Total Bill Amount</AppText>
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
                PAID AMOUNT / JAMA (₹)
              </AppText>
              <TouchableOpacity onPress={handleSetFullPaid}>
                <AppText variant="caption" color={colors.textLink}>
                  Set Full Paid
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
                REMAINING BALANCE (BAKI)
              </AppText>
              <AppText variant="h3" color={remainingDueRupees > 0 ? colors.baki : colors.jama}>
                {formatCurrency(Math.round(remainingDueRupees * 100))}
              </AppText>
            </View>

            <AppBadge
              label={remainingDueRupees > 0 ? 'PENDING BAKI' : 'FULLY PAID'}
              variant={remainingDueRupees > 0 ? 'danger' : 'success'}
            />
          </View>

          <AppTextInput
            label="Notes / Terms (Optional)"
            placeholder="e.g. Payment due in 15 days"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </AppCard>

        {/* Submit Action Button */}
        <AppButton
          title={isEditing ? 'Update Invoice' : 'Save & Create Invoice'}
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
              <AppText variant="h3">Select {partyType}</AppText>
              <TouchableOpacity onPress={() => setIsPartyModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AppTextInput
              placeholder={`Search ${partyType.toLowerCase()} by name or phone...`}
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
              ListEmptyComponent={
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <AppText variant="body" color={colors.textSecondary}>
                    No {partyType.toLowerCase()} records found.
                  </AppText>
                </View>
              }
            />
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
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
    marginBottom: spacing.sm,
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
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  partySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  calcSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bakiBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
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
    borderBottomColor: colors.border,
  },
  partyOptionInfo: {
    flex: 1,
  },
});
