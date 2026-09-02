import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreenContainer, AppText, AppButton, AppCard } from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();

  const handleContinue = () => {
    // Placeholder navigation to main app
    router.replace('/(app)/(tabs)');
  };

  return (
    <AppScreenContainer style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo-horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText variant="h3" style={styles.tagline}>
            Retail Invoice & Bill Maker
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtext}>
            Simple, fast & reliable billing for your business
          </AppText>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="h4" style={styles.cardTitle}>
            Welcome
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.cardSubtitle}>
            Sign in with your Google account to access invoices, customers, and payment records.
          </AppText>

          <AppButton
            title="Sign In with Google"
            variant="primary"
            fullWidth
            onPress={handleContinue}
            style={styles.googleButton}
          />

          <AppButton
            title="Enter Demo / Preview"
            variant="secondary"
            fullWidth
            onPress={handleContinue}
          />
        </AppCard>

        <View style={styles.footer}>
          <AppText variant="caption" color={colors.textMuted} style={styles.footerText}>
            Shayona Invoice • English & ગુજરાતી
          </AppText>
        </View>
      </View>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 240,
    height: 70,
    marginBottom: spacing.md,
  },
  tagline: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtext: {
    textAlign: 'center',
  },
  card: {
    padding: spacing.xl,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    marginBottom: spacing.xl,
  },
  googleButton: {
    marginBottom: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
