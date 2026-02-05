#!/bin/bash

# ClickAnunț - Complete Deployment Script
# Rulează acest script din directorul /var/www/clickanunt

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   ClickAnunț - Complete Deployment    ║"
echo "║        www.clickanunt.ro              ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production not found!${NC}"
    echo ""
    echo "Create .env.production with:"
    cat << 'EOF'
DATABASE_URL="postgresql://autoplat:ClickAnunt2026!Secure@localhost:5432/autoplat?schema=public"
NEXT_PUBLIC_SITE_URL="https://www.clickanunt.ro"
NEXT_PUBLIC_SITE_NAME="ClickAnunț"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="contact@clickanunt.ro"
SMTP_PASS="Gz082306gz082306@"
CONTACT_EMAIL="contact@clickanunt.ro"
CONTACT_PHONE="+40784712496"
NODE_ENV="production"
EOF
    exit 1
fi

echo -e "${YELLOW}📋 Pre-deployment checks...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not installed${NC}"
    echo "Installing PM2..."
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 $(pm2 --version)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL installed${NC}"

echo ""
echo -e "${YELLOW}Step 1/8: Installing dependencies...${NC}"
npm ci --production=false

echo -e "${YELLOW}Step 2/8: Generating Prisma Client...${NC}"
npx prisma generate

echo -e "${YELLOW}Step 3/8: Running database migrations...${NC}"
export $(cat .env.production | xargs)
npx prisma migrate deploy

echo -e "${YELLOW}Step 4/8: Creating admin user...${NC}"
if [ -f "scripts/create-admin.ts" ]; then
    npx ts-node scripts/create-admin.ts || echo "Admin user might already exist"
fi

echo -e "${YELLOW}Step 5/8: Building Next.js application...${NC}"
npm run build

echo -e "${YELLOW}Step 6/8: Setting up PM2...${NC}"
# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Stop existing instance if running
pm2 stop clickanunt 2>/dev/null || true
pm2 delete clickanunt 2>/dev/null || true

# Start with ecosystem file
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup | tail -n 1 | bash || true

echo -e "${YELLOW}Step 7/8: Configuring Nginx...${NC}"
if [ -f "setup-nginx.sh" ]; then
    sudo bash setup-nginx.sh
else
    echo "setup-nginx.sh not found, skipping..."
fi

echo -e "${YELLOW}Step 8/8: Setting up SSL...${NC}"
read -p "Do you want to setup SSL now? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" == "y" ]; then
    if [ -f "setup-ssl.sh" ]; then
        sudo bash setup-ssl.sh
    else
        echo "setup-ssl.sh not found"
    fi
fi

echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT SUCCESSFUL! ✅          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}📊 Application Status:${NC}"
pm2 status

echo ""
echo -e "${BLUE}🔗 URLs:${NC}"
echo "   Website: https://www.clickanunt.ro"
echo "   Admin: https://www.clickanunt.ro/admin/dashboard"
echo ""
echo -e "${BLUE}📧 Contact:${NC}"
echo "   Email: contact@clickanunt.ro"
echo "   Phone: +40 784 712 496"
echo ""
echo -e "${BLUE}🛠️ Useful Commands:${NC}"
echo "   View logs: pm2 logs clickanunt"
echo "   Restart: pm2 restart clickanunt"
echo "   Status: pm2 status"
echo "   Monitor: pm2 monit"
echo ""
echo -e "${GREEN}🎉 ClickAnunț is now live!${NC}"
