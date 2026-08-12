import Constants from 'expo-constants';

type ExpoExtra = {
  siteUrl?: string;
};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

/**
 * Site origin for API calls.
 * Override locally with EXPO_PUBLIC_SITE_URL (preferred) or app.json `extra.siteUrl`.
 * Android emulator → host machine Next.js: http://10.0.2.2:3000
 * iOS simulator → http://localhost:3000
 * Physical device → your LAN IP, e.g. http://192.168.x.x:3000
 * Do not invent production URLs beyond the public default below.
 */
const rawSiteUrl =
  process.env.EXPO_PUBLIC_SITE_URL || expoExtra.siteUrl || 'https://www.clickanunt.ro';

export const MOBILE_CONFIG = {
  siteUrl: normalizeUrl(rawSiteUrl),
  appName: 'ClickAnunt',
} as const;
