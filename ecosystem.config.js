/**
 * PM2 Ecosystem File
 * Production configuration for ClickAnunț
 */

module.exports = {
  apps: [{
    name: 'clickanunt',
    cwd: '/var/www/clickanunt',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    // ~3.7GB VPS: leave headroom for Postgres + OS; restart before OOM under traffic spikes
    max_memory_restart: '900M',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/root/.pm2/logs/clickanunt-error.log',
    out_file: '/root/.pm2/logs/clickanunt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    // next start nu trimite process.send('ready') — wait_ready:true poate bloca reload PM2
    wait_ready: false,
    listen_timeout: 10000,
    
    // Auto-restart on crash (exponential backoff reduces restart storms)
    min_uptime: '10s',
    max_restarts: 10,
    exp_backoff_restart_delay: 100,
    restart_delay: 1000,
    
    // Log rotation: configure on VPS with `pm2 install pm2-logrotate` (see docs/PRODUCTION_PM2.md)
    
    // Instance management
    increment_var: 'PORT',
    
    // Cluster mode — OFF by default. Requires REDIS_URL + messaging Redis bus + sticky SSE.
    // Do not enable on live until staging load tests pass (see docs/STAGING_REDIS.md).
    // instances: 'max',
    // exec_mode: 'cluster',
  }]
};
