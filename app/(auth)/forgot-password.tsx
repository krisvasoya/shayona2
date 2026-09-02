import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppText,
  AppButton,
  AppCard,
  AppTextInput,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { authService } from '@/src/services/auth.service';
import { forgotPasswordRequestSchema, resetPasswordSchema } from '@/src/features/auth/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    otp?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    general?: string;
  }>({});

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const handleRequestOtp = async () => {
    setErrors({});

    const validation = forgotPasswordRequestSchema.safeParse({ phone });
    if (!validation.success) {
      setErrors({ phone: validation.error.issues[0]?.message });
      return;
    }

    setLoading(true);
    const res = await authService.requestPasswordResetOtp(phone);
    setLoading(false);

    if (!res.success && res.error) {
      setErrors({ general: res.error });
      return;
    }

    // Move to verification step
    setStep('verify');
    Alert.alert(
      'Verification Code Sent',
      `If an account exists for +91 ${phone}, an OTP code has been sent.`,
    );
  };

  const handleResetPassword = async () => {
    setErrors({});

    const validation = resetPasswordSchema.safeParse({
      phone,
      otp,
      newPassword,
      confirmNewPassword,
    });

    if (!validation.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof typeof errors;
        if (field) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const res = await authService.verifyOtpAndResetPassword(phone, otp, newPassword);
    setLoading(false);

    if (!res.success && res.error) {
      setErrors({ general: res.error });
      return;
    }

    Alert.alert(
      'Password Updated',
      'Your password has been reset successfully. Please login with your new password.',
      [
        {
          text: 'Login',
          onPress: () => router.replace('/(auth)/login'),
        },
      ],
    );
  };

  return (
    <AppScreenContainer scrollable style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo-horizontal.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <AppText variant="h2" style={styles.title}>
              Reset Password
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your mobile number to receive a verification code'
                : `Enter the verification code sent to +91 ${phone}`}
            </AppText>
          </View>

          {/* Form Card */}
          <AppCard style={styles.card}>
            {errors.general ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <AppText
                  variant="captionMedium"
                  color={colors.danger}
                  style={styles.errorBannerText}
                >
                  {errors.general}
                </AppText>
              </View>
            ) : null}

            {step === 'request' ? (
              <>
                {/* Mobile Number */}
                <AppTextInput
                  label="Mobile Number"
                  placeholder="98765 43210"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.phone}
                  leftIcon={
                    <AppText variant="bodyLargeBold" color={colors.textPrimary}>
                      +91
                    </AppText>
                  }
                />

                <AppButton
                  title="Send Verification Code"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  onPress={handleRequestOtp}
                  style={styles.actionBtn}
                />
              </>
            ) : (
              <>
                {/* OTP Input */}
                <AppTextInput
                  label="Verification Code (OTP)"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChangeText={text => {
                    setOtp(text);
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: undefined }));
                  }}
                  keyboardType="numeric"
                  maxLength={8}
                  error={errors.otp}
                />

                {/* New Password */}
                <AppTextInput
                  label="New Password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChangeText={text => {
                    setNewPassword(text);
                    if (errors.newPassword)
                      setErrors(prev => ({ ...prev, newPassword: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  error={errors.newPassword}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(prev => !prev)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  }
                />

                {/* Confirm New Password */}
                <AppTextInput
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChangeText={text => {
                    setConfirmNewPassword(text);
                    if (errors.confirmNewPassword)
                      setErrors(prev => ({ ...prev, confirmNewPassword: undefined }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmNewPassword}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(prev => !prev)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  }
                />

                <AppButton
                  title="Update Password"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  onPress={handleResetPassword}
                  style={styles.actionBtn}
                />

                <AppButton
                  title="Change Mobile Number"
                  variant="ghost"
                  fullWidth
                  onPress={() => {
                    setStep('request');
                    setErrors({});
                  }}
                />
              </>
            )}
          </AppCard>

          {/* Back to Login */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <AppText variant="bodyLargeBold" color={colors.accent}>
                ← Back to Login
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    padding: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  actionBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
