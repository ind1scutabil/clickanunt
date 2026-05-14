/**
 * Paletă aliniată la navbar / enterprise web (dark, border white/10, accent portocaliu).
 * RN nu are backdrop-filter: folosim rgba + border subtil pentru „glass”.
 */
export const THEME = {
  colors: {
    background: '#09090b',
    surface: 'rgba(24, 24, 27, 0.94)',
    surfaceAlt: 'rgba(39, 39, 42, 0.92)',
    border: 'rgba(255, 255, 255, 0.10)',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    /** CTA principal (aliniat la #ff5a00 pe web) */
    primary: '#FF5A00',
    primaryStrong: '#E65200',
    /** Accente secundare (subtitluri, prețuri evidențiate) */
    accent: '#FB923C',
    success: '#34D399',
    warning: '#EAB308',
    error: '#F87171',
    /** Violet discret — secțiune admin în meniuri */
    adminMuted: 'rgba(139, 92, 246, 0.22)',
    adminText: '#e9d5ff',
  },
  /**
   * Tokeni folosiți explicit pe ecrane (ex. Favorite) — păstrați compatibilitate.
   */
  enterprise: {
    pageBg: '#030304',
    cardBg: 'rgba(24, 24, 27, 0.92)',
    cardBorder: 'rgba(255, 255, 255, 0.10)',
    orange: '#FF5A00',
    amber: '#FBBF24',
    orangeDeep: '#E65200',
    amberDeep: '#D97706',
    hairline: 'rgba(249, 115, 22, 0.35)',
    textDim: '#A1A1AA',
    rose: '#FDA4AF',
    sky: '#7DD3FC',
    emerald: '#6EE7B7',
    iconWellBorder: 'rgba(82, 82, 91, 0.55)',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
  },
} as const;
