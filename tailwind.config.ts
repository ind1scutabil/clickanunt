import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Design System Colors
      colors: {
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#6D5BFF',
          600: '#4E3CFF',
          700: '#5B21B6',
          800: '#4C1D95',
          900: '#2E1065',
          950: '#1E0A46',
        },
        secondary: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#00D4FF',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#083344',
        },
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
          850: '#1A1A1A',
          900: '#141414',
          925: '#0F0F0F',
          950: '#0A0A0A',
        },
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
        
        // Legacy vars (keep for now, will phase out)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      
      // Typography
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      
      // Spacing & Layout (extending default Tailwind scale)
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem',
      },
      
      // Shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        'DEFAULT': '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
        'md': '0 4px 8px -1px rgba(0, 0, 0, 0.35)',
        'lg': '0 8px 16px -2px rgba(0, 0, 0, 0.4)',
        'xl': '0 12px 24px -4px rgba(0, 0, 0, 0.45)',
        '2xl': '0 20px 32px -8px rgba(0, 0, 0, 0.5)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 0 20px rgba(109, 91, 255, 0.3)',
        'glow-secondary': '0 0 20px rgba(0, 212, 255, 0.3)',
      },
      
      // Z-Index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        dropdown: '100',
        modal: '400',
        tooltip: '500',
        toast: '600',
      },
      
      // Animations
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
        '240': '240ms',
        '320': '320ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // Existing animations (keep for compatibility)
      keyframes: {
        slideDown: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-20px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
        fadeIn: 'fadeIn 180ms ease-out',
        fadeOut: 'fadeOut 180ms ease-out',
        scaleIn: 'scaleIn 240ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
