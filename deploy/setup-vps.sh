#!/bin/bash
# VPS Setup Script for Hetzner Ubuntu 22.04
# Run as root: sudo bash setup-vps.sh

set -e

echo "🚀 Starting VPS setup for auto-platform..."

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt-get install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    postgresql-14 \
    postgresql-contrib-14 \
    htop \
    build-essential

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE autoplat;
CREATE USER autoplat WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
ALTER DATABASE autoplat OWNER TO autoplat;
\q
EOF

# Configure PostgreSQL for remote connections (optional)
echo "host    autoplat        autoplat        127.0.0.1/32            md5" >> /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql

# Setup firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
echo "🛡️ Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl restart fail2ban

# Create app user
echo "👤 Creating app user..."
if ! id -u appuser > /dev/null 2>&1; then
    useradd -m -s /bin/bash appuser
    usermod -aG sudo appuser
fi

# Setup app directory
echo "📁 Setting up app directory..."
mkdir -p /var/www/auto-platform
chown -R appuser:appuser /var/www/auto-platform

# Setup logs directory
mkdir -p /var/log/auto-platform
chown -R appuser:appuser /var/log/auto-platform

# Configure Nginx
echo "🌐 Configuring Nginx..."
rm -f /etc/nginx/sites-enabled/default

# Copy nginx config (will be done manually)
echo "⚠️  Copy your nginx.conf to /etc/nginx/sites-available/auto-platform"
echo "⚠️  Then run: ln -s /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/"

# Setup SSL certificate directory
mkdir -p /var/www/certbot

# Test Nginx configuration
nginx -t || echo "⚠️  Nginx config test failed - fix before continuing"

# Setup log rotation
cat > /etc/logrotate.d/auto-platform <<EOF
/var/log/auto-platform/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/auto-platform-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Setup automatic security updates
echo "🔄 Enabling automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Setup backup directory
mkdir -p /var/backups/auto-platform
chown -R appuser:appuser /var/backups/auto-platform

# Install Cloudflare SSL origin certificate (optional, manual step)
mkdir -p /etc/ssl/cloudflare

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set PostgreSQL password in /var/www/auto-platform/.env"
echo "2. Copy nginx.conf to /etc/nginx/sites-available/auto-platform"
echo "3. Create symlink: ln -s /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/"
echo "4. Obtain SSL certificate: certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "5. Deploy app code to /var/www/auto-platform"
echo "6. Setup PM2: pm2 start ecosystem.config.js --env production"
echo "7. Save PM2 startup: pm2 startup && pm2 save"
echo "8. Setup backup cron: crontab -e (as appuser)"
echo ""
echo "🔐 IMPORTANT: Change default PostgreSQL password!"
echo "   sudo -u postgres psql -c \"ALTER USER autoplat WITH PASSWORD 'your-secure-password';\""
echo ""
