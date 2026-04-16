/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const NightTheme = {
  background: '#000000',       // Extreme Dark
  surface: '#080808',          // Deepest Grey
  surfaceHighlight: '#121212', // Subtle lift
  border: '#232220',           // Separators
  borderSubtle: '#1A1A18',
  textPrimary: '#E8E6E0',      // Off-white, soft on eyes
  textSecondary: '#C8C6C0',    // Dimmer white
  textMuted: '#4A4A4A',        // Placeholder, extreme fade
  textDeepMuted: '#3A3A3A',
  accent: '#7C3AED',           // Core purple brand color
  accentMuted: 'rgba(124, 58, 237, 0.15)',
  accentDashed: '#3A2A5A',
  orangeAccent: '#B45309',
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 24,
  }
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: NightTheme.textPrimary,
    background: NightTheme.background,
    tint: NightTheme.accent,
    icon: NightTheme.textMuted,
    tabIconDefault: NightTheme.textMuted,
    tabIconSelected: NightTheme.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
