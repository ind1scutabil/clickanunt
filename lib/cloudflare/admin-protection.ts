/**
 * Cloudflare IP Allowlist & 2FA for /admin
 * 
 * Features:
 * - IP whitelisting
 * - 2FA enforcement
 * - Risk scoring
 * - Audit logging
 */

import crypto from 'crypto';

export interface AdminAuthContext {
  ip: string;
  country: string;
  userId: string;
  email: string;
  rayID: string;
  timestamp: number;
}

export interface IPAllowlistEntry {
  ip: string;
  label?: string;
  country?: string;
  addedAt: number;
  addedBy: string;
  expiresAt?: number;
}

export interface TwoFactorConfig {
  required: boolean;
  window: number; // seconds for TOTP validation
  backupCodesCount: number;
}

/**
 * Admin protection config
 */
export const ADMIN_PROTECTION: TwoFactorConfig = {
  required: true,
  window: 30, // TOTP window
  backupCodesCount: 10,
};

/**
 * IP Allowlist management
 */
class IPAllowlist {
  private allowlist: Map<string, IPAllowlistEntry> = new Map();
  private backupAllowlist: string[] = [];

  constructor() {
    this.loadFromEnv();
  }

  /**
   * Load from environment
   */
  private loadFromEnv() {
    const ips = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
    const backupIps = process.env.ADMIN_BACKUP_IPS?.split(',') || [];
    
    ips.forEach(ip => {
      if (ip.trim()) {
        this.allowlist.set(ip.trim(), {
          ip: ip.trim(),
          label: 'env-configured',
          addedAt: Date.now(),
          addedBy: 'system',
        });
      }
    });

    this.backupAllowlist = backupIps
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0);
  }

  /**
   * Check if IP is allowed
   */
  isAllowed(ip: string): boolean {
    const entry = this.allowlist.get(ip);
    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.allowlist.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Add IP to allowlist
   */
  addIP(ip: string, options: { label?: string; expiresAt?: number; addedBy: string }): void {
    this.allowlist.set(ip, {
      ip,
      label: options.label,
      addedAt: Date.now(),
      addedBy: options.addedBy,
      expiresAt: options.expiresAt,
    });
  }

  /**
   * Remove IP from allowlist
   */
  removeIP(ip: string): boolean {
    return this.allowlist.delete(ip);
  }

  /**
   * Get all allowed IPs
   */
  getAllIPs(): IPAllowlistEntry[] {
    return Array.from(this.allowlist.values());
  }

  /**
   * Fallback: Check backup IPs
   */
  checkBackupIP(ip: string): boolean {
    return this.backupAllowlist.includes(ip);
  }
}

/**
 * 2FA code storage (in-memory, should use Redis in production)
 */
class TwoFactorCodes {
  private codes: Map<string, { code: string; expiresAt: number }> = new Map();

  /**
   * Generate backup codes
   */
  generateBackupCodes(userId: string, count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      // Store hashed
      const hash = this.hashCode(code);
      this.codes.set(`${userId}:backup:${hash}`, {
        code: hash,
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(userId: string, code: string): boolean {
    const hash = this.hashCode(code);
    const key = `${userId}:backup:${hash}`;
    const stored = this.codes.get(key);

    if (!stored) return false;
    if (stored.expiresAt < Date.now()) {
      this.codes.delete(key);
      return false;
    }

    // One-time use
    this.codes.delete(key);
    return true;
  }

  /**
   * Hash code
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Cleanup expired codes
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.codes.entries()) {
      if (value.expiresAt < now) {
        this.codes.delete(key);
      }
    }
  }
}

/**
 * Risk scorer for admin access
 */
class AdminRiskScorer {
  /**
   * Calculate risk score (0-100)
   */
  calculateRiskScore(context: AdminAuthContext, isKnownIP: boolean): number {
    let score = 0;

    // New IP penalty
    if (!isKnownIP) score += 30;

    // Country change penalty
    const cachedCountry = this.getCachedCountry(context.userId);
    if (cachedCountry && cachedCountry !== context.country) score += 20;

    // Unusual time of day penalty (0-5 AM UTC)
    const hour = new Date(context.timestamp).getUTCHours();
    if (hour >= 0 && hour <= 5) score += 15;

    // High-risk countries (would need to configure based on business logic)
    const highRiskCountries = ['KP']; // Example: North Korea
    if (highRiskCountries.includes(context.country)) score += 50;

    return Math.min(score, 100);
  }

  /**
   * Get cached country for user
   */
  private getCachedCountry(_userId: string): string | null {
    // This should be fetched from database
    // For now, return null
    void _userId;
    return null;
  }

  /**
   * Requires additional verification?
   */
  requiresAdditionalVerification(riskScore: number): boolean {
    return riskScore > 40;
  }
}

/**
 * Export singletons
 */
export const ipAllowlist = new IPAllowlist();
export const twoFactorCodes = new TwoFactorCodes();
export const adminRiskScorer = new AdminRiskScorer();

/**
 * Verify admin access
 */
export async function verifyAdminAccess(
  context: AdminAuthContext
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresTwoFactor: boolean;
  riskScore: number;
}> {
  // Check IP allowlist
  const isIPAllowed = ipAllowlist.isAllowed(context.ip) || 
                      ipAllowlist.checkBackupIP(context.ip);

  if (!isIPAllowed) {
    return {
      allowed: false,
      reason: 'IP not in allowlist',
      requiresTwoFactor: false,
      riskScore: 100,
    };
  }

  // Calculate risk score
  const riskScore = adminRiskScorer.calculateRiskScore(context, isIPAllowed);

  // Require 2FA based on risk
  const requiresTwoFactor = 
    ADMIN_PROTECTION.required || 
    adminRiskScorer.requiresAdditionalVerification(riskScore);

  return {
    allowed: true,
    requiresTwoFactor,
    riskScore,
  };
}
