import { MOBILE_CONFIG } from './config';

export type EnterpriseFlagName =
  | 'enterprise_observability'
  | 'enterprise_event_tracking'
  | 'enterprise_network_hardening'
  | 'enterprise_cache_offline'
  | 'enterprise_ux_polish'
  | 'enterprise_security_hardening';

const DEFAULT_FLAGS: Record<EnterpriseFlagName, boolean> = {
  enterprise_observability: false,
  enterprise_event_tracking: false,
  enterprise_network_hardening: false,
  enterprise_cache_offline: false,
  enterprise_ux_polish: false,
  enterprise_security_hardening: false,
};

let remoteFlags: Partial<Record<EnterpriseFlagName, boolean>> = {};
let remoteFetchedAt = 0;

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const fromEnv = (name: EnterpriseFlagName): boolean | undefined => {
  const envKey = `EXPO_PUBLIC_${name.toUpperCase()}`;
  return parseBoolean(process.env[envKey]);
};

export const refreshRemoteFlags = async (): Promise<void> => {
  const now = Date.now();
  if (now - remoteFetchedAt < 30_000) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/feature-flags`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { flags?: Partial<Record<EnterpriseFlagName, boolean>> };
    remoteFlags = data.flags || {};
    remoteFetchedAt = now;
  } catch {
  } finally {
    clearTimeout(timeout);
  }
};

export const getFlag = (name: EnterpriseFlagName): boolean => {
  const envValue = fromEnv(name);
  if (typeof envValue === 'boolean') {
    return envValue;
  }

  const remoteValue = remoteFlags[name];
  if (typeof remoteValue === 'boolean') {
    return remoteValue;
  }

  return DEFAULT_FLAGS[name];
};

export const getFlagsSnapshot = (): Record<EnterpriseFlagName, boolean> => ({
  enterprise_observability: getFlag('enterprise_observability'),
  enterprise_event_tracking: getFlag('enterprise_event_tracking'),
  enterprise_network_hardening: getFlag('enterprise_network_hardening'),
  enterprise_cache_offline: getFlag('enterprise_cache_offline'),
  enterprise_ux_polish: getFlag('enterprise_ux_polish'),
  enterprise_security_hardening: getFlag('enterprise_security_hardening'),
});
