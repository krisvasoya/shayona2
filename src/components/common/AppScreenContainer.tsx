import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { useNetworkStore } from '@/src/services/network.service';
import { useLanguage } from '@/src/localization';
import { AppText } from './AppText';

export interface AppScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: NativeSafeAreaViewProps['edges'];
  disableDefaultPadding?: boolean;
}

export const AppScreenContainer: React.FC<AppScreenContainerProps> = ({
  children,
  scrollable = false,
  header,
  style,
  contentContainerStyle,
  backgroundColor,
  edges = ['top'],
  disableDefaultPadding = false,
}) => {
  const { colors, isDark } = useTheme();
  const isOnline = useNetworkStore(state => state.isOnline);
  const { t } = useLanguage();

  const containerBg = backgroundColor || colors.background;

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: containerBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? colors.surface : undefined}
      />
      {!isOnline && (
        <View
          style={[
            styles.offlineBanner,
            {
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
              borderBottomColor: isDark ? 'rgba(217, 119, 6, 0.4)' : '#FDE68A',
            },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color={isDark ? colors.warning : '#92400E'}
          />
          <AppText
            variant="caption"
            style={[styles.offlineText, { color: isDark ? colors.warning : '#92400E' }]}
          >
            {t.common.offlineMode}
          </AppText>
        </View>
      )}
      {header}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={[styles.container, style]}
            contentContainerStyle={[
              styles.scrollContent,
              disableDefaultPadding && styles.noPadding,
              contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[styles.container, !disableDefaultPadding && styles.nonScrollContent, style]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    gap: 6,
    borderBottomWidth: 1,
  },
  offlineText: {
    fontWeight: '600',
    fontSize: 11,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100, // Safe clearance for bottom tab bar
    flexGrow: 1,
  },
  noPadding: {
    padding: 0,
    paddingBottom: 0,
  },
  nonScrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
});
