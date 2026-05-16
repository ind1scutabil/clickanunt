/**
 * Load-test safety guard — read-only, no production by default.
 */

const PROD_HOST_PATTERNS = [
  /^https?:\/\/(www\.)?clickanunt\.ro/i,
  /^https?:\/\/clickanunt\.ro/i,
];

export function resolveBaseUrl() {
  const base = process.env.BASE_URL?.trim();
  if (!base) {
    console.error('ERROR: BASE_URL is required (e.g. BASE_URL=http://localhost:3000)');
    process.exit(1);
  }
  let url;
  try {
    url = new URL(base);
  } catch {
    console.error('ERROR: BASE_URL must be a valid URL');
    process.exit(1);
  }
  return url;
}

export function isProductionHost(baseUrl) {
  return PROD_HOST_PATTERNS.some((re) => re.test(baseUrl.href));
}

export function assertLoadTestAllowed(baseUrl) {
  const allowProd =
    process.env.ALLOW_PROD_LOAD === '1' || process.env.ALLOW_PROD_LOAD_TEST === '1';
  if (isProductionHost(baseUrl) && !allowProd) {
    console.error(
      'ERROR: Refusing load test against production. Use staging BASE_URL or set ALLOW_PROD_LOAD=1 explicitly.'
    );
    process.exit(1);
  }
  if (isProductionHost(baseUrl)) {
    console.warn('WARNING: ALLOW_PROD_LOAD=1 — load test against production host');
  }
}

export function requireStagingAuth() {
  if (process.env.LOAD_ALLOW_STAGING !== '1') {
    console.error('ERROR: Set LOAD_ALLOW_STAGING=1 for authenticated load profiles');
    process.exit(1);
  }
  const token = process.env.LOAD_AUTH_BEARER?.trim();
  const cookie = process.env.LOAD_AUTH_COOKIE?.trim();
  if (!token && !cookie) {
    console.error('ERROR: LOAD_AUTH_BEARER or LOAD_AUTH_COOKIE required');
    process.exit(1);
  }
  return { token, cookie };
}

export function authHeaders() {
  const { token, cookie } = requireStagingAuth();
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

/** @deprecated use runLoadProfile from metrics.mjs */
export async function runConcurrentGets(url, { concurrency = 10, durationSec = 15 }) {
  const { runLoadProfile, fetchGetMetrics } = await import('./metrics.mjs');
  return runLoadProfile({
    name: 'legacy',
    concurrency,
    durationSec,
    requestFn: () => fetchGetMetrics(url),
  });
}
