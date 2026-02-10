/**
 * Secret Management - External (Vault/AWS Secrets Manager)
 * 
 * Features:
 * - Runtime secret fetching
 * - Caching with TTL
 * - Automatic rotation
 * - Fallback to environment
 */

import crypto from 'crypto';

export interface SecretManager {
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  rotate(key: string): Promise<string>;
}

export interface SecretCacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Secret cache (TTL-based)
 */
class SecretCache {
  private cache: Map<string, SecretCacheEntry> = new Map();
  private readonly ttl = 3600000; // 1 hour

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: string): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Environment-based secret manager (fallback)
 */
class EnvironmentSecretManager implements SecretManager {
  async get(key: string): Promise<string> {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Secret not found: ${key}`);
    }
    return value;
  }

  async set(): Promise<void> {
    throw new Error('Cannot set secrets in environment');
  }

  async delete(): Promise<void> {
    throw new Error('Cannot delete secrets from environment');
  }

  async rotate(): Promise<string> {
    throw new Error('Cannot rotate environment secrets');
  }
}

/**
 * Vault-based secret manager (for HashiCorp Vault)
 */
class VaultSecretManager implements SecretManager {
  private vaultAddr: string;
  private vaultToken: string;
  private cache: SecretCache;

  constructor() {
    this.vaultAddr = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
    this.vaultToken = process.env.VAULT_TOKEN || '';
    this.cache = new SecretCache();
  }

  async get(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Fetch from Vault
    const value = await this.fetchFromVault(key);
    this.cache.set(key, value);
    return value;
  }

  private async fetchFromVault(key: string): Promise<string> {
    if (!this.vaultToken) {
      // Fallback to environment
      return process.env[key] || '';
    }

    try {
      const response = await fetch(
        `${this.vaultAddr}/v1/secret/data/clickanunt/${key}`,
        {
          headers: {
            'X-Vault-Token': this.vaultToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Vault error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.data.value;
    } catch (error) {
      console.error('[VAULT_ERROR]', error);
      // Fallback to environment
      return process.env[key] || '';
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.vaultToken) {
      throw new Error('Vault not configured');
    }

    await fetch(`${this.vaultAddr}/v1/secret/data/clickanunt/${key}`, {
      method: 'POST',
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          value,
        },
      }),
    });

    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    if (!this.vaultToken) {
      throw new Error('Vault not configured');
    }

    await fetch(`${this.vaultAddr}/v1/secret/data/clickanunt/${key}`, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': this.vaultToken,
      },
    });

    this.cache.clear();
  }

  async rotate(key: string): Promise<string> {
    // Implement secret rotation logic
    // This typically involves:
    // 1. Generating new secret
    // 2. Storing both old and new
    // 3. Coordinating with app deployment
    const newSecret = this.generateSecret();
    await this.set(key, newSecret);
    return newSecret;
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * AWS Secrets Manager
 */
class AWSSecretsManager implements SecretManager {
  private cache: SecretCache;
  private client: unknown; // AWS SDK client

  constructor() {
    this.cache = new SecretCache();
    // Initialize AWS SDK if available
    if (process.env.AWS_REGION) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AWS = require('aws-sdk');
        this.client = new AWS.SecretsManager({
          region: process.env.AWS_REGION,
        });
      } catch {
        console.warn('AWS SDK not available');
      }
    }
  }

  async get(key: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Fetch from AWS
    if (this.client) {
      try {
        const data = await (this.client as {
          getSecretValue: (params: { SecretId: string }) => { promise: () => Promise<{ SecretString?: string; SecretBinary?: string }> };
        })
          .getSecretValue({ SecretId: `clickanunt/${key}` })
          .promise();
        const value = data.SecretString || data.SecretBinary;
        if (value) {
          this.cache.set(key, value);
          return value;
        }
      } catch (error) {
        console.error('[AWS_SECRETS_ERROR]', error);
      }
    }

    // Fallback to environment
    return process.env[key] || '';
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.client) {
      throw new Error('AWS Secrets Manager not configured');
    }

    try {
      await (this.client as {
        updateSecret: (params: { SecretId: string; SecretString: string }) => { promise: () => Promise<unknown> };
      })
        .updateSecret({
          SecretId: `clickanunt/${key}`,
          SecretString: value,
        })
        .promise();

      this.cache.set(key, value);
    } catch (error) {
      console.error('[AWS_SECRETS_ERROR]', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('AWS Secrets Manager not configured');
    }

    await (this.client as {
      deleteSecret: (params: { SecretId: string }) => { promise: () => Promise<unknown> };
    })
      .deleteSecret({
        SecretId: `clickanunt/${key}`,
      })
      .promise();

    this.cache.clear();
  }

  async rotate(key: string): Promise<string> {
    const newSecret = crypto.randomBytes(32).toString('hex');
    await this.set(key, newSecret);
    return newSecret;
  }
}

/**
 * Get appropriate secret manager based on configuration
 */
function getSecretManager(): SecretManager {
  if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
    return new VaultSecretManager();
  }

  if (process.env.AWS_REGION) {
    return new AWSSecretsManager();
  }

  // Default to environment
  return new EnvironmentSecretManager();
}

/**
 * Export singleton
 */
export const secretManager = getSecretManager();

/**
 * Common secrets to manage
 */
export const MANAGED_SECRETS = {
  // JWT
  JWT_SECRET: 'jwt_secret',
  JWT_REFRESH_SECRET: 'jwt_refresh_secret',

  // Database
  DATABASE_URL: 'database_url',
  DATABASE_PASSWORD: 'database_password',

  // External services
  STRIPE_SECRET_KEY: 'stripe_secret_key',
  SENDGRID_API_KEY: 'sendgrid_api_key',
  TWILIO_AUTH_TOKEN: 'twilio_auth_token',

  // Cloudflare
  CLOUDFLARE_API_TOKEN: 'cloudflare_api_token',
  TURNSTILE_SECRET_KEY: 'turnstile_secret_key',

  // OAuth
  GOOGLE_CLIENT_SECRET: 'google_client_secret',
  GITHUB_CLIENT_SECRET: 'github_client_secret',

  // Admin
  AUDIT_LOG_SIGN_KEY: 'audit_log_sign_key',
  ADMIN_ALLOWED_IPS: 'admin_allowed_ips',
} as const;
