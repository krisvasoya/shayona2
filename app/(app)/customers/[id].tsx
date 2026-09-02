import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
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
  useCustomerDetails,
  useUpdateCustomer,
  useDeleteCustomer,
  customerFormSchema,
} from '@/src/features/customers';
import { formatCurrency, formatPhoneDisplay } from '@/src/utils';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, isLoading, isError, error, refetch } = useCustomerDetails(id as string);
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openEditModal = () => {
    if (customer) {
      setEditName(customer.name);
      setEditPhone(customer.phone ? customer.phone.replace(/\D/g, '').slice(-10) : '');
      setEditAddress(customer.address || '');
      setFormErrors({});
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!customer) return;
    setFormErrors({});

    const parseResult = customerFormSchema.safeParse({
      name: editName,
      phone: editPhone || undefined,
      address: editAddress || undefined,
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

    const res = await updateCustomerMutation.mutateAsync({
      customerId: customer.id,
      data: {
        name: parseResult.data.name,
        phone: parseResult.data.phone,
        address: parseResult.data.address,
      },
    });

    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      setIsEditModalOpen(false);
      refetch();
    }
  };

  // Safe Delete Customer
  const handleDeleteCustomer = () => {
    if (!customer) return;

    if (customer.total_bills > 0) {
      Alert.alert(
        'Cannot Delete Customer',
        `This customer has ${customer.total_bills} recorded bill(s). Customer records cannot be deleted to preserve accounting and invoice history.`,
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Delete Customer',
      `Are you sure you want to permanently delete "${customer.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteCustomerMutation.mutateAsync(customer.id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete customer.');
            } else {
              router.back();
            }
          },
        },
      ],
    );
  };

  // Quick Communication Shortcuts
  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      const waUrl = `whatsapp://send?phone=${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}`;
      Linking.openURL(waUrl).catch(() => {
        Alert.alert('WhatsApp Not Installed', 'Could not open WhatsApp on this device.');
      });
    }
  };

  if (isLoading) {
    return (
      <AppScreenContainer edges={['top']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          Loading customer ledger...
        </AppText>
      </AppScreenContainer>
    );
  }

  if (isError || !customer) {
    return (
      <AppScreenContainer edges={['top']} style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <AppText variant="h3" color={colors.danger} style={{ marginTop: spacing.md }}>
          Customer Not Found
        </AppText>
        <AppText
          variant="body"
          color={colors.textSecondary}
          style={{ textAlign: 'center', marginVertical: spacing.sm }}
        >
          {(error as Error)?.message || 'Unable to retrieve customer details.'}
        </AppText>
        <AppButton title="Go Back" onPress={() => router.back()} style={{ minWidth: 140 }} />
      </AppScreenContainer>
    );
  }

  return (
    <AppScreenContainer edges={['top']} style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="h3" numberOfLines={1} style={styles.headerTitle}>
          {customer.name}
        </AppText>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openEditModal} style={styles.actionIconBtn}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteCustomer} style={styles.actionIconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Contact Information & Shortcuts */}
        <AppCard style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <AppText variant="caption" color={colors.textSecondary}>
                MOBILE NUMBER
              </AppText>
              <AppText variant="bodyLargeBold">
                {customer.phone ? formatPhoneDisplay(customer.phone) : 'No phone provided'}
              </AppText>

              {customer.address && (
                <>
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xs }}
                  >
                    ADDRESS / LOCATION
                  </AppText>
                  <AppText variant="body" color={colors.textPrimary}>
                    {customer.address}
                  </AppText>
                </>
              )}
            </View>

            {customer.phone && (
              <View style={styles.shortcutRow}>
                <TouchableOpacity
                  onPress={handleCall}
                  style={[styles.shortcutBtn, { backgroundColor: colors.primaryLight + '20' }]}
                >
                  <Ionicons name="call" size={20} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWhatsApp}
                  style={[styles.shortcutBtn, { backgroundColor: colors.jamaBackground }]}
                >
                  <Ionicons name="logo-whatsapp" size={20} color={colors.jama} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </AppCard>

        {/* Financial Ledger Summary */}
        <AppCard style={styles.ledgerCard}>
          <AppText variant="bodyLargeBold" style={styles.sectionTitle}>
            Account Ledger Summary
          </AppText>

          <View style={styles.ledgerGrid}>
            <View style={styles.ledgerItem}>
              <AppText variant="caption" color={colors.textSecondary}>
                TOTAL BILLS
              </AppText>
              <AppText variant="h3">{customer.total_bills}</AppText>
            </View>

            <View style={styles.ledgerItem}>
              <AppText variant="caption" color={colors.textSecondary}>
                TOTAL AMOUNT
              </AppText>
              <AppText variant="h3">{formatCurrency(customer.total_amount)}</AppText>
            </View>
          </View>

          <View style={styles.ledgerDivider} />

          <View style={styles.ledgerGrid}>
            <View style={styles.ledgerItem}>
              <AppText variant="caption" color={colors.textSecondary}>
                TOTAL JAMA (PAID)
              </AppText>
              <AppText variant="h3" color={colors.jama}>
                {formatCurrency(customer.total_jama)}
              </AppText>
            </View>

            <View style={styles.ledgerItem}>
              <AppText variant="caption" color={colors.textSecondary}>
                TOTAL BAKI (PENDING)
              </AppText>
              <AppText variant="h3" color={customer.total_baki > 0 ? colors.baki : colors.jama}>
                {formatCurrency(customer.total_baki)}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Create Invoice Action */}
        <AppButton
          title="+ Create Bill for Customer"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: '/(app)/invoices/create' as any,
              params: { partyType: 'CUSTOMER', partyId: customer.id, partyName: customer.name },
            })
          }
          style={styles.createBillBtn}
        />

        {/* Invoice History Section */}
        <View style={styles.historySectionHeader}>
          <AppText variant="h3">Bill History ({customer.invoices.length})</AppText>
        </View>

        {customer.invoices.length === 0 ? (
          <AppCard style={styles.emptyHistoryCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <AppText variant="bodyLargeBold" style={{ marginTop: spacing.sm }}>
              No bills created yet
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ textAlign: 'center', marginTop: 4 }}
            >
              Bills created for this customer will appear here with Jama and Baki tracking.
            </AppText>
          </AppCard>
        ) : (
          customer.invoices.map(inv => {
            const hasBaki = Number(inv.remaining_amount) > 0;
            const isPaid = Number(inv.remaining_amount) === 0;

            return (
              <TouchableOpacity
                key={inv.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/invoices/${inv.id}` as any)}
              >
                <AppCard style={styles.invoiceCard}>
                  <View style={styles.invoiceCardRow}>
                    <View>
                      <AppText variant="bodyLargeBold">Bill #{inv.invoice_number}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>
                        {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </AppText>
                    </View>

                    <View style={styles.invoiceAmountCol}>
                      <AppText variant="bodyLargeBold">
                        {formatCurrency(Number(inv.total_amount))}
                      </AppText>
                      <AppBadge
                        label={
                          isPaid
                            ? 'Fully Paid'
                            : `Baki: ${formatCurrency(Number(inv.remaining_amount))}`
                        }
                        variant={isPaid ? 'success' : hasBaki ? 'danger' : 'neutral'}
                      />
                    </View>
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Edit Customer Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Edit Customer</AppText>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppTextInput
                label="Customer Name *"
                placeholder="e.g. Ramesh Patel"
                value={editName}
                onChangeText={setEditName}
                error={formErrors.name}
              />

              <AppTextInput
                label="Mobile Number (Optional)"
                placeholder="10-digit mobile number"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                maxLength={10}
                error={formErrors.phone}
              />

              <AppTextInput
                label="Address / Area (Optional)"
                placeholder="Shop address, village, or area"
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
                numberOfLines={3}
                error={formErrors.address}
              />

              <View style={styles.modalActionRow}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsEditModalOpen(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Update Customer"
                  variant="primary"
                  loading={updateCustomerMutation.isPending}
                  onPress={handleUpdateCustomer}
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
    marginHorizontal: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIconBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  contactCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  ledgerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ledgerItem: {
    flex: 1,
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  createBillBtn: {
    marginBottom: spacing.lg,
  },
  historySectionHeader: {
    marginBottom: spacing.sm,
  },
  emptyHistoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  invoiceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  invoiceCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
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
