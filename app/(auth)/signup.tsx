import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
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
import { useAuthStore } from '@/src/store/authStore';
import { signUpSchema } from '@/src/features/auth/validation';

export default function SignUpScreen() {
  const router = useRouter();
  const setSession = useAuthStore(state => state.setSession);

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    shopName?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const handleSignUp = async () => {
    setErrors({});

    const validation = signUpSchema.safeParse({
      shopName,
      phone,
      password,
      confirmPassword,
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
    const result = await authService.signUpWithPhone(shopName, phone, password);
    setLoading(false);

    if (result.error) {
      setErrors({ general: result.error });
      return;
    }

    if (result.user) {
      if (result.session) {
        setSession(result.session, result.profile);
        router.replace('/(app)/(tabs)');
      } else {
        // If Supabase phone confirmation/auto-confirm is enabled, redirect to login or dashboard
        router.replace('/(auth)/login');
      }
    }
  };

  return (
    <AppScreenContainer scrollable style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo-horizontal.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <AppText variant="h2" style={styles.title}>
              Create Account
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Start creating invoices in seconds
            </AppText>
          </View>

          {/* Sign Up Card */}
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

            {/* Shop Name */}
            <AppTextInput
              label="Shop Name"
              placeholder="e.g. ABC General Store"
              value={shopName}
              onChangeText={text => {
                setShopName(text);
                if (errors.shopName) setErrors(prev => ({ ...prev, shopName: undefined }));
              }}
              error={errors.shopName}
            />

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

            {/* Password */}
            <AppTextInput
              label="Password"
              placeholder="Create a password (min 6 chars)"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              error={errors.password}
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

            {/* Confirm Password */}
            <AppTextInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
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

            {/* Submit Button */}
            <AppButton
              title="Create Account"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleSignUp}
              style={styles.submitBtn}
            />
          </AppCard>

          {/* Already Have Account */}
          <View style={styles.footerRow}>
            <AppText variant="body" color={colors.textSecondary}>
              Already have an account?{' '}
            </AppText>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <AppText variant="bodyLargeBold" color={colors.accent}>
                Login
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
  submitBtn: {
    marginTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
