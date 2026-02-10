/**
 * Metrics Collection & Dashboard
 * 
 * Collects P95/P99 latency, error rates, availability
 * Exposes metrics for monitoring dashboards
 */

import { alertManager } from './alerts';
import { calculateBurnRate, SLOs } from './slo';

export interface MetricsSnapshot {
  timestamp: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
  };
  errorRate: number;
  availability: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
}

class MetricsCollector {
  private latencies: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private maxSize = 10000; // Keep last 10k requests in memory

  /**
   * Record request metrics
   */
  recordRequest(duration: number, status: number) {
    this.latencies.push(duration);
    this.requestCount++;

    if (status >= 400) {
      this.errorCount++;
    }

    // Keep memory bounded
    if (this.latencies.length > this.maxSize) {
      this.latencies = this.latencies.slice(-this.maxSize);
    }

    // Check for SLO violations
    this.checkSLOViolations();
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): MetricsSnapshot {
    const successful = this.requestCount - this.errorCount;

    return {
      timestamp: Date.now(),
      latency: {
        p50: this.percentile(this.latencies, 50),
        p95: this.percentile(this.latencies, 95),
        p99: this.percentile(this.latencies, 99),
        mean: this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length || 0,
      },
      errorRate: this.requestCount === 0 ? 0 : this.errorCount / this.requestCount,
      availability: this.requestCount === 0 ? 1 : successful / this.requestCount,
      requests: {
        total: this.requestCount,
        successful,
        failed: this.errorCount,
      },
    };
  }

  /**
   * Check SLO violations and create alerts
   */
  private checkSLOViolations() {
    const metrics = this.getMetrics();
    const window = (Date.now() - this.startTime) / 1000;

    // Check P95 latency SLO
    if (metrics.latency.p95 > SLOs.P95_LATENCY.target) {
      const burnRate = calculateBurnRate(
        metrics.latency.p95 - SLOs.P95_LATENCY.target,
        SLOs.P95_LATENCY.target,
        Math.min(window, 300) // Check last 5 minutes
      );

      if (burnRate.rate > 2) {
        alertManager.createAlert(
          'P95 Latency',
          burnRate,
          SLOs.P95_LATENCY.errorBudget * (1 - (metrics.latency.p95 / SLOs.P95_LATENCY.target)),
          SLOs.P95_LATENCY.errorBudget
        );
      }
    }

    // Check error rate SLO
    if (metrics.errorRate > (1 - SLOs.ERROR_RATE.target)) {
      const burnRate = calculateBurnRate(
        metrics.errorRate,
        1 - SLOs.ERROR_RATE.target,
        Math.min(window, 300)
      );

      if (burnRate.rate > 2) {
        alertManager.createAlert(
          'Error Rate',
          burnRate,
          SLOs.ERROR_RATE.errorBudget * (1 - metrics.errorRate),
          SLOs.ERROR_RATE.errorBudget
        );
      }
    }

    // Check availability SLO
    if (metrics.availability < SLOs.AVAILABILITY.target) {
      const burnRate = calculateBurnRate(
        1 - metrics.availability,
        1 - SLOs.AVAILABILITY.target,
        Math.min(window, 300)
      );

      if (burnRate.rate > 2) {
        alertManager.createAlert(
          'Availability',
          burnRate,
          SLOs.AVAILABILITY.errorBudget * metrics.availability,
          SLOs.AVAILABILITY.errorBudget
        );
      }
    }
  }

  /**
   * Reset metrics (e.g., daily)
   */
  reset() {
    this.latencies = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }
}

export const metricsCollector = new MetricsCollector();
