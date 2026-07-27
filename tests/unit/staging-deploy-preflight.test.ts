/**
 * @jest-environment node
 */

import {
  runStagingDeployPreflight,
  sanitizeForLog,
  containsPlaceholder,
} from '../../scripts/staging/lib/deploy-preflight.mjs';

const validSynthetic = {
  confirmStagingDeploy: '1',
  stagingDeployServer: 'deploy@staging-box.internal.example',
  stagingDomain: 'https://staging-box.internal.example',
  stagingDatabaseUrl: 'postgresql://stg_user:x@db.staging.internal.example:5432/clickanunt_staging',
  stripeSecretKey: 'sk_test_synthetic_not_real',
  e2eDisableRateLimit: undefined,
  clickanuntE2eServer: undefined,
  nodeEnv: 'production',
  expectedSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  actualSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  workingTreeClean: true,
  backupVerified: true,
  pm2ConfigExists: true,
  portFree: true,
  migrationStatusOk: true,
};

describe('staging deploy preflight', () => {
  it('accepts fully synthetic valid input (no network)', () => {
    const r = runStagingDeployPreflight(validSynthetic);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('refuses missing host', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, stagingDeployServer: '' });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === 'HOST_MISSING')).toBe(true);
  });

  it('refuses placeholder host', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      stagingDeployServer: 'root@REQUIRED_STAGING_HOST',
    });
    expect(r.issues.some((i) => i.code === 'HOST_PLACEHOLDER')).toBe(true);
  });

  it('refuses production host IP', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      stagingDeployServer: 'root@46.225.69.155',
    });
    expect(r.issues.some((i) => i.code === 'HOST_PRODUCTION')).toBe(true);
  });

  it('refuses production domain', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      stagingDomain: 'https://www.clickanunt.ro',
    });
    expect(r.issues.some((i) => i.code === 'DOMAIN_PRODUCTION')).toBe(true);
  });

  it('refuses missing DB', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, stagingDatabaseUrl: '' });
    expect(r.issues.some((i) => i.code === 'DB_MISSING')).toBe(true);
  });

  it('refuses production DB host / name', () => {
    const byHost = runStagingDeployPreflight({
      ...validSynthetic,
      stagingDatabaseUrl: 'postgresql://u:p@46.225.69.155:5432/clickanunt_staging',
    });
    expect(byHost.issues.some((i) => i.code === 'DB_PRODUCTION')).toBe(true);

    const byName = runStagingDeployPreflight({
      ...validSynthetic,
      stagingDatabaseUrl: 'postgresql://u:p@db.staging.internal.example:5432/autoplat',
    });
    expect(byName.issues.some((i) => i.code === 'DB_PRODUCTION_NAME')).toBe(true);
  });

  it('refuses Stripe live key', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      stripeSecretKey: 'sk_live_synthetic_forbidden',
    });
    expect(r.issues.some((i) => i.code === 'STRIPE_LIVE')).toBe(true);
  });

  it('refuses E2E flags', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      e2eDisableRateLimit: '1',
      clickanuntE2eServer: '1',
    });
    expect(r.issues.some((i) => i.code === 'E2E_FLAGS')).toBe(true);
  });

  it('refuses dirty tree', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, workingTreeClean: false });
    expect(r.issues.some((i) => i.code === 'DIRTY_TREE')).toBe(true);
  });

  it('refuses SHA mismatch', () => {
    const r = runStagingDeployPreflight({
      ...validSynthetic,
      expectedSha: 'aaa',
      actualSha: 'bbb',
    });
    expect(r.issues.some((i) => i.code === 'SHA_MISMATCH')).toBe(true);
  });

  it('refuses unverified backup', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, backupVerified: false });
    expect(r.issues.some((i) => i.code === 'BACKUP_UNVERIFIED')).toBe(true);
  });

  it('refuses missing confirm flag', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, confirmStagingDeploy: '0' });
    expect(r.issues.some((i) => i.code === 'CONFIRM_MISSING')).toBe(true);
  });

  it('refuses missing PM2 config', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, pm2ConfigExists: false });
    expect(r.issues.some((i) => i.code === 'PM2_CONFIG_MISSING')).toBe(true);
  });

  it('refuses busy port', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, portFree: false });
    expect(r.issues.some((i) => i.code === 'PORT_BUSY')).toBe(true);
  });

  it('refuses migration drift', () => {
    const r = runStagingDeployPreflight({ ...validSynthetic, migrationStatusOk: false });
    expect(r.issues.some((i) => i.code === 'MIGRATION_DRIFT')).toBe(true);
  });

  it('sanitizes secrets and detects placeholders', () => {
    expect(sanitizeForLog('DATABASE_URL', 'postgresql://u:secret@h/db')).toMatch(/redacted/);
    expect(containsPlaceholder('https://staging.example.com')).toBe(true);
    expect(containsPlaceholder('https://staging-box.internal.example')).toBe(false);
  });
});
