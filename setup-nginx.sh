#!/bin/bash

# ClickAnunț - Nginx Configuration Setup

set -e

echo "🔧 Configurare Nginx pentru ClickAnunț"
echo "======================================"
echo ""

# Get domain or use default
DOMAIN=${1:-www.clickanunt.ro}

echo "Configuring for domain: $DOMAIN"

# Create Nginx config
cat > /etc/nginx/sites-available/clickanunt << 'EOF'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name clickanunt.ro www.clickanunt.ro;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://www.clickanunt.ro$request_uri;
    }
}

# HTTPS - Main site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.clickanunt.ro;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/clickanunt-access.log;
    error_log /var/log/nginx/clickanunt-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Client body size
    client_max_body_size 10M;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# HTTPS - Redirect naked domain to www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name clickanunt.ro;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;

    return 301 https://www.clickanunt.ro$request_uri;
}
EOF

# Create letsencrypt directory
mkdir -p /var/www/letsencrypt

# Enable site
ln -sf /etc/nginx/sites-available/clickanunt /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration valid"
    systemctl reload nginx
    echo "✅ Nginx reloaded"
    echo ""
    echo "📋 Next steps:"
    echo "1. Asigură-te că DNS-ul pointează către acest server"
    echo "2. Rulează: ./setup-ssl.sh pentru a obține certificat SSL"
else
    echo "❌ Nginx configuration invalid! Check errors above."
    exit 1
fi
