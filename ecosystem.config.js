module.exports = {
  apps: [{
    name: 'clickanunt',
    script: './node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/clickanunt',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/clickanunt-error.log',
    out_file: '/var/log/pm2/clickanunt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 3,
    min_uptime: '20s',
    restart_delay: 15000,
    kill_timeout: 10000
  }]
};
