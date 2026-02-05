#!/bin/bash

# ClickAnunț - Complete Server Setup Script
# Rulează acest script pe serverul tău pentru instalare completă

set -e

echo "🚀 ClickAnunț - Server Setup"
echo "============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Te rog rulează ca root: sudo ./setup-server.sh"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Step 1/10: Update sistem${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2/10: Instalare dependențe${NC}"
apt install -y curl git build-essential ufw

echo -e "${YELLOW}Step 3/10: Instalare Node.js 18.x${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version

echo -e "${YELLOW}Step 4/10: Instalare PM2${NC}"
npm install -g pm2
pm2 --version

echo -e "${YELLOW}Step 5/10: Instalare PostgreSQL${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

echo -e "${YELLOW}Step 6/10: Configurare PostgreSQL${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE autoplat;
CREATE USER autoplat WITH ENCRYPTED PASSWORD 'ClickAnunt2026!Secure';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
ALTER DATABASE autoplat OWNER TO autoplat;
\q
EOF

echo -e "${GREEN}✅ PostgreSQL database 'autoplat' created${NC}"

echo -e "${YELLOW}Step 7/10: Instalare Nginx${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo -e "${YELLOW}Step 8/10: Configurare Firewall${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5432/tcp
echo "y" | ufw enable

echo -e "${YELLOW}Step 9/10: Instalare Certbot pentru SSL${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}Step 10/10: Creare director aplicație${NC}"
mkdir -p /var/www/clickanunt
chown -R $SUDO_USER:$SUDO_USER /var/www/clickanunt

echo ""
echo -e "${GREEN}✅ Server setup complet!${NC}"
echo ""
echo "📋 Informații importante:"
echo "========================="
echo "Database: autoplat"
echo "DB User: autoplat"
echo "DB Password: ClickAnunt2026!Secure"
echo "App Directory: /var/www/clickanunt"
echo ""
echo "🔐 Salvează credentialele în .env.production:"
echo "DATABASE_URL=\"postgresql://autoplat:ClickAnunt2026!Secure@localhost:5432/autoplat?schema=public\""
echo ""
echo "📝 Următorii pași:"
echo "1. cd /var/www/clickanunt"
echo "2. git clone <repository-url> ."
echo "3. npm install"
echo "4. Creează .env.production cu credentialele de mai sus"
echo "5. npm run deploy"
echo "6. ./setup-nginx.sh"
echo "7. ./setup-ssl.sh"
echo ""
