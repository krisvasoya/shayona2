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
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

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
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? colors.surface : undefined}
      />
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
