import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { AppText } from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AppText variant="h3" style={styles.title}>
          This screen does not exist.
        </AppText>
        <Link href="/" style={styles.link}>
          <AppText variant="bodyLargeBold" color={colors.accent}>
            Go to home screen
          </AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  link: {
    paddingVertical: spacing.md,
  },
});
