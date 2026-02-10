#!/bin/bash

# ============================================
# DEPLOY RAPID PE WWW.CLICKANUNT.RO
# ============================================

set -e

echo "🚀 DEPLOYMENT CLICKANUNT.RO"
echo "======================================"

# Configurare
SERVER_IP="46.225.69.155"
DOMAIN="www.clickanunt.ro"
SERVER_USER="root"
APP_DIR="/var/www/clickanunt"

# Culori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# VERIFICĂRI PRELIMINARE
# ============================================

echo -e "${YELLOW}📋 Verificare preliminară...${NC}"

# Check SSH
if ! ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ EROARE: Nu pot conecta la server!${NC}"
    echo ""
    echo "Verifică:"
    echo "  1. Server pornit pe Hetzner Cloud Console"
    echo "  2. SSH key configurat corect"
    echo "  3. IP server: ${SERVER_IP}"
    exit 1
fi

echo -e "${GREEN}✅ Conexiune SSH OK${NC}"

# Check DNS
DOMAIN_IP=$(dig +short ${DOMAIN} | tail -n1)
if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}❌ EROARE: Domeniul ${DOMAIN} nu rezolvă!${NC}"
    echo ""
    echo "Configurează DNS în Cloudflare:"
    echo "  Type: A"
    echo "  Name: www"
    echo "  Content: ${SERVER_IP}"
    echo "  Proxy: ✅ Proxied (portocaliu)"
    exit 1
fi

echo -e "${GREEN}✅ DNS configurat: ${DOMAIN} → ${DOMAIN_IP}${NC}"

# ============================================
# BUILD LOCAL
# ============================================

echo ""
echo -e "${YELLOW}📦 Build aplicație...${NC}"

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build Next.js
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complet${NC}"

# ============================================
# PREGĂTIRE PACHET
# ============================================

echo ""
echo -e "${YELLOW}📦 Creare pachet deploy...${NC}"

# Create temporary directory
DEPLOY_TMP="/tmp/clickanunt-deploy-$(date +%s)"
mkdir -p ${DEPLOY_TMP}

# Copy files
rsync -av \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next/cache' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='.DS_Store' \
    ./ ${DEPLOY_TMP}/

# Copy .env.production as .env
if [ -f ".env.production" ]; then
    cp .env.production ${DEPLOY_TMP}/.env
    echo -e "${GREEN}✅ Environment production copiat${NC}"
fi

# Create tarball
cd ${DEPLOY_TMP}
tar -czf /tmp/clickanunt-app.tar.gz .
cd - > /dev/null

echo -e "${GREEN}✅ Pachet creat: $(ls -lh /tmp/clickanunt-app.tar.gz | awk '{print $5}')${NC}"

# ============================================
# UPLOAD PE SERVER
# ============================================

echo ""
echo -e "${YELLOW}📤 Upload pe server...${NC}"

# Create directory
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${APP_DIR}/releases"

# Upload tarball
scp /tmp/clickanunt-app.tar.gz ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/releases/app-$(date +%Y%m%d-%H%M%S).tar.gz

echo -e "${GREEN}✅ Upload complet${NC}"

# ============================================
# DEPLOY PE SERVER
# ============================================

echo ""
echo -e "${YELLOW}🚀 Deploy pe server...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} bash << 'ENDSSH'
set -e

APP_DIR="/var/www/clickanunt"
LATEST_RELEASE=$(ls -t ${APP_DIR}/releases/*.tar.gz | head -n1)

echo "📦 Extragere: ${LATEST_RELEASE}"

# Extract to current
cd ${APP_DIR}
rm -rf current_old
[ -d current ] && mv current current_old
mkdir -p current
tar -xzf ${LATEST_RELEASE} -C current/

cd current

# Install dependencies
echo "📦 Install dependencies..."
npm ci --production

# Run migrations
echo "🗄️ Database migrations..."
npx prisma migrate deploy

# Restart application
echo "🔄 Restart PM2..."
pm2 restart clickanunt || pm2 start npm --name "clickanunt" -- start

# Restart Nginx
echo "🔄 Restart Nginx..."
systemctl restart nginx

# Cleanup old releases (keep last 3)
echo "🧹 Cleanup..."
cd ${APP_DIR}/releases
ls -t *.tar.gz | tail -n +4 | xargs -r rm

echo "✅ Deploy complet!"
ENDSSH

# ============================================
# CLEANUP LOCAL
# ============================================

echo ""
echo -e "${YELLOW}🧹 Cleanup local...${NC}"
rm -rf ${DEPLOY_TMP}
rm -f /tmp/clickanunt-app.tar.gz

# ============================================
# VERIFICARE FINALĂ
# ============================================

echo ""
echo -e "${YELLOW}🔍 Verificare finală...${NC}"

# Wait for app to start
sleep 5

# Check health endpoint
HEALTH_STATUS=$(curl -s https://${DOMAIN}/api/health | grep -o '"status":"[^"]*"' || echo "down")

if [[ "$HEALTH_STATUS" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Aplicație HEALTHY${NC}"
else
    echo -e "${RED}⚠️  Aplicație status: ${HEALTH_STATUS}${NC}"
fi

# ============================================
# SUCCES!
# ============================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                       ║${NC}"
echo -e "${GREEN}║   ✅  DEPLOYMENT SUCCESSFUL!  ✅     ║${NC}"
echo -e "${GREEN}║                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Website:${NC} https://${DOMAIN}"
echo -e "${BLUE}📊 Health:${NC} https://${DOMAIN}/api/health"
echo -e "${BLUE}🔧 Admin:${NC} https://${DOMAIN}/admin"
echo ""
echo -e "${YELLOW}📝 Comenzi utile:${NC}"
echo "  • Logs:    ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs clickanunt'"
echo "  • Status:  ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'"
echo "  • Restart: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart clickanunt'"
echo ""
echo -e "${GREEN}🎉 Website LIVE pe www.clickanunt.ro!${NC}"
