import React from 'react';
import { View, StyleSheet } from 'react-native';
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

export default function CustomersScreen() {
  return (
    <AppScreenContainer
      scrollable
      header={
        <AppHeader
          title="Customers"
          subtitle="Customer ledger & bills"
          rightAction={<AppButton title="+ Add" size="sm" variant="accent" />}
        />
      }
    >
      <AppTextInput
        placeholder="Search customers by name or phone..."
        leftIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
      />

      <AppCard>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <AppText variant="h4" style={styles.emptyTitle}>
            No Customers Yet
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Customers will automatically be added when you create invoices for them.
          </AppText>
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
    marginBottom: spacing.md,
  },
});
