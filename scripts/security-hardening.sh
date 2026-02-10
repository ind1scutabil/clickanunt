#!/bin/bash

# Security Hardening Script for VPS
# Protecție maximă împotriva atacurilor

echo "🔒 Starting security hardening..."

# 1. Install and configure fail2ban
echo "📦 Installing fail2ban..."
apt-get update
apt-get install -y fail2ban ufw

# 2. Configure fail2ban for Next.js
cat > /etc/fail2ban/filter.d/nextjs.conf << 'EOF'
[Definition]
failregex = ^.*SECURITY.*IP <HOST>.*$
            ^.*Failed to start server.*<HOST>.*$
            ^.*EADDRINUSE.*<HOST>.*$
ignoreregex =
EOF

# 3. Create fail2ban jail for Next.js
cat > /etc/fail2ban/jail.d/nextjs.local << 'EOF'
[nextjs]
enabled = true
port = 80,443,3000
filter = nextjs
logpath = /var/log/pm2/clickanunt-error.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables-multiport[name=nextjs, port="80,443,3000", protocol=tcp]
EOF

# 4. Configure SSH protection
cat > /etc/fail2ban/jail.d/sshd.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
findtime = 600
EOF

# 5. Configure nginx rate limiting
cat > /etc/nginx/conf.d/rate-limit.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=register:10m rate=3r/h;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;

# Request body size limit
client_max_body_size 10M;
client_body_buffer_size 128k;

# Timeouts
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;
EOF

# 6. Update nginx site config with rate limiting
cat > /etc/nginx/sites-available/clickanunt << 'EOF'
# Rate limit for DDoS protection
limit_req_status 429;
limit_conn_status 429;

server {
    listen 80;
    server_name clickanunt.ro www.clickanunt.ro;
    
    # Block common attack patterns
    location ~ /(wp-admin|wp-login|phpmyadmin|admin|xmlrpc) {
        deny all;
        return 404;
    }
    
    # Block file extensions
    location ~* \.(sql|bak|old|log|env|git|svn)$ {
        deny all;
        return 404;
    }
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    
    # Hide server version
    server_tokens off;
    
    # Apply general rate limiting
    limit_req zone=general burst=20 nodelay;
    
    # API endpoints - stricter limits
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout protection
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Login endpoint - very strict
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Register endpoint - very strict
    location /api/auth/register {
        limit_req zone=register burst=1 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # All other requests
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 7. Configure UFW firewall
echo "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw limit ssh
echo "y" | ufw enable

# 8. Configure kernel parameters for DDoS protection
cat >> /etc/sysctl.conf << 'EOF'

# DDoS Protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.icmp_echo_ignore_all = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Increase connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.netfilter.nf_conntrack_tcp_timeout_established = 600

# Memory and buffer optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
EOF

sysctl -p

# 9. Install and configure ModSecurity (WAF)
echo "🛡️ Installing ModSecurity WAF..."
apt-get install -y libmodsecurity3 modsecurity-crs

# 10. Create security monitoring script
cat > /usr/local/bin/security-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="admin@clickanunt.ro"

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed" /var/log/pm2/clickanunt-error.log 2>/dev/null | tail -20 | wc -l)
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "[$(date)] ALERT: High number of failed logins detected: $FAILED_LOGINS" >> $LOG_FILE
fi

# Check for suspicious IPs
SUSPICIOUS_IPS=$(fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" | wc -l)
if [ $SUSPICIOUS_IPS -gt 5 ]; then
    echo "[$(date)] ALERT: Multiple IPs banned: $SUSPICIOUS_IPS" >> $LOG_FILE
fi

# Check server load
LOAD=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
if (( $(echo "$LOAD > 5.0" | bc -l) )); then
    echo "[$(date)] ALERT: High server load detected: $LOAD" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[$(date)] ALERT: High disk usage: $DISK_USAGE%" >> $LOG_FILE
fi

# Check for port scan attempts
PORT_SCANS=$(grep "UFW BLOCK" /var/log/ufw.log 2>/dev/null | tail -100 | wc -l)
if [ $PORT_SCANS -gt 50 ]; then
    echo "[$(date)] ALERT: Possible port scan detected: $PORT_SCANS attempts" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/security-monitor.sh

# 11. Add cron job for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/security-monitor.sh") | crontab -

# 12. Restart services
systemctl restart fail2ban
systemctl restart nginx

echo "✅ Security hardening complete!"
echo "🔒 Active protections:"
echo "  - fail2ban: Monitoring SSH and application logs"
echo "  - UFW firewall: Only ports 22, 80, 443 open"
echo "  - Nginx rate limiting: DDoS protection active"
echo "  - Kernel hardening: SYN flood protection enabled"
echo "  - Security monitoring: Running every 5 minutes"
echo ""
echo "📊 Check status:"
echo "  fail2ban-client status"
echo "  ufw status"
echo "  tail -f /var/log/security-monitor.log"
