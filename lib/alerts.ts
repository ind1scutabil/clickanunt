/**
 * Alerting System based on Burn-Rate
 * 
 * Sends alerts when error budget is being consumed too quickly
 * Integrates with Slack, PagerDuty, email, etc.
 */

import { BurnRate, SLOs, isSLOViolated } from './slo';

export interface Alert {
  id: string;
  slo: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  burnRate: number;
  budget: {
    remaining: number;
    total: number;
    percentUsed: number;
  };
  timestamp: number;
  resolved: boolean;
}

class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private webhooks: string[] = [];

  /**
   * Register webhook for alerts (Slack, PagerDuty, etc)
   */
  registerWebhook(url: string) {
    this.webhooks.push(url);
  }

  /**
   * Create alert from burn rate
   */
  createAlert(
    sloName: string,
    burnRate: BurnRate,
    budgetRemaining: number,
    budgetTotal: number
  ): Alert | null {
    if (!isSLOViolated(burnRate, SLOs.AVAILABILITY.window)) {
      return null;
    }

    const alert: Alert = {
      id: `${sloName}-${Date.now()}`,
      slo: sloName,
      severity: burnRate.severity,
      message: this.generateMessage(sloName, burnRate),
      burnRate: burnRate.rate,
      budget: {
        remaining: budgetRemaining,
        total: budgetTotal,
        percentUsed: ((budgetTotal - budgetRemaining) / budgetTotal) * 100,
      },
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.set(alert.id, alert);
    this.sendAlert(alert);
    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alertId}`);
    }
  }

  /**
   * Send alert to all configured webhooks
   */
  private async sendAlert(alert: Alert) {
    const payload = this.formatAlertPayload(alert);

    for (const webhook of this.webhooks) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(err => {
          console.error(`Failed to send alert to ${webhook}:`, err.message);
        });
      } catch (error) {
        console.error('Alert delivery error:', error);
      }
    }

    // Log to console
    this.logAlert(alert);
  }

  /**
   * Format alert for different platforms
   */
  private formatAlertPayload(alert: Alert) {
    return {
      // Slack format
      text: `⚠️ ${alert.severity.toUpperCase()} - ${alert.slo}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: alert.message,
        fields: [
          {
            title: 'Burn Rate',
            value: `${alert.burnRate.toFixed(2)}x`,
            short: true,
          },
          {
            title: 'Error Budget Used',
            value: `${alert.budget.percentUsed.toFixed(2)}%`,
            short: true,
          },
          {
            title: 'Timestamp',
            value: new Date(alert.timestamp).toISOString(),
            short: false,
          },
        ],
      }],
      // PagerDuty format
      routing_key: process.env.PAGERDUTY_KEY,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        severity: alert.severity,
        source: 'auto-platform-slo-monitor',
        custom_details: alert,
      },
    };
  }

  /**
   * Log alert to console
   */
  private logAlert(alert: Alert) {
    const icons = {
      low: '⚠️',
      medium: '⚠️⚠️',
      high: '🚨',
      critical: '🔴',
    };

    console.error(
      `${icons[alert.severity]} SLO ALERT [${alert.severity.toUpperCase()}]`,
      {
        slo: alert.slo,
        message: alert.message,
        burnRate: `${alert.burnRate.toFixed(2)}x`,
        budgetUsed: `${alert.budget.percentUsed.toFixed(2)}%`,
        timestamp: new Date(alert.timestamp).toISOString(),
      }
    );
  }

  /**
   * Generate alert message
   */
  private generateMessage(sloName: string, burnRate: BurnRate): string {
    const slo = Object.values(SLOs).find(s => s.name === sloName);
    if (!slo) return 'Unknown SLO alert';

    if (burnRate.rate > 10) {
      return `🔴 CRITICAL: ${sloName} error budget exhausting at ${burnRate.rate.toFixed(1)}x rate. Immediate action required.`;
    } else if (burnRate.rate > 5) {
      return `🚨 HIGH: ${sloName} burn rate ${burnRate.rate.toFixed(1)}x. Page on-call engineer.`;
    } else if (burnRate.rate > 2) {
      return `⚠️ MEDIUM: ${sloName} burn rate elevated at ${burnRate.rate.toFixed(1)}x. Monitor closely.`;
    }

    return `Low burn rate ${burnRate.rate.toFixed(2)}x on ${sloName}`;
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff6600',
      critical: '#ff0000',
    };
    return colors[severity as keyof typeof colors] || '#cccccc';
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get alert status summary
   */
  getAlertSummary() {
    const active = this.getActiveAlerts();
    return {
      total: active.length,
      critical: active.filter(a => a.severity === 'critical').length,
      high: active.filter(a => a.severity === 'high').length,
      medium: active.filter(a => a.severity === 'medium').length,
      low: active.filter(a => a.severity === 'low').length,
    };
  }
}

export const alertManager = new AlertManager();

// Configure webhooks from environment
if (process.env.SLACK_WEBHOOK_URL) {
  alertManager.registerWebhook(process.env.SLACK_WEBHOOK_URL);
}
if (process.env.PAGERDUTY_KEY) {
  alertManager.registerWebhook(`https://events.pagerduty.com/v2/enqueue`);
}
