/**
 * PM2 ecosystem for ClickAnunț STAGING only.
 *
 * Before use:
 * - Replace REQUIRED_* placeholders in the server .env (never commit real secrets).
 * - Set STAGING_APP_CWD to the real staging app directory on the staging host.
 * - Do NOT point at production IP 46.225.69.155 without explicit isolation approval.
 * - Do NOT set E2E_DISABLE_RATE_LIMIT or CLICKANUNT_E2E_SERVER.
 * - Stripe keys must be sk_test_ / pk_test_ only.
 *
 * Start (on staging host, after placeholders are resolved):
 *   pm2 start ecosystem.staging.config.js
 */
module.exports = {
  apps: [
    {
      name: 'clickanunt-staging',
      // Override on host via env STAGING_APP_CWD after provisioning
      cwd: process.env.STAGING_APP_CWD || '/var/www/clickanunt-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        STAGING_SITE: '1',
        NEXT_PUBLIC_STAGING_SITE: '1',
      },
      error_file: './logs/clickanunt-staging-error.log',
      out_file: './logs/clickanunt-staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      min_uptime: '10s',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      restart_delay: 1000,
    },
  ],
};
