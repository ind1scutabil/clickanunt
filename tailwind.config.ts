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
        /** Single enterprise accent — blue (Stripe / Linear family), not violet */
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        /** Secondary accent — cool slate for metadata, dividers, subtle emphasis */
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
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
        'glow-primary': '0 0 24px rgba(37, 99, 235, 0.18)',
        'glow-secondary': '0 0 20px rgba(100, 116, 139, 0.12)',
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
        /** Design-system: interactive hovers 200–300ms (default 250ms) */
        base: "200ms",
        normal: "250ms",
        "120": "120ms",
        "180": "180ms",
        "240": "240ms",
        "280": "280ms",
        "320": "320ms",
        "400": "400ms",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
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
