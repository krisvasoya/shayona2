import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './borderRadius';
import { spacing } from './spacing';
import { fontSize } from './typography';

export const inputStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48, // Standard touch target
  },
  inputWrapperFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBackground,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xxs,
    fontWeight: '500',
  },
  prefix: {
    marginRight: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  suffix: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
