#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Running Production-Grade Test Suite${NC}\n"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ Dependencies not installed. Run: npm install${NC}"
  exit 1
fi

# 1. Lint check
echo -e "${YELLOW}📋 Running ESLint...${NC}"
npm run lint
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Linting failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Linting passed${NC}\n"

# 2. Unit and integration tests with coverage
echo -e "${YELLOW}🧬 Running Unit Tests...${NC}"
npm run test
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Unit tests failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Unit tests passed${NC}\n"

# 3. E2E tests
echo -e "${YELLOW}🌐 Running E2E Tests...${NC}"
npm run test:e2e
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ E2E tests failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ E2E tests passed${NC}\n"

# 4. Build check
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}\n"

# 5. Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All tests passed! Application is production-ready.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

exit 0
