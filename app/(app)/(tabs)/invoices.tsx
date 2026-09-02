import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

export default function InvoicesScreen() {
  const router = useRouter();

  return (
    <AppScreenContainer
      scrollable
      header={
        <AppHeader
          title="Invoices"
          subtitle="All generated bills"
          rightAction={
            <AppButton
              title="+ New"
              size="sm"
              variant="accent"
              onPress={() => router.push('/(app)/invoices/create')}
            />
          }
        />
      }
    >
      <AppTextInput
        placeholder="Search by invoice number or party name..."
        leftIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
      />

      <AppCard>
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          <AppText variant="h4" style={styles.emptyTitle}>
            No Invoices Found
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Create your first invoice to generate and share bills.
          </AppText>
          <AppButton
            title="Create Invoice"
            variant="primary"
            onPress={() => router.push('/(app)/invoices/create')}
          />
        </View>
      </AppCard>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
