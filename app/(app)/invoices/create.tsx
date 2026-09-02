import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppButton,
  AppTextInput,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function CreateInvoiceScreen() {
  const router = useRouter();

  return (
    <AppScreenContainer
      scrollable
      header={
        <AppHeader
          title="Create Invoice"
          subtitle="New Bill / Receipt"
          showBack
          onBack={() => router.back()}
        />
      }
    >
      <AppCard>
        <AppText variant="h4" style={styles.sectionHeader}>
          Party Information
        </AppText>
        <AppTextInput
          label="Party Name (Customer / Buyer)"
          placeholder="Enter customer or buyer name"
        />
        <AppTextInput
          label="Phone Number"
          placeholder="Enter mobile number"
          keyboardType="phone-pad"
        />
      </AppCard>

      <AppCard>
        <AppText variant="h4" style={styles.sectionHeader}>
          Invoice Items
        </AppText>
        <AppTextInput label="Item Description" placeholder="e.g. Cotton Shirt / Goods" />
        <View style={styles.row}>
          <View style={styles.halfCol}>
            <AppTextInput label="Qty" placeholder="1" keyboardType="numeric" />
          </View>
          <View style={styles.halfCol}>
            <AppTextInput label="Rate (₹)" placeholder="0.00" keyboardType="numeric" />
          </View>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="h4" style={styles.sectionHeader}>
          Payment Summary
        </AppText>
        <AppTextInput
          label="Received Amount / Jama (₹)"
          placeholder="0.00"
          keyboardType="numeric"
        />
        <View style={styles.summaryRow}>
          <AppText variant="bodyLargeBold">Total Bill Amount:</AppText>
          <AppText variant="bodyLargeBold" color={colors.primary}>
            ₹0.00
          </AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="bodyMedium" color={colors.baki}>
            Remaining / Baki:
          </AppText>
          <AppText variant="bodyLargeBold" color={colors.baki}>
            ₹0.00
          </AppText>
        </View>
      </AppCard>

      <View style={styles.actionButtons}>
        <AppButton
          title="Save & Generate Bill"
          variant="primary"
          fullWidth
          onPress={() => router.back()}
          style={styles.saveBtn}
        />
        <AppButton title="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  actionButtons: {
    marginVertical: spacing.lg,
    gap: spacing.xs,
  },
  saveBtn: {
    marginBottom: spacing.xs,
  },
});
