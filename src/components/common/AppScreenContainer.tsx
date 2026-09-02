import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export interface AppScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const AppScreenContainer: React.FC<AppScreenContainerProps> = ({
  children,
  scrollable = false,
  header,
  style,
  contentContainerStyle,
  backgroundColor = colors.background,
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
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
    flexGrow: 1,
  },
  nonScrollContent: {
    padding: spacing.screenPadding,
  },
});
