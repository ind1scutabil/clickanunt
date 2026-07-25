/**
 * Local E2E-only fixture gate. Never enabled when NODE_ENV=production.
 */
export function isGalleryAtomicFixtureEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== "production";
}
