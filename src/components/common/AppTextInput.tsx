import React, { useState } from 'react';
import { View, TextInput, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@/src/theme/colors';
import { inputStyles } from '@/src/theme/inputStyles';

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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label ? <AppText style={inputStyles.label}>{label}</AppText> : null}
      <View
        style={[
          inputStyles.inputWrapper,
          isFocused && inputStyles.inputWrapperFocused,
          !!error && inputStyles.inputWrapperError,
          disabled && inputStyles.inputWrapperDisabled,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          editable={!disabled}
          placeholderTextColor={colors.textMuted}
          style={[inputStyles.input, inputStyle]}
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
        <AppText style={inputStyles.errorText}>{error}</AppText>
      ) : helperText ? (
        <AppText style={inputStyles.helperText}>{helperText}</AppText>
      ) : null}
    </View>
  );
};
