/**
 * Optional future enforcement of emailVerified.
 * Default: OFF (fail-safe — preserves current product behavior).
 * Not controllable by the client. Do not wire into publish/login in this phase.
 */
export function isEmailVerificationEnforcementEnabled(): boolean {
  const raw = process.env.REQUIRE_EMAIL_VERIFIED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Returns whether an action should be blocked for unverified email.
 * Always false when enforcement flag is off.
 */
export function shouldBlockUnverifiedEmail(user: {
  emailVerified?: boolean | null;
} | null | undefined): boolean {
  if (!isEmailVerificationEnforcementEnabled()) {
    return false;
  }
  return !user?.emailVerified;
}
