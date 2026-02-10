/**
 * Feature Flags & Overload Protection
 * 
 * Allow disabling features during high load without deployment
 */

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions?: Record<string, unknown>;
  enabledAt: number;
  disabledAt?: number;
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  /**
   * Initialize default flags
   */
  private initializeDefaults() {
    this.createFlag('LISTINGS_ENABLED', true, 100);
    this.createFlag('PROMOTIONS_ENABLED', true, 100);
    this.createFlag('MESSAGING_ENABLED', true, 100);
    this.createFlag('PAYMENTS_ENABLED', true, 100);
    this.createFlag('UPLOADS_ENABLED', true, 100);
    this.createFlag('EMAIL_NOTIFICATIONS_ENABLED', true, 100);
    this.createFlag('SEARCH_ENABLED', true, 100);
    this.createFlag('MODERATION_QUEUE_ENABLED', true, 100);
  }

  /**
   * Create new flag
   */
  createFlag(
    name: string,
    enabled: boolean,
    rolloutPercentage: number = 100
  ) {
    this.flags.set(name, {
      name,
      enabled,
      rolloutPercentage,
      enabledAt: Date.now(),
    });
  }

  /**
   * Check if feature is enabled for user
   */
  isEnabled(
    flagName: string,
    userId?: string,
    _metadata?: Record<string, unknown>
  ): boolean {
    void _metadata;
    const flag = this.flags.get(flagName);
    if (!flag) return true; // Default to enabled if flag doesn't exist

    if (!flag.enabled) return false;

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUser(userId || 'anonymous');
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Enable flag
   */
  enable(flagName: string, rolloutPercentage: number = 100) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = true;
      flag.rolloutPercentage = rolloutPercentage;
      flag.enabledAt = Date.now();
      delete flag.disabledAt;
      console.log(`✅ Feature enabled: ${flagName}`);
    }
  }

  /**
   * Disable flag
   */
  disable(flagName: string) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = false;
      flag.disabledAt = Date.now();
      console.log(`❌ Feature disabled: ${flagName}`);
    }
  }

  /**
   * Set rollout percentage
   */
  setRollout(flagName: string, percentage: number) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      console.log(
        `📊 Rollout set for ${flagName}: ${flag.rolloutPercentage}%`
      );
    }
  }

  /**
   * Hash user for consistent rollout
   */
  private hashUser(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get all flags status
   */
  getStatus() {
    return Object.fromEntries(
      Array.from(this.flags.entries()).map(([name, flag]) => [
        name,
        {
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
          enabledAt: new Date(flag.enabledAt),
          disabledAt: flag.disabledAt ? new Date(flag.disabledAt) : null,
        },
      ])
    );
  }
}

export const featureFlagManager = new FeatureFlagManager();

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by failing fast
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number; // failures before opening
  successThreshold: number; // successes before closing
  timeout: number; // ms before half-open
  onOpen?: () => void;
  onClose?: () => void;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...config,
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.config.timeout
      ) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.getName()}`);
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.close();
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.config.failureThreshold) {
        this.open();
      }

      throw error;
    }
  }

  /**
   * Open circuit
   */
  private open() {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      console.error(`⚠️ Circuit breaker OPEN: ${this.getName()}`);
      this.config.onOpen?.();
    }
  }

  /**
   * Close circuit
   */
  private close() {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      console.log(`✅ Circuit breaker CLOSED: ${this.getName()}`);
      this.config.onClose?.();
    }
  }

  /**
   * Get circuit state
   */
  getState() {
    return this.state;
  }

  /**
   * Get name for logging
   */
  private getName(): string {
    return 'CircuitBreaker';
  }
}

/**
 * Circuit breakers for critical services
 */
export const circuitBreakers = {
  database: new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
  }),

  externalAPI: new CircuitBreaker({
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,
  }),

  email: new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 120000,
  }),

  payment: new CircuitBreaker({
    failureThreshold: 2,
    successThreshold: 1,
    timeout: 60000,
  }),
};
