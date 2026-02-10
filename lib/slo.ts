/**
 * Service Level Objectives (SLO) Framework
 * 
 * Defines SLI/SLO targets and burn-rate calculations
 * - P95 Latency: <500ms (99.9% uptime target)
 * - Error Rate: <0.1% (99.9% success target)
 * - Availability: >99.9%
 */

export interface SLO {
  name: string;
  target: number; // e.g., 0.999 for 99.9%
  window: number; // time window in seconds (e.g., 30 days)
  errorBudget: number; // errors allowed in window
}

export interface SLI {
  name: string;
  value: number; // current value (0-1)
  threshold: number; // target threshold
  timestamp: number;
}

// SLO Definitions
export const SLOs = {
  AVAILABILITY: {
    name: 'Availability',
    target: 0.999, // 99.9%
    window: 30 * 24 * 60 * 60, // 30 days
    errorBudget: 0.001 * 30 * 24 * 60 * 60 * 1000, // ms
  } as SLO,
  
  ERROR_RATE: {
    name: 'Error Rate',
    target: 0.999, // 99.9% success
    window: 30 * 24 * 60 * 60,
    errorBudget: 0.001, // 0.1% errors allowed
  } as SLO,
  
  P95_LATENCY: {
    name: 'P95 Latency',
    target: 500, // 500ms
    window: 30 * 24 * 60 * 60,
    errorBudget: 0.1 * 30 * 24 * 60 * 60, // 10% of requests can exceed
  } as SLO,
};

/**
 * Burn rate - how fast error budget is consumed
 * 1.0 = consuming budget at target rate
 * >1.0 = consuming faster than sustainable
 */
export interface BurnRate {
  rate: number; // multiples of target rate
  window: number; // observation window in seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Calculate burn rate
 */
export function calculateBurnRate(
  errorBudgetUsed: number,
  totalBudget: number,
  windowSeconds: number,
  sloWindow: number = 30 * 24 * 60 * 60
): BurnRate {
  const budgetFraction = errorBudgetUsed / totalBudget;
  const expectedFraction = windowSeconds / sloWindow;
  const rate = budgetFraction / expectedFraction;

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (rate > 10) severity = 'critical';
  else if (rate > 5) severity = 'high';
  else if (rate > 2) severity = 'medium';

  return { rate, window: windowSeconds, severity };
}

/**
 * Check if SLO is violated
 */
export function isSLOViolated(
  burnRate: BurnRate,
  window: number
): boolean {
  // Alert if burn rate > 6x for 5 min OR > 3x for 30 min
  void window;
  if (burnRate.window <= 5 * 60 && burnRate.rate > 6) return true;
  if (burnRate.window <= 30 * 60 && burnRate.rate > 3) return true;
  if (burnRate.window <= 2 * 60 * 60 && burnRate.rate > 1.5) return true;

  return false;
}

/**
 * Estimate time until error budget exhausted
 */
export function timeUntilBudgetExhausted(
  budgetRemaining: number,
  burnRate: BurnRate,
  budgetTotal: number
): number {
  if (burnRate.rate <= 0) return Infinity;
  
  const consumptionRate = (budgetTotal / (30 * 24 * 60 * 60)) * burnRate.rate;
  return budgetRemaining / consumptionRate; // seconds
}
