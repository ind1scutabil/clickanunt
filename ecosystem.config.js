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
    max_memory_restart: '500M',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      /** Oprește sk_test_/pk_test_ pe site-ul public; setează în .env chei LIVE + pm2 reload */
      STRIPE_REQUIRE_LIVE: '1',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      STRIPE_REQUIRE_LIVE: '1',
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
    
    // Auto-restart on crash
    min_uptime: '10s',
    max_restarts: 10,
    
    // Instance management
    increment_var: 'PORT',
    
    // Advanced features (uncomment if needed)
    // instances: 'max',  // Use all CPU cores
    // exec_mode: 'cluster',  // Cluster mode (requires Redis for rate limiting)
  }]
};
