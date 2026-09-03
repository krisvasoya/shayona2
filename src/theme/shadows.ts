import { Platform, ViewStyle } from 'react-native';

const selectShadow = (ios: ViewStyle, android: ViewStyle): ViewStyle => {
  if (typeof Platform?.select === 'function') {
    return Platform.select({ ios, android }) || android;
  }
  return Platform?.OS === 'ios' ? ios : android;
};

export const shadows: Record<string, ViewStyle> = {
  none: {
    ...selectShadow(
      {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      {
        elevation: 0,
      },
    ),
  },
  sm: {
    ...selectShadow(
      {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      {
        elevation: 1,
      },
    ),
  },
  md: {
    ...selectShadow(
      {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      {
        elevation: 2,
      },
    ),
  },
  lg: {
    ...selectShadow(
      {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      {
        elevation: 4,
      },
    ),
  },
  xl: {
    ...selectShadow(
      {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      {
        elevation: 8,
      },
    ),
  },
};
