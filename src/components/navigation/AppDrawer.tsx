import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/common/AppText';
import { useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useAuth } from '@/src/features/auth';
import { useLanguage } from '@/src/localization';
import { formatPhoneDisplay } from '@/src/utils/phone';
import { useDrawer } from './DrawerContext';
import { useUpdateStore } from '@/src/services/update.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

export const AppDrawer: React.FC = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { isOpen, closeDrawer } = useDrawer();
  const isUpdateAvailable = useUpdateStore(state => state.isUpdateAvailable);

  const [animX] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [animOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, animX, animOpacity]);

  // Handle Android back button to dismiss drawer
  useEffect(() => {
    const onBackPress = () => {
      if (isOpen) {
        closeDrawer();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isOpen, closeDrawer]);

  const handleNavigate = (route: string) => {
    closeDrawer();
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  const handleLogout = () => {
    closeDrawer();
    Alert.alert(t.settings.confirmLogoutTitle, t.settings.confirmLogoutMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.signOut,
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!isOpen && (animOpacity as any)._value === 0) {
    return null;
  }

  const shopName = profile?.shop_name || 'Shayona Enterprise';
  const displayPhone = profile?.phone
    ? formatPhoneDisplay(profile.phone)
    : user?.phone
      ? formatPhoneDisplay(user.phone)
      : user?.email || null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.backdrop, { opacity: animOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Content */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { backgroundColor: colors.surface, transform: [{ translateX: animX }] },
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.surfaceSubtle }]}>
            <View style={styles.headerTop}>
              <View
                style={[
                  styles.logoBadge,
                  { backgroundColor: isDark ? colors.accent : colors.primary },
                ]}
              >
                <Ionicons name="receipt" size={24} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={closeDrawer}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <AppText variant="h3" numberOfLines={1} style={{ marginTop: spacing.xs }}>
              {shopName}
            </AppText>
            <AppText variant="captionBold" color={isDark ? colors.accentLight : colors.primary}>
              {t.nav.retailInvoice}
            </AppText>
            {displayPhone ? (
              <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                {displayPhone}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Primary Navigation */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/(tabs)')}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={colors.primary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.dashboard}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/(tabs)/invoices')}
            >
              <Ionicons
                name="receipt-outline"
                size={20}
                color={colors.primary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.invoices}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/(tabs)/customers')}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.customers}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/(tabs)/buyers')}
            >
              <Ionicons
                name="business-outline"
                size={20}
                color={colors.primary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.buyers}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/expenses')}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={colors.primary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.expenses}</AppText>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Secondary Functions: Settings, Language, Profile */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/settings')}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.menuIcon}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText variant="bodyMedium">{t.nav.settings}</AppText>
                {isUpdateAvailable && <View style={styles.redDot} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/settings')}
            >
              <Ionicons
                name="globe-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.language}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(app)/business-profile')}
            >
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.menuIcon}
              />
              <AppText variant="bodyMedium">{t.nav.shopProfile}</AppText>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Footer: Logout */}
          <View style={styles.footerSection}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.danger}
                style={styles.menuIcon}
              />
              <AppText variant="bodyLargeBold" color={colors.danger}>
                {t.nav.logout}
              </AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 998,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  divider: {
    height: 1,
  },
  menuSection: {
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  menuIcon: {
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  footerSection: {
    padding: spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
});
