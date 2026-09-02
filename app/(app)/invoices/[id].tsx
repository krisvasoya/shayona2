import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppText,
  AppCard,
  AppBadge,
  AppButton,
  AppTextInput,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { supabase } from '@/src/services/supabase/client';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguage } from '@/src/localization';
import { InvoiceDetail } from '@/src/types/invoice';
import { DbInvoice, DbInvoiceItem, DbCustomer, DbBuyer, DbProfile } from '@/src/types/database';
import { formatCurrency, paiseToRupees } from '@/src/utils';
import { useDeleteInvoice, useRecordPayment, useInvoicePayments } from '@/src/features/invoices';
import { pdfService } from '@/src/services/pdf.service';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Phase 16 & 17: Payment & Payment History State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const profile = useAuthStore(state => state.profile);
  const deleteInvoiceMutation = useDeleteInvoice();
  const recordPaymentMutation = useRecordPayment();
  const { data: paymentHistory = [] } = useInvoicePayments((id as string) || '');

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        setError(null);

        // Fetch invoice
        const { data: inv, error: invErr } = await (supabase.from('invoices') as any)
          .select('*')
          .eq('id', id as string)
          .single();

        if (invErr || !inv) {
          setError(invErr?.message || 'Invoice not found.');
          setLoading(false);
          return;
        }

        const typedInv = inv as DbInvoice;

        // Fetch invoice line items
        const { data: items } = await (supabase.from('invoice_items') as any)
          .select('*')
          .eq('invoice_id', typedInv.id)
          .order('created_at', { ascending: true });

        // Fetch customer or buyer
        let partyName = 'Direct Party';
        if (typedInv.party_type === 'CUSTOMER' && typedInv.party_id) {
          const { data: cust } = await (supabase.from('customers') as any)
            .select('*')
            .eq('id', typedInv.party_id)
            .single();
          if (cust) {
            partyName = (cust as DbCustomer).name;
          }
        } else if (typedInv.party_type === 'BUYER' && typedInv.party_id) {
          const { data: buy } = await (supabase.from('buyers') as any)
            .select('*')
            .eq('id', typedInv.party_id)
            .single();
          if (buy) {
            partyName = (buy as DbBuyer).name;
          }
        }

        setInvoice({
          ...typedInv,
          items: (items as DbInvoiceItem[]) || [],
          party_name: partyName,
          items_count: (items as DbInvoiceItem[])?.length || 0,
        });
      } catch (err) {
        setError((err as Error).message || 'Failed to load invoice.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadInvoice();
    }
  }, [id]);

  const handleGenerateAndSharePdf = async (lang: 'en' | 'gu' = 'en') => {
    if (!invoice) return;

    try {
      setGeneratingPdf(true);

      const userProfile: DbProfile = (profile as DbProfile) || {
        id: invoice.user_id,
        name: 'Shop Owner',
        email: null,
        phone: null,
        shop_name: 'Shayona Enterprise',
        language: lang,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const pdfResult = await pdfService.createInvoicePdf({
        invoice,
        profile: userProfile,
        language: lang,
      });

      await pdfService.shareInvoicePdf(pdfResult.uri, invoice.invoice_number);
    } catch (err) {
      Alert.alert(
        t.common.error,
        (err as Error).message || 'Failed to generate or share PDF invoice.',
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;

    try {
      setGeneratingPdf(true);

      const userProfile: DbProfile = (profile as DbProfile) || {
        id: invoice.user_id,
        name: 'Shop Owner',
        email: null,
        phone: null,
        shop_name: 'Shayona Enterprise',
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const pdfResult = await pdfService.createInvoicePdf({
        invoice,
        profile: userProfile,
        language: 'en',
      });
      await pdfService.shareInvoiceViaWhatsApp(pdfResult.uri, invoice.invoice_number);
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to share invoice on WhatsApp.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintInvoice = async (lang: 'en' | 'gu' = 'en') => {
    if (!invoice) return;

    try {
      setPrinting(true);

      const userProfile: DbProfile = (profile as DbProfile) || {
        id: invoice.user_id,
        name: 'Shop Owner',
        email: null,
        phone: null,
        shop_name: 'Shayona Enterprise',
        language: lang,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await pdfService.printInvoice({
        invoice,
        profile: userProfile,
        language: lang,
      });
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to print invoice.');
    } finally {
      setPrinting(false);
    }
  };

  const handleDeleteInvoice = () => {
    if (!invoice) return;

    Alert.alert(t.invoices.deleteConfirmTitle, t.invoices.deleteConfirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.invoices.delete,
        style: 'destructive',
        onPress: async () => {
          const res = await deleteInvoiceMutation.mutateAsync(invoice.id);
          if (!res.success) {
            Alert.alert(t.common.error, res.error || 'Failed to delete invoice.');
          } else {
            router.replace('/(app)/(tabs)/invoices');
          }
        },
      },
    ]);
  };

  // Phase 16: Handle Save Payment
  const handleSavePayment = async () => {
    if (!invoice) return;

    const trimmed = paymentAmountInput.trim();
    const paymentNum = parseFloat(trimmed);

    if (!trimmed || isNaN(paymentNum) || paymentNum <= 0) {
      setPaymentError(t.invoices.mustBeGreaterThanZero || 'Payment must be greater than zero.');
      return;
    }

    const currentBakiRupees = paiseToRupees(Number(invoice.remaining_amount));
    if (paymentNum > currentBakiRupees) {
      setPaymentError(
        t.invoices.cannotExceedBaki || 'Payment cannot exceed remaining Baki amount.',
      );
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentError(null);

      const res = await recordPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        paymentRupees: paymentNum,
        paymentDate: paymentDateInput.trim() || undefined,
        notes: paymentNotesInput.trim() || undefined,
      });

      if (res.error || !res.data) {
        setPaymentError(res.error || 'Failed to record payment.');
        return;
      }

      setInvoice(res.data);
      setIsPaymentModalOpen(false);
      setPaymentAmountInput('');
      setPaymentDateInput('');
      setPaymentNotesInput('');

      Alert.alert(
        t.common.success || 'Success',
        t.invoices.paymentSuccess || 'Payment recorded successfully!',
      );
    } catch (err) {
      setPaymentError((err as Error).message || 'Failed to record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
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

  if (error || !invoice) {
    return (
      <AppScreenContainer edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <AppText variant="h3" color={colors.danger} style={{ marginVertical: spacing.sm }}>
            {t.common.error}
          </AppText>
          <AppText
            variant="body"
            color={colors.textSecondary}
            style={{ textAlign: 'center', marginBottom: spacing.md }}
          >
            {error || 'The requested invoice was not found.'}
          </AppText>
          <AppButton title={t.nav.back} variant="outline" onPress={() => router.back()} />
        </View>
      </AppScreenContainer>
    );
  }

  const isPaid = Number(invoice.remaining_amount) === 0;
  const hasBaki = Number(invoice.remaining_amount) > 0;

  return (
    <AppScreenContainer edges={['top', 'bottom']}>
      {/* Top Bar with Back, Title & Actions */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="h3" style={styles.headerTitle}>
          #{invoice.invoice_number}
        </AppText>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(app)/invoices/create' as any,
                params: { id: invoice.id },
              })
            }
            style={styles.actionIconBtn}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteInvoice} style={styles.actionIconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bill Metadata Card */}
        <AppCard style={styles.card}>
          <View style={styles.metaRow}>
            <View>
              <AppText variant="caption" color={colors.textSecondary}>
                {invoice.party_type === 'CUSTOMER' ? t.invoices.customerBill : t.invoices.buyerBill}
              </AppText>
              <AppText variant="bodyLargeBold">{invoice.party_name}</AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.createInvoice.invoiceDate.toUpperCase()}
              </AppText>
              <AppText variant="bodyBold">
                {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </AppText>
            </View>
          </View>

          <View
            style={{
              marginTop: spacing.sm,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <AppBadge
              label={
                invoice.party_type === 'CUSTOMER' ? t.invoices.customerBill : t.invoices.buyerBill
              }
              variant="neutral"
            />
            <AppBadge
              label={
                isPaid
                  ? t.invoices.fullyPaid
                  : hasBaki
                    ? `${t.invoices.filterBaki}: ${formatCurrency(Number(invoice.remaining_amount))}`
                    : t.invoices.unpaid
              }
              variant={isPaid ? 'success' : 'danger'}
            />
          </View>

          {invoice.notes && (
            <View
              style={{
                marginTop: spacing.sm,
                paddingTop: spacing.xs,
                borderTopWidth: 0.5,
                borderTopColor: colors.border,
              }}
            >
              <AppText variant="caption" color={colors.textSecondary}>
                {t.createInvoice.notesOptional.toUpperCase()}
              </AppText>
              <AppText variant="body" color={colors.textPrimary}>
                {invoice.notes}
              </AppText>
            </View>
          )}
        </AppCard>

        {/* Phase 9: PDF Delivery & Actions Card */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={{ marginBottom: spacing.sm }}>
            {t.invoices.invoiceActions}
          </AppText>

          {/* Share Actions (English & Gujarati) */}
          <View style={styles.pdfActionsRow}>
            <AppButton
              title="📄 Share PDF (English)"
              variant="primary"
              loading={generatingPdf}
              onPress={() => handleGenerateAndSharePdf('en')}
              style={{ flex: 1 }}
            />

            <AppButton
              title="ગુજરાતી PDF"
              variant="outline"
              loading={generatingPdf}
              onPress={() => handleGenerateAndSharePdf('gu')}
              style={{ minWidth: 120 }}
            />
          </View>

          {/* Direct Delivery Actions: WhatsApp & Print */}
          <View style={styles.deliveryActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={generatingPdf || printing}
              style={[styles.deliveryBtn, styles.whatsappBtn]}
              onPress={handleShareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <AppText variant="captionBold" color="#FFFFFF">
                WhatsApp
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={generatingPdf || printing}
              style={[styles.deliveryBtn, styles.printBtn]}
              onPress={() => handlePrintInvoice('en')}
            >
              <Ionicons name="print-outline" size={18} color={colors.textPrimary} />
              <AppText variant="captionBold" color={colors.textPrimary}>
                {printing ? t.common.loading : t.invoices.printBill}
              </AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Itemized Table */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={{ marginBottom: spacing.sm }}>
            {t.createInvoice.itemsTitle} ({invoice.items.length})
          </AppText>

          <View style={styles.tableHeader}>
            <AppText variant="caption" color={colors.textSecondary} style={{ flex: 2 }}>
              {t.invoices.item.toUpperCase()}
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ flex: 1, textAlign: 'center' }}
            >
              QTY
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ flex: 1, textAlign: 'right' }}
            >
              RATE
            </AppText>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ flex: 1, textAlign: 'right' }}
            >
              AMOUNT
            </AppText>
          </View>

          {invoice.items.length === 0 ? (
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ paddingVertical: spacing.sm }}
            >
              No items.
            </AppText>
          ) : (
            invoice.items.map(item => (
              <View key={item.id} style={styles.tableRow}>
                <AppText variant="body" style={{ flex: 2 }} numberOfLines={2}>
                  {item.item_name}
                </AppText>
                <AppText variant="body" style={{ flex: 1, textAlign: 'center' }}>
                  {item.quantity}
                </AppText>
                <AppText variant="body" style={{ flex: 1, textAlign: 'right' }}>
                  {formatCurrency(Number(item.rate))}
                </AppText>
                <AppText variant="bodyBold" style={{ flex: 1, textAlign: 'right' }}>
                  {formatCurrency(Number(item.amount))}
                </AppText>
              </View>
            ))
          )}
        </AppCard>

        {/* Calculation & Payment Breakdown Card */}
        <AppCard style={styles.card}>
          <View style={styles.calcRow}>
            <AppText variant="body" color={colors.textSecondary}>
              {t.invoices.totalAmount}
            </AppText>
            <AppText variant="bodyLargeBold">
              {formatCurrency(Number(invoice.total_amount))}
            </AppText>
          </View>

          <View style={styles.calcRow}>
            <AppText variant="body" color={colors.jama}>
              {t.invoices.paidAmount}
            </AppText>
            <AppText variant="bodyBold" color={colors.jama}>
              {formatCurrency(Number(invoice.paid_amount))}
            </AppText>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.calcRow}>
            <AppText variant="bodyLargeBold" color={hasBaki ? colors.baki : colors.textPrimary}>
              {t.invoices.remainingDue}
            </AppText>
            <AppText variant="h3" color={hasBaki ? colors.baki : colors.jama}>
              {formatCurrency(Number(invoice.remaining_amount))}
            </AppText>
          </View>

          {/* Phase 16: Payment Update Action Button */}
          {hasBaki ? (
            <AppButton
              title={t.invoices.addPayment || '+ Record Payment (Jama)'}
              variant="primary"
              onPress={() => {
                setPaymentAmountInput('');
                setPaymentDateInput(new Date().toISOString().split('T')[0]);
                setPaymentNotesInput('');
                setPaymentError(null);
                setIsPaymentModalOpen(true);
              }}
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <View style={styles.fullyPaidBadgeContainer}>
              <Ionicons name="checkmark-circle" size={18} color={colors.jama} />
              <AppText variant="captionBold" color={colors.jama} style={{ marginLeft: 6 }}>
                {t.invoices.alreadyFullyPaid || 'This invoice is already fully paid.'}
              </AppText>
            </View>
          )}
        </AppCard>

        {/* Phase 17: Payment History Card */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="time-outline"
                size={20}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <AppText variant="bodyLargeBold">
                {t.invoices.paymentHistory || 'Payment History'} ({paymentHistory.length})
              </AppText>
            </View>
          </View>

          {paymentHistory.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
              <AppText
                variant="body"
                color={colors.textSecondary}
                style={{ marginTop: 6, textAlign: 'center' }}
              >
                {t.invoices.noPayments || 'No payments recorded yet.'}
              </AppText>
            </View>
          ) : (
            paymentHistory.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.historyRow,
                  idx < paymentHistory.length - 1 && styles.historyRowBorder,
                ]}
              >
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <AppText variant="bodyBold" color={colors.textPrimary}>
                    {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    style={{ marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {p.notes || t.invoices.paymentReceived || 'Payment received'}
                  </AppText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="bodyLargeBold" color={colors.jama}>
                    +{formatCurrency(Number(p.amount))}
                  </AppText>
                  <View style={styles.receivedPill}>
                    <AppText variant="caption" color={colors.jama}>
                      ✓ {t.invoices.paymentReceived || 'Received'}
                    </AppText>
                  </View>
                </View>
              </View>
            ))
          )}
        </AppCard>
      </ScrollView>

      {/* Phase 16 & 17: Record Payment Modal */}
      <Modal
        visible={isPaymentModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!submittingPayment) setIsPaymentModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <AppText variant="h3">
                {t.invoices.recordPaymentTitle || 'Record Payment (Jama)'}
              </AppText>
              <TouchableOpacity
                disabled={submittingPayment}
                onPress={() => setIsPaymentModalOpen(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Financial Summary Strip */}
            <View style={styles.paymentSummaryCard}>
              <View style={styles.summaryItem}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t.invoices.totalAmount}
                </AppText>
                <AppText variant="bodyBold">{formatCurrency(Number(invoice.total_amount))}</AppText>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <AppText variant="caption" color={colors.jama}>
                  {t.dashboard.jamaReceived || 'Jama'}
                </AppText>
                <AppText variant="bodyBold" color={colors.jama}>
                  {formatCurrency(Number(invoice.paid_amount))}
                </AppText>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <AppText variant="caption" color={colors.baki}>
                  {t.dashboard.bakiPending || 'Baki'}
                </AppText>
                <AppText variant="bodyBold" color={colors.baki}>
                  {formatCurrency(Number(invoice.remaining_amount))}
                </AppText>
              </View>
            </View>

            {/* Payment Input */}
            <AppTextInput
              label={t.invoices.paymentAmount || 'Payment Received (₹) *'}
              placeholder="e.g. 10000"
              value={paymentAmountInput}
              onChangeText={text => {
                setPaymentAmountInput(text);
                if (paymentError) setPaymentError(null);
              }}
              keyboardType="decimal-pad"
              error={paymentError || undefined}
              autoFocus
            />

            {/* Quick Fill Button: Pay Full Baki */}
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={submittingPayment}
              style={styles.quickFillBtn}
              onPress={() => {
                setPaymentAmountInput(paiseToRupees(Number(invoice.remaining_amount)).toString());
                if (!paymentDateInput) {
                  setPaymentDateInput(new Date().toISOString().split('T')[0]);
                }
                setPaymentError(null);
              }}
            >
              <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
              <AppText variant="captionBold" color={colors.accent} style={{ marginLeft: 4 }}>
                {t.invoices.payFullBaki || 'Pay Full Baki'} (
                {formatCurrency(Number(invoice.remaining_amount))})
              </AppText>
            </TouchableOpacity>

            {/* Payment Date Input */}
            <AppTextInput
              label={t.invoices.paymentDate || 'Payment Date (YYYY-MM-DD)'}
              placeholder="YYYY-MM-DD"
              value={paymentDateInput}
              onChangeText={text => {
                setPaymentDateInput(text);
                if (paymentError) setPaymentError(null);
              }}
            />

            {/* Payment Notes Input */}
            <AppTextInput
              label={t.invoices.paymentNotes || 'Notes / Mode (Optional)'}
              placeholder={t.invoices.paymentNotesPlaceholder || 'e.g. Cash, UPI, Cheque...'}
              value={paymentNotesInput}
              onChangeText={text => setPaymentNotesInput(text)}
            />

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <AppButton
                title={t.common.cancel}
                variant="outline"
                style={{ flex: 1 }}
                disabled={submittingPayment}
                onPress={() => setIsPaymentModalOpen(false)}
              />
              <AppButton
                title={t.invoices.savePayment || 'Save Payment'}
                variant="primary"
                style={{ flex: 1 }}
                loading={submittingPayment}
                disabled={submittingPayment}
                onPress={handleSavePayment}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionIconBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  deliveryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deliveryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  printBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  fullyPaidBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.jamaBackground,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
  paymentSummaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  quickFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  receivedPill: {
    backgroundColor: colors.jamaBackground,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
});
