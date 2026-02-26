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

const ENV_MAP: Record<EnterpriseFlagName, string> = {
  enterprise_observability: 'FEATURE_ENTERPRISE_OBSERVABILITY',
  enterprise_event_tracking: 'FEATURE_ENTERPRISE_EVENT_TRACKING',
  enterprise_network_hardening: 'FEATURE_ENTERPRISE_NETWORK_HARDENING',
  enterprise_cache_offline: 'FEATURE_ENTERPRISE_CACHE_OFFLINE',
  enterprise_ux_polish: 'FEATURE_ENTERPRISE_UX_POLISH',
  enterprise_security_hardening: 'FEATURE_ENTERPRISE_SECURITY_HARDENING',
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return undefined;
};

let cachedRemoteFlags: Partial<Record<EnterpriseFlagName, boolean>> | null = null;
let remoteFetchedAt = 0;

const getRemoteFlagsFromEnv = (): Partial<Record<EnterpriseFlagName, boolean>> => {
  const raw = process.env.ENTERPRISE_FLAGS_REMOTE_JSON;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Record<EnterpriseFlagName, boolean>> = {};

    for (const flag of Object.keys(DEFAULT_FLAGS) as EnterpriseFlagName[]) {
      const value = parsed[flag];
      if (typeof value === 'boolean') {
        result[flag] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
};

export const getRemoteFlagSnapshot = (): Partial<Record<EnterpriseFlagName, boolean>> => {
  const ttlMs = 30_000;
  const now = Date.now();
  if (cachedRemoteFlags && now - remoteFetchedAt < ttlMs) {
    return cachedRemoteFlags;
  }

  cachedRemoteFlags = getRemoteFlagsFromEnv();
  remoteFetchedAt = now;
  return cachedRemoteFlags;
};

export const getFlag = (name: EnterpriseFlagName): boolean => {
  const envValue = parseBoolean(process.env[ENV_MAP[name]]);
  if (envValue !== undefined) {
    return envValue;
  }

  const remoteValue = getRemoteFlagSnapshot()[name];
  if (typeof remoteValue === 'boolean') {
    return remoteValue;
  }

  return DEFAULT_FLAGS[name];
};

export const getAllFlags = (): Record<EnterpriseFlagName, boolean> => {
  const result = {} as Record<EnterpriseFlagName, boolean>;
  for (const name of Object.keys(DEFAULT_FLAGS) as EnterpriseFlagName[]) {
    result[name] = getFlag(name);
  }
  return result;
};
