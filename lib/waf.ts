/**
 * WAF Rules - Pattern-based abuse detection
 * 
 * Detects and blocks common attack patterns:
 * - SQL injection
 * - XSS attempts
 * - Path traversal
 * - Command injection
 * - XXE attacks
 */

export interface WAFRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'challenge' | 'log';
  enabled: boolean;
}

export interface WAFMatch {
  rule: WAFRule;
  input: string;
  timestamp: number;
}

class WAFEngine {
  private rules: WAFRule[] = [];
  private matches: WAFMatch[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize default WAF rules
   */
  private initializeRules() {
    // SQL Injection patterns
    this.addRule({
      id: 'sql-union',
      name: 'SQL UNION-based injection',
      pattern: /(\bUNION\b.*\bSELECT\b|\bUNION\b.*\bFROM\b)/i,
      severity: 'critical',
      action: 'block',
      enabled: true,
    });

    this.addRule({
      id: 'sql-or',
      name: 'SQL OR-based injection',
      pattern: /(\'\s+OR\s+[\'\"]?\d[\'\"]?\s*=|\'\s+OR\s+1\s*=\s*1)/i,
      severity: 'high',
      action: 'block',
      enabled: true,
    });

    // XSS patterns
    this.addRule({
      id: 'xss-script',
      name: 'Script tag injection',
      pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
      severity: 'critical',
      action: 'block',
      enabled: true,
    });

    this.addRule({
      id: 'xss-event',
      name: 'Event handler injection',
      pattern: /\b(on\w+)\s*=\s*[\"\']/i,
      severity: 'high',
      action: 'block',
      enabled: true,
    });

    // Path traversal
    this.addRule({
      id: 'path-traversal',
      name: 'Path traversal attack',
      pattern: /(\.\.[\/\\]|\.\.%2[fF])/,
      severity: 'high',
      action: 'block',
      enabled: true,
    });

    // Command injection
    this.addRule({
      id: 'command-injection',
      name: 'Command injection',
      pattern: /[;|`$(){}[\]<>&]\s*(cat|ls|rm|whoami|bash|sh|cmd)/i,
      severity: 'critical',
      action: 'block',
      enabled: true,
    });

    // XXE attacks
    this.addRule({
      id: 'xxe-attack',
      name: 'XXE (XML External Entity)',
      pattern: /<!ENTITY\s+\w+\s+SYSTEM/i,
      severity: 'critical',
      action: 'block',
      enabled: true,
    });

    // LDAP injection
    this.addRule({
      id: 'ldap-injection',
      name: 'LDAP injection',
      pattern: /[\*\(\)&\|]/,
      severity: 'medium',
      action: 'challenge',
      enabled: true,
    });

    // Null byte injection
    this.addRule({
      id: 'null-byte',
      name: 'Null byte injection',
      pattern: /%00|\\x00/,
      severity: 'high',
      action: 'block',
      enabled: true,
    });
  }

  /**
   * Add custom WAF rule
   */
  addRule(rule: WAFRule) {
    this.rules.push(rule);
  }

  /**
   * Check input against all rules
   */
  check(input: string, context?: { ip: string; userId?: string }): WAFMatch[] {
    const matches: WAFMatch[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (rule.pattern.test(input)) {
        const match: WAFMatch = {
          rule,
          input: input.substring(0, 200), // Truncate for logging
          timestamp: Date.now(),
        };

        matches.push(match);
        this.recordMatch(match, context);

        // If rule action is block, return immediately
        if (rule.action === 'block') {
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Record WAF match for analysis
   */
  private recordMatch(match: WAFMatch, context?: { ip: string; userId?: string }) {
    this.matches.push(match);

    // Keep only last 1000 matches
    if (this.matches.length > 1000) {
      this.matches = this.matches.slice(-1000);
    }

    // Log suspicious activity
    if (match.rule.severity === 'critical') {
      console.error('🚨 WAF CRITICAL:', {
        rule: match.rule.name,
        input: match.input,
        ip: context?.ip,
        userId: context?.userId,
        timestamp: new Date(match.timestamp).toISOString(),
      });
    }
  }

  /**
   * Get action for match
   */
  getAction(matches: WAFMatch[]): 'allow' | 'challenge' | 'block' {
    if (matches.some(m => m.rule.action === 'block')) {
      return 'block';
    }
    if (matches.some(m => m.rule.action === 'challenge')) {
      return 'challenge';
    }
    return 'allow';
  }

  /**
   * Get recent suspicious activity
   */
  getRecentMatches(limit: number = 100): WAFMatch[] {
    return this.matches.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byRule: Record<string, number> = {};

    for (const match of this.matches) {
      bySeverity[match.rule.severity]++;
      byRule[match.rule.id] = (byRule[match.rule.id] || 0) + 1;
    }

    return { bySeverity, byRule, total: this.matches.length };
  }
}

export const wafEngine = new WAFEngine();
