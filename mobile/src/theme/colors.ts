import { Appearance } from 'react-native';

import { darkColors, lightColors } from './tokens';

const palette = Appearance.getColorScheme() === 'dark' ? darkColors : lightColors;

// Legacy screens still import this adapter while P5 components use the token roles.
// A fresh app launch follows the Android/iOS system appearance configured in app.json.
export const COLORS = {
  ...palette,
  text: palette.foreground,
} as const;
