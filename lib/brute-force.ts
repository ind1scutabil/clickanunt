/**
 * Brute Force Attack Detection & Protection
 * 
 * Features:
 * - Exponential backoff on failed attempts
 * - Account lockout
 * - IP-based detection
 * - CAPTCHA challenge
 */

interface BruteForcePenalty {
  lockoutUntil?: number;
  attemptCount: number;
  lastAttempt: number;
  backoffMultiplier: number;
}

class BruteForceDetector {
  private failures: Map<string, BruteForcePenalty> = new Map();
  private successfulLogins: Set<string> = new Set();

  /**
   * Record failed login attempt
   */
  recordFailure(identifier: string): {
    isLocked: boolean;
    lockoutUntil?: number;
    nextRetryAfter?: number;
    attemptCount: number;
    requiresCaptcha: boolean;
  } {
    const now = Date.now();
    const penalty = this.failures.get(identifier) || {
      attemptCount: 0,
      lastAttempt: now,
      backoffMultiplier: 1,
    };

    // Check if currently locked out
    if (penalty.lockoutUntil && now < penalty.lockoutUntil) {
      return {
        isLocked: true,
        lockoutUntil: penalty.lockoutUntil,
        nextRetryAfter: Math.ceil((penalty.lockoutUntil - now) / 1000),
        attemptCount: penalty.attemptCount,
        requiresCaptcha: true,
      };
    }

    penalty.attemptCount++;
    penalty.lastAttempt = now;

    const result = {
      isLocked: false,
      attemptCount: penalty.attemptCount,
      requiresCaptcha: false,
    };

    // Progressive lockout strategy
    if (penalty.attemptCount >= 10) {
      // Permanent lockout after 10 attempts
      const lockoutTime = now + 24 * 60 * 60 * 1000; // 24 hours
      penalty.lockoutUntil = lockoutTime;
      result.isLocked = true;
      result.requiresCaptcha = true;

      console.warn(`🔒 Account locked: ${identifier}`);
    } else if (penalty.attemptCount >= 5) {
      // Exponential backoff after 5 attempts
      const backoffMs = Math.min(
        1000 * Math.pow(2, penalty.attemptCount - 5), // 2^n seconds
        5 * 60 * 1000 // Cap at 5 minutes
      );

      const lockoutTime = now + backoffMs;
      penalty.lockoutUntil = lockoutTime;
      result.isLocked = true;
      result.requiresCaptcha = true;

      console.warn(
        `⏱️ Exponential backoff for ${identifier}: ${Math.ceil(backoffMs / 1000)}s`
      );
    } else if (penalty.attemptCount >= 3) {
      // CAPTCHA required after 3 attempts
      result.requiresCaptcha = true;
    }

    this.failures.set(identifier, penalty);
    return result;
  }

  /**
   * Record successful login
   */
  recordSuccess(identifier: string) {
    this.failures.delete(identifier);
    this.successfulLogins.add(identifier);

    console.log(`✅ Successful login: ${identifier}`);
  }

  /**
   * Check if identifier is locked
   */
  isLocked(identifier: string): boolean {
    const penalty = this.failures.get(identifier);
    if (!penalty?.lockoutUntil) return false;

    if (penalty.lockoutUntil < Date.now()) {
      this.failures.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Check if CAPTCHA required
   */
  requiresCaptcha(identifier: string): boolean {
    const penalty = this.failures.get(identifier);
    return !penalty ? false : penalty.attemptCount >= 3;
  }

  /**
   * Manually unlock account (admin action)
   */
  unlock(identifier: string) {
    this.failures.delete(identifier);
    console.log(`🔓 Account unlocked: ${identifier}`);
  }

  /**
   * Get account status
   */
  getStatus(identifier: string) {
    const penalty = this.failures.get(identifier);

    if (!penalty) {
      return {
        status: 'normal',
        attemptCount: 0,
        locked: false,
      };
    }

    const locked = penalty.lockoutUntil && penalty.lockoutUntil > Date.now();

    return {
      status: locked ? 'locked' : 'monitoring',
      attemptCount: penalty.attemptCount,
      locked,
      lockoutUntil: penalty.lockoutUntil,
      lastAttempt: new Date(penalty.lastAttempt),
    };
  }

  /**
   * Check for distributed attacks (multiple IPs, same username)
   */
  checkDistributedAttack(
    username: string,
    ipAddresses: string[]
  ): {
    isAttack: boolean;
    uniqueIPs: number;
    severity: 'low' | 'medium' | 'high';
  } {
    const uniqueIPs = new Set(ipAddresses).size;

    return {
      isAttack: uniqueIPs >= 5, // 5+ different IPs
      uniqueIPs,
      severity: uniqueIPs >= 10 ? 'high' : uniqueIPs >= 5 ? 'medium' : 'low',
    };
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, penalty] of this.failures.entries()) {
      // Remove if no lockout and > 1 hour old
      if (
        !penalty.lockoutUntil &&
        now - penalty.lastAttempt > 60 * 60 * 1000
      ) {
        this.failures.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      monitored: this.failures.size,
      locked: Array.from(this.failures.values()).filter(
        p => p.lockoutUntil && p.lockoutUntil > Date.now()
      ).length,
      totalFailures: Array.from(this.failures.values()).reduce(
        (sum, p) => sum + p.attemptCount,
        0
      ),
    };
  }
}

export const bruteForceDetector = new BruteForceDetector();

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    bruteForceDetector.cleanup();
  }, 10 * 60 * 1000);
}
