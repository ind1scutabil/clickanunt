/**
 * Pure preflight checks for staging deploy — no network, no secrets in logs.
 */

export const PROD_IP = '46.225.69.155';
export const PROD_DB_NAME = 'autoplat';

export const PLACEHOLDER_MARKERS = [
  'REQUIRED_STAGING_HOST',
  'REQUIRED_STAGING_DATABASE_URL',
  'REQUIRED_STAGING_DOMAIN',
  'REQUIRED_STAGING_DEPLOY_SERVER',
  'staging.example.com',
  'REPLACE_ME',
  '<STAGING_IP>',
  'YOUR_STAGING_',
];

/**
 * @typedef {object} PreflightInput
 * @property {string} [confirmStagingDeploy]
 * @property {string} [stagingDeployServer]
 * @property {string} [stagingDeployDir]
 * @property {string} [stagingDomain]
 * @property {string} [stagingDatabaseUrl]
 * @property {string} [stripeSecretKey]
 * @property {string} [e2eDisableRateLimit]
 * @property {string} [clickanuntE2eServer]
 * @property {string} [nodeEnv]
 * @property {string} [expectedSha]
 * @property {string} [actualSha]
 * @property {boolean} [workingTreeClean]
 * @property {boolean} [backupVerified]
 * @property {boolean} [pm2ConfigExists]
 * @property {boolean} [portFree]
 * @property {boolean} [migrationStatusOk]
 * @property {string} [allowStagingOnProdHost]
 */

/**
 * @param {string|undefined} value
 */
export function containsPlaceholder(value) {
  if (!value?.trim()) return false;
  const v = value.trim();
  return PLACEHOLDER_MARKERS.some((m) => v.includes(m));
}

/**
 * @param {string} value
 */
export function hostnameFromUrlOrHost(value) {
  const t = value.trim();
  try {
    if (t.includes('://')) return new URL(t).hostname.toLowerCase();
  } catch {
    /* fall through */
  }
  const hostPart = t.includes('@') ? t.split('@').pop() : t;
  return hostPart.split(':')[0].toLowerCase();
}

/**
 * @param {string} databaseUrl
 */
export function dbNameFromUrl(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    const name = u.pathname.replace(/^\//, '').split('?')[0];
    return name || null;
  } catch {
    return null;
  }
}

/**
 * @param {PreflightInput} input
 */
export function runStagingDeployPreflight(input) {
  /** @type {{ code: string, message: string }[]} */
  const issues = [];

  if (input.confirmStagingDeploy !== '1') {
    issues.push({
      code: 'CONFIRM_MISSING',
      message: 'Set CONFIRM_STAGING_DEPLOY=1 to acknowledge a staging-only deploy.',
    });
  }

  const server = input.stagingDeployServer?.trim();
  if (!server) {
    issues.push({
      code: 'HOST_MISSING',
      message: 'STAGING_DEPLOY_SERVER is required.',
    });
  } else if (containsPlaceholder(server)) {
    issues.push({
      code: 'HOST_PLACEHOLDER',
      message: 'STAGING_DEPLOY_SERVER still contains a placeholder — provision a real staging host first.',
    });
  } else if (server.includes(PROD_IP) && input.allowStagingOnProdHost !== '1') {
    issues.push({
      code: 'HOST_PRODUCTION',
      message: `STAGING_DEPLOY_SERVER points at production IP ${PROD_IP}. Refused.`,
    });
  }

  const domain = input.stagingDomain?.trim();
  if (!domain) {
    issues.push({
      code: 'DOMAIN_MISSING',
      message: 'STAGING_DOMAIN / NEXT_PUBLIC_SITE_URL staging domain is required.',
    });
  } else if (containsPlaceholder(domain)) {
    issues.push({
      code: 'DOMAIN_PLACEHOLDER',
      message: 'Staging domain still contains a placeholder.',
    });
  } else {
    const host = hostnameFromUrlOrHost(domain);
    if (host === 'clickanunt.ro' || host === 'www.clickanunt.ro') {
      issues.push({
        code: 'DOMAIN_PRODUCTION',
        message: 'Staging domain must not be production clickanunt.ro / www.clickanunt.ro.',
      });
    }
  }

  const db = input.stagingDatabaseUrl?.trim();
  if (!db) {
    issues.push({
      code: 'DB_MISSING',
      message: 'STAGING DATABASE_URL is required and must be a dedicated database.',
    });
  } else if (containsPlaceholder(db)) {
    issues.push({
      code: 'DB_PLACEHOLDER',
      message: 'DATABASE_URL still contains a placeholder.',
    });
  } else {
    if (db.includes(PROD_IP) || /clickanunt\.ro/i.test(db)) {
      issues.push({
        code: 'DB_PRODUCTION',
        message: 'DATABASE_URL appears to target production host patterns.',
      });
    }
    const dbName = dbNameFromUrl(db);
    if (dbName === PROD_DB_NAME) {
      issues.push({
        code: 'DB_PRODUCTION_NAME',
        message: `Database name "${PROD_DB_NAME}" is the known production DB name — use a separate staging database.`,
      });
    }
  }

  const stripe = input.stripeSecretKey?.trim() || '';
  if (stripe.startsWith('sk_live')) {
    issues.push({
      code: 'STRIPE_LIVE',
      message: 'Stripe LIVE secret key is forbidden on staging — use sk_test_ only.',
    });
  }

  if (input.e2eDisableRateLimit === '1' || input.clickanuntE2eServer === '1') {
    issues.push({
      code: 'E2E_FLAGS',
      message: 'E2E_DISABLE_RATE_LIMIT and CLICKANUNT_E2E_SERVER are forbidden on staging runtime.',
    });
  }

  if (input.nodeEnv && input.nodeEnv !== 'production') {
    issues.push({
      code: 'NODE_ENV',
      message: 'Staging runtime build expects NODE_ENV=production (Next production server).',
    });
  }

  if (input.workingTreeClean === false) {
    issues.push({
      code: 'DIRTY_TREE',
      message: 'Working tree must be clean before staging deploy.',
    });
  }

  if (input.expectedSha && input.actualSha && input.expectedSha !== input.actualSha) {
    issues.push({
      code: 'SHA_MISMATCH',
      message: `Deploy SHA mismatch: expected ${input.expectedSha}, got ${input.actualSha}.`,
    });
  }

  if (input.backupVerified === false) {
    issues.push({
      code: 'BACKUP_UNVERIFIED',
      message: 'STAGING_BACKUP_VERIFIED=1 required after a verified staging DB backup.',
    });
  }

  if (input.pm2ConfigExists === false) {
    issues.push({
      code: 'PM2_CONFIG_MISSING',
      message: 'PM2 staging ecosystem config file is missing.',
    });
  }

  if (input.portFree === false) {
    issues.push({
      code: 'PORT_BUSY',
      message: 'Staging app port is already in use.',
    });
  }

  if (input.migrationStatusOk === false) {
    issues.push({
      code: 'MIGRATION_DRIFT',
      message: 'Prisma migration status reports drift or failed migrations.',
    });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} key
 * @param {string|undefined} value
 */
export function sanitizeForLog(key, value) {
  if (value == null || value === '') return '(empty)';
  const k = key.toUpperCase();
  if (
    k.includes('SECRET') ||
    k.includes('PASSWORD') ||
    k.includes('TOKEN') ||
    k.includes('DATABASE_URL') ||
    k.includes('KEY')
  ) {
    return `[redacted len=${value.length}]`;
  }
  if (containsPlaceholder(value)) return `[placeholder] ${value.slice(0, 48)}`;
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}
