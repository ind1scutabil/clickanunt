#!/bin/bash
# QUICK DEPLOY SCRIPT - Rulează în consola Hetzner
# Copiază tot conținutul acestui fișier și paste în terminal

set -e

echo "🚀 Starting Quick Deploy for clickanunt.ro..."

# Update system
apt-get update
apt-get install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Setup PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE autoplat;
CREATE USER autoplat WITH ENCRYPTED PASSWORD 'Gz082306gz082306@';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
ALTER DATABASE autoplat OWNER TO autoplat;
\q
EOF

# Configure PostgreSQL for local connections
echo "host    autoplat        autoplat        127.0.0.1/32            md5" >> /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create app directory
mkdir -p /var/www/auto-platform
cd /var/www/auto-platform

# Clone or create placeholder
cat > /var/www/auto-platform/.env.production << 'ENVFILE'
DATABASE_URL="postgresql://autoplat:Gz082306gz082306@@localhost:5432/autoplat?schema=public"
NEXT_PUBLIC_SITE_URL="https://clickanunt.ro"
NEXT_PUBLIC_APP_URL="https://clickanunt.ro"
NEXT_PUBLIC_SITE_NAME="ClickAnunț"
NODE_ENV="production"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="contact@clickanunt.ro"
SMTP_PASS="Gz082306gz082306@"
CONTACT_EMAIL="contact@clickanunt.ro"
CONTACT_PHONE="+40784712496"
ENVFILE

# Configure Nginx
cat > /etc/nginx/sites-available/clickanunt << 'NGINXCONF'
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name clickanunt.ro www.clickanunt.ro;
    
    client_max_body_size 10M;
    
    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;
    
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF

# Enable site
ln -sf /etc/nginx/sites-available/clickanunt /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo ""
echo "✅ Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your application code to /var/www/auto-platform/"
echo "2. Run: cd /var/www/auto-platform && npm install"
echo "3. Run: npx prisma migrate deploy"
echo "4. Run: npm run build"
echo "5. Run: pm2 start npm --name auto-platform -- start"
echo "6. Run: pm2 save && pm2 startup"
echo ""
echo "🌐 Your site will be live at: http://clickanunt.ro"
echo "⚠️  SSL will be added after app is running"
echo ""
