import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
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
}

export const AppScreenContainer: React.FC<AppScreenContainerProps> = ({
  children,
  scrollable = false,
  header,
  style,
  contentContainerStyle,
  backgroundColor = colors.background,
  edges = ['top'],
}) => {
  const isOnline = useNetworkStore(state => state.isOnline);
  const { t } = useLanguage();

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? colors.surface : undefined}
      />
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
          <AppText variant="caption" style={styles.offlineText}>
            {t.common.offlineMode}
          </AppText>
        </View>
      )}
      {header}
      {scrollable ? (
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, styles.nonScrollContent, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: {
    color: '#92400E',
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
  nonScrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
});
