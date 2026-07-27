/**
 * E2E-only rate-limit / publish-quota bypass.
 *
 * Never request-controllable (no header/cookie/query/body).
 * Safe for production deploys: NODE_ENV=production alone with
 * E2E_DISABLE_RATE_LIMIT=1 does NOT enable bypass — the explicit
 * CLICKANUNT_E2E_SERVER=1 flag (local gate scripts only) is required.
 *
 * ecosystem.config.js / PM2 must never set CLICKANUNT_E2E_SERVER.
 *
 * @param env injectable for unit tests (defaults to process.env)
 */
export function isE2eRateLimitBypassEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.E2E_DISABLE_RATE_LIMIT !== "1") {
    return false;
  }
  if (env.NODE_ENV === "production") {
    return env.CLICKANUNT_E2E_SERVER === "1";
  }
  return true;
}
