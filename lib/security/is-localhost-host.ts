/**
 * Detect loopback / local dev hosts where TLS is not available.
 * Used to skip HSTS and upgrade-insecure-requests during `npm start` on localhost.
 */

export function isLocalhostHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;

  const raw = hostname.trim().toLowerCase();
  if (!raw) return false;

  let bare = raw;
  if (bare.startsWith('[')) {
    const end = bare.indexOf(']');
    bare = end > 0 ? bare.slice(1, end) : bare;
  } else {
    bare = bare.split(':')[0] ?? bare;
  }

  return (
    bare === 'localhost' ||
    bare === '127.0.0.1' ||
    bare === '0.0.0.0' ||
    bare === '::1'
  );
}

/** Production transport hardening (HSTS + upgrade-insecure-requests) — never on loopback. */
export function shouldApplyProductionTransportSecurity(
  hostname: string | null | undefined
): boolean {
  return process.env.NODE_ENV === 'production' && !isLocalhostHostname(hostname);
}
