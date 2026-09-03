import React from 'react';
import { Platform, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { useLanguage } from '@/src/localization';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';

export default function TabLayout() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Dynamic safe area calculation preserving bottom navigation clearance
  const bottomInset = insets.bottom;
  const bottomPadding = bottomInset > 0 ? bottomInset : Platform.OS === 'android' ? 8 : 6;
  const tabHeight = 54 + bottomPadding;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: isDark ? colors.accent : colors.primary,
          tabBarInactiveTintColor: isDark ? colors.textSecondary : colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.nav.dashboard,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name="grid-outline"
                size={size}
                color={
                  focused
                    ? isDark
                      ? colors.accent
                      : colors.primary
                    : isDark
                      ? colors.textTertiary
                      : color
                }
              />
            ),
          }}
        />
        <Tabs.Screen
          name="invoices"
          options={{
            title: t.nav.invoices,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name="receipt-outline"
                size={size}
                color={
                  focused
                    ? isDark
                      ? colors.accent
                      : colors.primary
                    : isDark
                      ? colors.textTertiary
                      : color
                }
              />
            ),
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: t.nav.customers,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name="people-outline"
                size={size}
                color={
                  focused
                    ? isDark
                      ? colors.accent
                      : colors.primary
                    : isDark
                      ? colors.textTertiary
                      : color
                }
              />
            ),
          }}
        />
        <Tabs.Screen
          name="buyers"
          options={{
            title: t.nav.buyers,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name="briefcase-outline"
                size={size}
                color={
                  focused
                    ? isDark
                      ? colors.accent
                      : colors.primary
                    : isDark
                      ? colors.textTertiary
                      : color
                }
              />
            ),
          }}
        />
      </Tabs>

      {/* Safe-area aware Floating Settings button */}
      <TouchableOpacity
        style={[
          styles.floatingSettingsBtn,
          {
            bottom: tabHeight + spacing.md, // Clearly positioned above bottom navigation height + safe area + margin
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => router.push('/(app)/settings' as any)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t.nav.settings}
      >
        <Ionicons
          name="settings-outline"
          size={22}
          color={isDark ? colors.accent : colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
