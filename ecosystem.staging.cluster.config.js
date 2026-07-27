/**
 * Optional PM2 cluster config for staging load tests ONLY.
 * Requires dedicated staging Redis + sticky sessions / messaging bus.
 * Do not use on production. See docs/STAGING_ENVIRONMENT.md.
 *
 * Same REQUIRED_* / isolation rules as ecosystem.staging.config.js.
 */
module.exports = {
  apps: [
    {
      name: 'clickanunt-staging',
      cwd: process.env.STAGING_APP_CWD || '/var/www/clickanunt-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      interpreter: 'node',
      instances: 2,
      exec_mode: 'cluster',
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
      increment_var: 'PORT',
    },
  ],
};
