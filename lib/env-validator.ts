/**
 * Environment Variable Validator
 * Validates all critical environment variables at application startup
 * Fails fast if any critical variables are missing or invalid
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

const OPTIONAL_ENV_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'REDIS_URL',
] as const;

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 * @throws Error if critical variables are missing
 */
export function validateEnvironment(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  // Check optional variables (warnings only)
  for (const varName of OPTIONAL_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(varName);
    }
  }

  const valid = missing.length === 0;

  return {
    valid,
    missing,
    warnings,
  };
}

/**
 * Validates environment and crashes app if critical variables missing
 * Call this at application startup
 */
export function enforceEnvironment(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    result.missing.forEach((varName) => {
      console.error(`  - ${varName}`);
    });
    console.error('\nApplication cannot start without these variables.');
    console.error('Please check .env.example for reference.');
    
    // Only exit in Node.js runtime, not in Edge Runtime
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    } else {
      throw new Error('Missing required environment variables');
    }
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    result.warnings.forEach((varName) => {
      console.warn(`  - ${varName}`);
    });
    console.warn('Some features may not work correctly.\n');
  }

  console.log('✅ Environment validation passed');
}

/**
 * Gets a validated environment variable
 * @throws Error if variable is missing
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Required environment variable ${name} is not set. Check .env.example for reference.`
    );
  }
  return value;
}

/**
 * Gets an optional environment variable with fallback
 */
export function getOptionalEnv(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}
