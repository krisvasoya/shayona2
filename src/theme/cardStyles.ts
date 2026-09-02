import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './borderRadius';
import { spacing } from './spacing';
import { shadows } from './shadows';

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    ...shadows.md,
    marginBottom: spacing.md,
  },
  cardFlat: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  // Metric / Stat cards for Dashboard (Jama, Baki, Total)
  metricCardJama: {
    backgroundColor: colors.jamaBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: '#A7F3D0', // Emerald 200
    ...shadows.sm,
  },
  metricCardBaki: {
    backgroundColor: colors.bakiBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: '#FECACA', // Red 200
    ...shadows.sm,
  },
  metricCardNeutral: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
});
