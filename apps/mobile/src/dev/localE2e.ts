import { useEffect, useRef, useState } from 'react';

import { MOBILE_CONFIG } from '../config';

/** Local/emulator origins only — never against production. */
export function isLocalApiOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === '10.0.2.2' || host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * DEV-only form seed for uiautomator. Fills React state so taps hit real submit
 * handlers — does NOT call login/register APIs by itself.
 */
export function useLocalE2eFormSeed(
  enabledFlag: string,
  apply: () => void
): void {
  const applyRef = useRef(apply);

  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  useEffect(() => {
    if (!__DEV__ || !isLocalApiOrigin(MOBILE_CONFIG.siteUrl)) return;
    if (process.env[enabledFlag] !== '1') return;
    applyRef.current();
  }, [enabledFlag]);
}

export function useLocalE2eToggle(): boolean {
  const [on] = useState(
    () =>
      Boolean(
        __DEV__ &&
          isLocalApiOrigin(MOBILE_CONFIG.siteUrl) &&
          (process.env.EXPO_PUBLIC_E2E_LOGIN === '1' ||
            process.env.EXPO_PUBLIC_E2E_REGISTER === '1')
      )
  );
  return on;
}
