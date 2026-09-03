import { colors } from './colors';
import { typography, fontSize, fontWeight, lineHeight } from './typography';
import { spacing } from './spacing';
import { borderRadius } from './borderRadius';
import { shadows } from './shadows';
import { buttonStyles, buttonVariants } from './buttonStyles';
import { inputStyles } from './inputStyles';
import { cardStyles } from './cardStyles';

export const theme = {
  colors,
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  borderRadius,
  shadows,
  buttonStyles,
  buttonVariants,
  inputStyles,
  cardStyles,
} as const;

export type Theme = typeof theme;

export * from './colors';
export * from './themeStore';
export * from './useTheme';
export * from './typography';
export * from './spacing';
export * from './borderRadius';
export * from './shadows';
export * from './buttonStyles';
export * from './inputStyles';
export * from './cardStyles';
