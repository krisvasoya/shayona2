import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreenContainer,
  AppHeader,
  AppText,
  AppCard,
  AppButton,
  AppTextInput,
} from '@/src/components/common';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { borderRadius } from '@/src/theme/borderRadius';
import { useAuth } from '@/src/features/auth';
import { useLanguage } from '@/src/localization';
import { authService } from '@/src/services/auth.service';
import { extract10DigitPhone, isValidIndianMobile } from '@/src/utils/phone';

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { user, profile, setProfile } = useAuth();
  const { t } = useLanguage();

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ shopName?: string; phone?: string; address?: string }>({});

  useEffect(() => {
    if (profile) {
      setShopName(profile.shop_name || '');
      setPhone(profile.phone ? extract10DigitPhone(profile.phone) : '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user?.id) return;

    const trimmedShopName = shopName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    const newErrors: { shopName?: string; phone?: string; address?: string } = {};

    if (!trimmedShopName) {
      newErrors.shopName = 'Shop name is required';
    }

    if (trimmedPhone && !isValidIndianMobile(trimmedPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const res = await authService.updateUserProfile(user.id, {
        shop_name: trimmedShopName,
        phone: trimmedPhone || null,
        address: trimmedAddress || null,
      });

      if (res.error) {
        Alert.alert(t.common.error, res.error);
        return;
      }

      if (res.profile) {
        setProfile(res.profile);
      }

      Alert.alert(t.common.success, t.businessProfile.updateSuccess, [
        {
          text: t.common.ok,
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            }
          },
        },
      ]);
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreenContainer
      scrollable
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title={t.businessProfile.title}
          subtitle={t.businessProfile.subtitle}
          showBack={true}
        />
      }
    >
      <AppCard style={styles.card}>
        <View style={styles.avatarHeaderRow}>
          <View style={styles.profileAvatar}>
            <Ionicons name="storefront" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <AppText variant="h3">{shopName || 'Shayona Enterprise'}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {user?.email || (phone ? `+91 ${phone}` : 'Shop Owner')}
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.card}>
        <AppTextInput
          label={`${t.businessProfile.shopName} *`}
          placeholder={t.businessProfile.shopNamePlaceholder}
          value={shopName}
          onChangeText={text => {
            setShopName(text);
            if (errors.shopName) setErrors({ ...errors, shopName: undefined });
          }}
          error={errors.shopName}
        />

        <AppTextInput
          label={`${t.businessProfile.mobileNumber}`}
          placeholder={t.businessProfile.mobileNumberPlaceholder}
          value={phone}
          onChangeText={text => {
            setPhone(text);
            if (errors.phone) setErrors({ ...errors, phone: undefined });
          }}
          keyboardType="phone-pad"
          maxLength={10}
          error={errors.phone}
        />

        <AppTextInput
          label={`${t.businessProfile.shopAddress}`}
          placeholder={t.businessProfile.shopAddressPlaceholder}
          value={address}
          onChangeText={text => {
            setAddress(text);
            if (errors.address) setErrors({ ...errors, address: undefined });
          }}
          multiline
          numberOfLines={3}
          style={{ minHeight: 72 }}
          error={errors.address}
        />

        <View style={styles.helperRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
          <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1, marginLeft: 4 }}>
            {t.businessProfile.addressHelper}
          </AppText>
        </View>

        <AppButton
          title={t.businessProfile.saveChanges}
          variant="primary"
          loading={saving}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </AppCard>
    </AppScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  avatarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -4,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    marginTop: spacing.xs,
  },
});
