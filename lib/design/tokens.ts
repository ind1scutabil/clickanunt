/**
 * ClickAnunț Enterprise Design Tokens
 * 
 * Centralized design system tokens for colors, typography, spacing, shadows, etc.
 * Use these tokens throughout the application for consistency.
 * 
 * @see DESIGN_SYSTEM.md for usage guidelines
 */

// ============================================
// COLOR PALETTE
// ============================================

/**
 * Primary brand colors - Violet/Purple accent
 * Use sparingly for CTAs and important highlights
 */
export const colors = {
  // Brand Primary (Violet)
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#6D5BFF', // Main brand color
    600: '#4E3CFF',
    700: '#5B21B6',
    800: '#4C1D95',
    900: '#2E1065',
    950: '#1E0A46',
  },

  // Secondary accent (Cyan) - Use ONLY for subtle highlights
  secondary: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#00D4FF', // Accent color
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
    950: '#083344',
  },

  // Neutral grays (main UI colors)
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    850: '#1A1A1A', // Custom shade
    900: '#141414',
    925: '#0F0F0F', // Custom shade
    950: '#0A0A0A', // Main background
  },

  // Semantic colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    900: '#14532D',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    900: '#7F1D1D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    900: '#78350F',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    900: '#1E3A8A',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

/**
 * Font families
 * System font stack for optimal performance and native look
 */
export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Menlo',
    'Consolas',
    '"Liberation Mono"',
    'monospace',
  ].join(', '),
} as const;

/**
 * Font sizes - Typographic scale
 * Base: 16px (1rem)
 */
export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
  base: ['1rem', { lineHeight: '1.5rem' }], // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  '5xl': ['3rem', { lineHeight: '1.16' }], // 48px
  '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
  '7xl': ['4.5rem', { lineHeight: '1.05' }], // 72px
} as const;

/**
 * Font weights
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * Line heights
 */
export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// ============================================
// SPACING
// ============================================

/**
 * Spacing scale - 8px grid system
 * Use these for padding, margin, gap, etc.
 */
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

// ============================================
// BORDER RADIUS
// ============================================

/**
 * Border radius values
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.625rem', // 10px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// ============================================

/**
 * Box shadows - Subtle elevation system
 * Reduced intensity for dark theme
 */
export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
  DEFAULT: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px -1px rgba(0, 0, 0, 0.35)',
  lg: '0 8px 16px -2px rgba(0, 0, 0, 0.4)',
  xl: '0 12px 24px -4px rgba(0, 0, 0, 0.45)',
  '2xl': '0 20px 32px -8px rgba(0, 0, 0, 0.5)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  none: 'none',

  // Glow effects (use sparingly)
  'glow-primary': '0 0 20px rgba(109, 91, 255, 0.3)',
  'glow-secondary': '0 0 20px rgba(0, 212, 255, 0.3)',
} as const;

// ============================================
// MOTION / ANIMATION
// ============================================

/**
 * Animation durations
 */
export const duration = {
  fast: '120ms',
  base: '180ms',
  normal: '240ms',
  slow: '320ms',
  slower: '400ms',
} as const;

/**
 * Animation easing functions
 */
export const easing = {
  // Smooth, natural movement
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Entering animations
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  
  // Elastic/bouncy (use sparingly)
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * Transition presets
 */
export const transition = {
  fast: `all ${duration.fast} ${easing.default}`,
  base: `all ${duration.base} ${easing.default}`,
  normal: `all ${duration.normal} ${easing.default}`,
  slow: `all ${duration.slow} ${easing.default}`,
  
  // Specific property transitions
  colors: `color ${duration.base} ${easing.default}, background-color ${duration.base} ${easing.default}, border-color ${duration.base} ${easing.default}`,
  transform: `transform ${duration.normal} ${easing.default}`,
  opacity: `opacity ${duration.base} ${easing.default}`,
} as const;

// ============================================
// BREAKPOINTS
// ============================================

/**
 * Responsive breakpoints
 * Mobile-first approach
 */
export const screens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

/**
 * Z-index layering system
 * Prevents z-index conflicts
 */
export const zIndex = {
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  
  // Named layers
  dropdown: '100',
  sticky: '200',
  overlay: '300',
  modal: '400',
  popover: '500',
  toast: '600',
  tooltip: '700',
} as const;

// ============================================
// EXPORTS
// ============================================

/**
 * Complete design tokens object
 */
export const tokens = {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  borderRadius,
  boxShadow,
  duration,
  easing,
  transition,
  screens,
  zIndex,
} as const;

export default tokens;
