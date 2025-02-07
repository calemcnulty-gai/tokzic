// Theme configuration for Tokzic
// Defines colors, typography, spacing, and other design tokens

export const colors = {
  // Base colors
  background: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    glass: 'rgba(18, 18, 26, 0.75)', // 75% opacity for backgrounds
  },
  
  // Neon accent colors with 90% opacity
  neon: {
    green: 'rgba(0, 255, 157, 0.9)',
    pink: 'rgba(255, 0, 229, 0.9)',
    purple: 'rgba(157, 0, 255, 0.9)',
    blue: 'rgba(0, 229, 255, 0.9)',
  },
  
  // Text colors
  text: {
    primary: 'rgba(255, 255, 255, 0.9)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    accent: 'rgba(255, 0, 229, 0.9)', // 90% opacity for accent text
  },
  
  // Border colors
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(255, 0, 229, 0.9)', // 90% opacity for focus borders
    hover: 'rgba(255, 0, 229, 0.3)',
  },

  // Status colors with 90% opacity
  status: {
    success: 'rgba(0, 255, 157, 0.9)',
    error: 'rgba(255, 61, 113, 0.9)',
    warning: 'rgba(255, 170, 0, 0.9)',
    info: 'rgba(0, 229, 255, 0.9)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
};

export const typography = {
  fonts: {
    primary: 'Inter',
    mono: 'JetBrains Mono',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const shadows = {
  sm: {
    shadowColor: colors.neon.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.neon.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.neon.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Glassmorphic effect styles
export const glass = {
  default: {
    backgroundColor: colors.background.glass,
    backdropFilter: 'blur(8px)',
    borderColor: colors.border.default,
    borderWidth: 1,
  },
  heavy: {
    backgroundColor: 'rgba(18, 18, 26, 0.9)',
    backdropFilter: 'blur(16px)',
    borderColor: colors.border.default,
    borderWidth: 1,
  },
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Z-index stack
export const zIndex = {
  base: 0,
  above: 1,
  modal: 100,
  toast: 200,
  tooltip: 300,
};

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  glass,
  animation,
  zIndex,
};

export type Theme = typeof theme;
export default theme;