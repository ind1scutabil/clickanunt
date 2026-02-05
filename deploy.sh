#!/bin/bash

# ClickAnunț Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

ENV=${1:-production}
echo "🚀 Starting deployment for environment: $ENV"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking environment...${NC}"
if [ ! -f ".env.$ENV" ]; then
    echo -e "${RED}Error: .env.$ENV file not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 3: Running Prisma migrations...${NC}"
npx prisma generate
npx prisma migrate deploy

echo -e "${YELLOW}Step 4: Building application...${NC}"
npm run build

echo -e "${YELLOW}Step 5: Running tests (if any)...${NC}"
# npm test

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}Application ready at: https://www.clickanunt.ro${NC}"

# If using PM2
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Step 6: Restarting PM2 process...${NC}"
    pm2 restart clickanunt || pm2 start npm --name "clickanunt" -- start
    pm2 save
    echo -e "${GREEN}✅ PM2 process restarted!${NC}"
fi

echo ""
echo "📊 Deployment Summary:"
echo "   • Environment: $ENV"
echo "   • Version: $(node -p "require('./package.json').version")"
echo "   • Timestamp: $(date)"
echo ""
echo "🔗 Links:"
echo "   • Website: https://www.clickanunt.ro"
echo "   • Admin: https://www.clickanunt.ro/admin/dashboard"
echo ""
echo "📞 Support:"
echo "   • Email: contact@clickanunt.ro"
echo "   • Phone: +40 784 712 496"
