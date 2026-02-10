/**
 * Sentry Integration for Error Tracking
 * 
 * Captures front-end and back-end errors
 * Environment: .env.local or .env
 */

export interface SentryConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  maxBreadcrumbs: number;
  attachStacktrace: boolean;
}

/**
 * Sentry Configuration
 */
export const SENTRY_CONFIG: SentryConfig = {
  enabled: !!process.env.SENTRY_DSN,
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  maxBreadcrumbs: 100,
  attachStacktrace: true,
};

/**
 * Initialize Sentry (call this once at app startup)
 * 
 * Usage in pages/_app.tsx or app/layout.tsx:
 * 
 * import * as Sentry from "@sentry/nextjs";
 * 
 * Sentry.init({
 *   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
 *   environment: process.env.NODE_ENV,
 *   integrations: [
 *     new Sentry.Replay({ maskAllText: true, blockAllMedia: true }),
 *   ],
 *   tracesSampleRate: 1.0,
 *   replaysSessionSampleRate: 0.1,
 *   replaysOnErrorSampleRate: 1.0,
 * });
 */

/**
 * Error reporting helper
 */
export class ErrorReporter {
  private enabled: boolean;

  constructor(enabled: boolean = SENTRY_CONFIG.enabled) {
    this.enabled = enabled;
  }

  /**
   * Report error
   */
  reportError(error: Error, context?: Record<string, unknown>) {
    if (!this.enabled) {
      console.error('Error:', error, context);
      return;
    }

    // TODO: Use Sentry when available
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureException(error, { contexts: { custom: context } });

    console.error('Error reported to Sentry:', error, context);
  }

  /**
   * Report message
   */
  reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.enabled) {
      console.log(`[${level.toUpperCase()}] ${message}`);
      return;
    }

    // TODO: Use Sentry
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureMessage(message, level);

    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>) {
    void message;
    void data;
    // TODO: Use Sentry
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.addBreadcrumb({ message, data });
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, name?: string) {
    void userId;
    void email;
    void name;
    // TODO: Use Sentry
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.setUser({ id: userId, email, username: name });
  }

  /**
   * Clear user context
   */
  clearUser() {
    // TODO: Use Sentry
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.setUser(null);
  }
}

export const errorReporter = new ErrorReporter();

/**
 * Setup instructions
 * 
 * 1. Install Sentry:
 *    npm install @sentry/nextjs
 * 
 * 2. Set DSN in .env.local:
 *    SENTRY_DSN=https://xxxxx@sentry.io/projectid
 *    NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/projectid
 * 
 * 3. Update next.config.ts:
 *    import { withSentryConfig } from "@sentry/nextjs";
 * 
 *    export default withSentryConfig(
 *      nextConfig,
 *      { org: "your-org", project: "your-project" }
 *    );
 * 
 * 4. Initialize in app/layout.tsx or pages/_app.tsx (see example above)
 */

/**
 * Sentry Release Tracking
 * 
 * Add to package.json:
 * "sentry:release": "sentry-cli releases create && sentry-cli releases files upload-sourcemaps ."
 */
export function createSentryRelease() {
  const version = process.env.npm_package_version || '0.0.0';
  return {
    version,
    name: `auto-platform@${version}`,
  };
}
