import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/src/theme';
import { borderRadius } from '@/src/theme/borderRadius';
import { spacing } from '@/src/theme/spacing';
import { fontSize } from '@/src/theme/typography';

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  disabled = false,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const wrapperStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: disabled ? colors.surfaceSubtle : colors.surface,
    borderWidth: 1.5,
    borderColor: error
      ? colors.danger
      : isFocused
        ? colors.accent
        : colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    opacity: disabled ? 0.7 : 1,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText
          style={[
            styles.label,
            { color: colors.textSecondary },
          ]}
        >
          {label}
        </AppText>
      ) : null}
      <View style={wrapperStyle}>
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          editable={!disabled}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.textPrimary },
            inputStyle,
          ]}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <AppText style={[styles.errorText, { color: colors.danger }]}>{error}</AppText>
      ) : helperText ? (
        <AppText style={[styles.helperText, { color: colors.textMuted }]}>{helperText}</AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
    fontWeight: '500',
  },
});
