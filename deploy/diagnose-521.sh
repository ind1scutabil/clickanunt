#!/usr/bin/env bash
set -euo pipefail

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

section() { echo -e "\n${YELLOW}==> $1${NC}"; }
ok() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }

section "Basic system info"
uname -a || true
uptime || true

section "Nginx status"
if systemctl is-active --quiet nginx; then
  ok "Nginx is running"
else
  fail "Nginx is NOT running"
fi
systemctl status nginx --no-pager || true

section "Nginx config test"
nginx -t || true

section "Nginx listening ports"
ss -ltnp | grep -E ":80\b|:443\b" || true

section "PM2 status"
if command -v pm2 >/dev/null 2>&1; then
  pm2 status || true
  pm2 jlist | grep -E '"name"|"status"|"pm_id"' || true
else
  fail "PM2 not installed"
fi

section "App port check (localhost:3000)"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || true

section "Firewall (UFW)"
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose || true
else
  echo "UFW not installed"
fi

section "SSL certificates"
if command -v certbot >/dev/null 2>&1; then
  certbot certificates || true
else
  echo "Certbot not installed"
fi

section "Origin SSL handshake test"
if command -v openssl >/dev/null 2>&1; then
  echo | openssl s_client -connect 127.0.0.1:443 -servername localhost 2>/dev/null | head -n 20 || true
fi

section "Nginx error logs (last 50 lines)"
if [ -f /var/log/nginx/error.log ]; then
  tail -n 50 /var/log/nginx/error.log || true
fi
if [ -f /var/log/nginx/clickanunt-error.log ]; then
  tail -n 50 /var/log/nginx/clickanunt-error.log || true
fi
if [ -f /var/log/nginx/auto-platform-error.log ]; then
  tail -n 50 /var/log/nginx/auto-platform-error.log || true
fi

section "PM2 logs (last 50 lines)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 logs --lines 50 || true
fi

section "Summary hints"
cat << 'EOF'
- Dacă Nginx sau PM2 nu sunt online, Cloudflare va da 521.
- Dacă porturile 80/443 nu ascultă, verifică firewall/security group.
- Dacă SSL pe origin e expirat și Cloudflare e Full (strict), vei avea 521/525.
- Verifică DNS: A record pentru domeniu și www trebuie să indice IP-ul corect.
EOF
