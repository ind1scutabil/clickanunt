/**
 * Guards for staging scripts — detect accidental production targets.
 */

const PROD_DB_HOST_PATTERNS = [
  /clickanunt\.ro/i,
  /46\.225\.69\.155/, // production VPS from deploy script default
];

export function isLikelyProductionDatabaseUrl(databaseUrl: string | undefined): boolean {
  if (!databaseUrl?.trim()) return false;
  return PROD_DB_HOST_PATTERNS.some((re) => re.test(databaseUrl));
}

export function assertStagingDatabaseSafety(databaseUrl: string | undefined): void {
  if (isLikelyProductionDatabaseUrl(databaseUrl)) {
    throw new Error(
      'Refusing: DATABASE_URL appears to point at production. Use a staging DB clone or sanitized copy.'
    );
  }
}
