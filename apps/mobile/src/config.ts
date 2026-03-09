import Constants from 'expo-constants';

type ExpoExtra = {
  siteUrl?: string;
};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const rawSiteUrl = expoExtra.siteUrl ?? 'https://www.clickanunt.ro';

export const MOBILE_CONFIG = {
  siteUrl: normalizeUrl(rawSiteUrl),
  appName: 'ClickAnunt',
} as const;
