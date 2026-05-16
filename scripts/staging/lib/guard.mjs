/**
 * Staging validation safety guard — read-only checks only.
 */

export const PROD_HOST_PATTERNS = [
  /^https?:\/\/(www\.)?clickanunt\.ro/i,
  /^https?:\/\/clickanunt\.ro/i,
];

export function resolveBaseUrl() {
  const base = process.env.BASE_URL?.trim();
  if (!base) {
    console.error('ERROR: BASE_URL is required (e.g. BASE_URL=https://staging.example.com)');
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

export function assertValidationAllowed(baseUrl) {
  const allowProd =
    process.env.ALLOW_PROD_VALIDATION === '1' ||
    process.env.ALLOW_PROD_LOAD === '1' ||
    process.env.ALLOW_PROD_LOAD_TEST === '1';
  if (isProductionHost(baseUrl) && !allowProd) {
    console.error(
      'ERROR: Refusing validation against production. Use a staging BASE_URL, or set ALLOW_PROD_VALIDATION=1 explicitly.'
    );
    process.exit(1);
  }
  if (isProductionHost(baseUrl)) {
    console.warn('WARNING: production host — read-only checks with explicit opt-in');
  }
}
