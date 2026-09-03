import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { AppText } from './AppText';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
  maxHeight?: number | string;
}

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onClose,
  title,
  children,
  contentStyle,
  scrollContentStyle,
  maxHeight = '88%',
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.modalOverlay, { backgroundColor: colors.backdrop }]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close Modal"
        />
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              maxHeight: maxHeight as any,
              borderTopWidth: isDark ? 1 : 0,
              borderTopColor: colors.border,
            },
            contentStyle,
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <AppText variant="h3" numberOfLines={1} style={{ flex: 1 }}>
              {title}
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.scrollBody, scrollContentStyle]}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    width: '100%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  scrollBody: {
    paddingBottom: spacing.xxl,
  },
});
