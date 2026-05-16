/**
 * Staging site detection — OFF by default (live production unchanged).
 * Set STAGING_SITE=1 on staging PM2/env only.
 */

export function isStagingSite(): boolean {
  return (
    process.env.STAGING_SITE === '1' ||
    process.env.NEXT_PUBLIC_STAGING_SITE === '1'
  );
}

export function stagingRobotsMetadata():
  | 'index, follow'
  | { index: false; follow: false; noarchive: true; nosnippet: true } {
  if (isStagingSite()) {
    return { index: false, follow: false, noarchive: true, nosnippet: true };
  }
  return 'index, follow';
}
