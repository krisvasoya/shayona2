import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenContainer, AppText, AppCard, AppBadge, AppButton } from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { supabase } from '@/src/services/supabase/client';
import { useAuthStore } from '@/src/store/authStore';
import { InvoiceDetail } from '@/src/types/invoice';
import { DbInvoice, DbInvoiceItem, DbCustomer, DbBuyer, DbProfile } from '@/src/types/database';
import { formatCurrency } from '@/src/utils';
import { useDeleteInvoice } from '@/src/features/invoices';
import { pdfService } from '@/src/services/pdf.service';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  const profile = useAuthStore(state => state.profile);
  const deleteInvoiceMutation = useDeleteInvoice();

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

      let pdfResult: { uri: string };
      try {
        pdfResult = await pdfService.createInvoicePdf({
          invoice,
          profile: userProfile,
          language: lang,
        });
      } catch (genErr) {
        Alert.alert(
          'PDF Generation Error',
          (genErr as Error).message || 'Unable to generate invoice PDF.',
        );
        return;
      }

      try {
        await pdfService.shareInvoicePdf(pdfResult.uri, invoice.invoice_number);
      } catch (shareErr) {
        Alert.alert(
          'PDF Sharing Error',
          (shareErr as Error).message || 'Unable to open system share menu.',
        );
      }
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

      let pdfResult: { uri: string };
      try {
        pdfResult = await pdfService.createInvoicePdf({
          invoice,
          profile: userProfile,
          language: 'en',
        });
      } catch (genErr) {
        Alert.alert(
          'PDF Generation Error',
          (genErr as Error).message || 'Unable to generate invoice PDF.',
        );
        return;
      }

      const isInstalled = await pdfService.isWhatsAppInstalled();
      if (!isInstalled) {
        Alert.alert(
          'WhatsApp Not Available',
          'WhatsApp is not installed on this device. Would you like to use the device share menu instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share PDF',
              onPress: () => pdfService.shareInvoicePdf(pdfResult.uri, invoice.invoice_number),
            },
          ],
        );
        return;
      }

      try {
        await pdfService.shareInvoiceViaWhatsApp(pdfResult.uri, invoice.invoice_number);
      } catch (shareErr) {
        Alert.alert(
          'WhatsApp Share Error',
          (shareErr as Error).message || 'Unable to share via WhatsApp. Please try standard share.',
        );
      }
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
    } catch (printErr) {
      Alert.alert(
        'Printing Error',
        (printErr as Error).message ||
          'Unable to start printing. Please check your printer settings.',
      );
    } finally {
      setPrinting(false);
    }
  };

  const handleDeleteInvoice = () => {
    if (!invoice) return;

    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete Bill #${invoice.invoice_number}? This will remove the bill from ledger records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteInvoiceMutation.mutateAsync(invoice.id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete invoice.');
            } else {
              router.replace('/(app)/(tabs)/invoices');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <AppScreenContainer edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            Loading invoice details...
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
            Error Loading Invoice
          </AppText>
          <AppText
            variant="body"
            color={colors.textSecondary}
            style={{ textAlign: 'center', marginBottom: spacing.md }}
          >
            {error || 'The requested invoice was not found.'}
          </AppText>
          <AppButton title="Go Back" variant="outline" onPress={() => router.back()} />
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
          Bill #{invoice.invoice_number}
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
                BILLED TO ({invoice.party_type})
              </AppText>
              <AppText variant="bodyLargeBold">{invoice.party_name}</AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color={colors.textSecondary}>
                BILL DATE
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
              label={invoice.party_type === 'CUSTOMER' ? 'Customer Bill' : 'Wholesale Buyer Bill'}
              variant="neutral"
            />
            <AppBadge
              label={isPaid ? 'FULLY PAID' : hasBaki ? 'PENDING BAKI' : 'UNPAID'}
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
                NOTES
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
            Invoice Actions
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
                {printing ? 'Preparing Print...' : 'Print Bill'}
              </AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Itemized Table */}
        <AppCard style={styles.card}>
          <AppText variant="bodyLargeBold" style={{ marginBottom: spacing.sm }}>
            Itemized Bill ({invoice.items.length})
          </AppText>

          <View style={styles.tableHeader}>
            <AppText variant="caption" color={colors.textSecondary} style={{ flex: 2 }}>
              ITEM
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
              No item details recorded.
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

        {/* Calculation & Payment Breakdown */}
        <AppCard style={styles.card}>
          <View style={styles.calcRow}>
            <AppText variant="body" color={colors.textSecondary}>
              Total Amount
            </AppText>
            <AppText variant="bodyLargeBold">
              {formatCurrency(Number(invoice.total_amount))}
            </AppText>
          </View>

          <View style={styles.calcRow}>
            <AppText variant="body" color={colors.jama}>
              Paid Amount (Jama)
            </AppText>
            <AppText variant="bodyBold" color={colors.jama}>
              {formatCurrency(Number(invoice.paid_amount))}
            </AppText>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.calcRow}>
            <AppText variant="bodyLargeBold" color={hasBaki ? colors.baki : colors.textPrimary}>
              Remaining Due (Baki)
            </AppText>
            <AppText variant="h3" color={hasBaki ? colors.baki : colors.jama}>
              {formatCurrency(Number(invoice.remaining_amount))}
            </AppText>
          </View>
        </AppCard>
      </ScrollView>
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
    gap: 6,
    paddingVertical: 10,
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
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
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
    marginVertical: 4,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
