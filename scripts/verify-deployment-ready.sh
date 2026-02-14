#!/bin/bash

###############################################################################
# Deployment Readiness Verification
# 
# Checks that all deployment fixes are in place and ready
# Run before deploying to production
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "════════════════════════════════════════════════════════════"
echo "  📋 Deployment Readiness Check"
echo "════════════════════════════════════════════════════════════"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper function for checks
check_file() {
  local FILE="$1"
  local DESCRIPTION="$2"
  
  if [ -f "$FILE" ]; then
    echo "${GREEN}✅${NC} $DESCRIPTION"
    ((CHECKS_PASSED++))
    return 0
  else
    echo "${RED}❌${NC} Missing: $DESCRIPTION"
    echo "   Expected: $FILE"
    ((CHECKS_FAILED++))
    return 1
  fi
}

check_content() {
  local FILE="$1"
  local PATTERN="$2"
  local DESCRIPTION="$3"
  
  if grep -q "$PATTERN" "$FILE" 2>/dev/null; then
    echo "${GREEN}✅${NC} $DESCRIPTION"
    ((CHECKS_PASSED++))
    return 0
  else
    echo "${RED}❌${NC} Missing in file: $DESCRIPTION"
    echo "   File: $FILE"
    echo "   Pattern: $PATTERN"
    ((CHECKS_FAILED++))
    return 1
  fi
}

# === CHECK 1: Core Files Present ===
echo "${BLUE}[1] Core Files Check${NC}"
check_file "$PROJECT_ROOT/package.json" "package.json exists"
check_file "$PROJECT_ROOT/next.config.ts" "next.config.ts exists"
check_file "$PROJECT_ROOT/tsconfig.json" "tsconfig.json exists"
check_file "$PROJECT_ROOT/app/api/version/route.ts" "Version endpoint exists"
echo ""

# === CHECK 2: Deployment Scripts ===
echo "${BLUE}[2] Deployment Scripts Check${NC}"
check_file "$PROJECT_ROOT/scripts/deploy.sh" "deploy.sh (original)"
check_file "$PROJECT_ROOT/scripts/deploy-prod.sh" "deploy-prod.sh (new bulletproof script)"
check_content "$PROJECT_ROOT/scripts/deploy-prod.sh" "deployment-info.json" "Deployment metadata creation"
check_content "$PROJECT_ROOT/scripts/deploy-prod.sh" "verify_version_endpoint" "Version verification function"
echo ""

# === CHECK 3: Cache Configuration ===
echo "${BLUE}[3] Cache Configuration Check${NC}"
check_content "$PROJECT_ROOT/next.config.ts" "/listings/new" "Cache rule for /listings/new exists"
check_content "$PROJECT_ROOT/next.config.ts" "no-cache" "No-cache header configured"
check_content "$PROJECT_ROOT/next.config.ts" "must-revalidate" "Must-revalidate header configured"
echo ""

# === CHECK 4: Version Endpoint ===
echo "${BLUE}[4] Version Endpoint Check${NC}"
check_content "$PROJECT_ROOT/app/api/version/route.ts" "deployment-info.json" "Reads deployment metadata"
check_content "$PROJECT_ROOT/app/api/version/route.ts" "BUILD_ID" "Reads Next.js build ID"
check_content "$PROJECT_ROOT/app/api/version/route.ts" "no-store, no-cache" "Strict cache headers"
check_content "$PROJECT_ROOT/app/api/version/route.ts" "gitCommit" "Returns git commit info"
echo ""

# === CHECK 5: Documentation ===
echo "${BLUE}[5] Documentation Check${NC}"
check_file "$PROJECT_ROOT/docs/DEPLOY_TRUTH_LOCAL.md" "Local audit documentation"
check_file "$PROJECT_ROOT/docs/DEPLOY_TRUTH_SERVER.md" "Server audit documentation"
check_file "$PROJECT_ROOT/docs/DEPLOYMENT_FIX_COMPLETE.md" "Complete fix documentation"
echo ""

# === CHECK 6: Git Status ===
echo "${BLUE}[6] Git Status Check${NC}"
cd "$PROJECT_ROOT"
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "${GREEN}✅${NC} Git repository found"
  ((CHECKS_PASSED++))
  
  COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  BRANCH=$(git rev-parse --abbr-ref HEAD 2>/dev/null || echo "unknown")
  echo "   Commit: $COMMIT"
  echo "   Branch: $BRANCH"
else
  echo "${RED}❌${NC} Git repository not found"
  ((CHECKS_FAILED++))
fi
echo ""

# === CHECK 7: Build Status ===
echo "${BLUE}[7] Build Configuration Check${NC}"
if grep -q '"build"' "$PROJECT_ROOT/package.json"; then
  echo "${GREEN}✅${NC} Build script configured"
  ((CHECKS_PASSED++))
else
  echo "${RED}❌${NC} Build script missing"
  ((CHECKS_FAILED++))
fi

if grep -q '"start"' "$PROJECT_ROOT/package.json"; then
  echo "${GREEN}✅${NC} Start script configured"
  ((CHECKS_PASSED++))
else
  echo "${RED}❌${NC} Start script missing"
  ((CHECKS_FAILED++))
fi
echo ""

# === CHECK 8: Dependencies ===
echo "${BLUE}[8] Critical Dependencies Check${NC}"
check_content "$PROJECT_ROOT/package.json" '"next"' "Next.js dependency"
check_content "$PROJECT_ROOT/package.json" '"react"' "React dependency"
check_content "$PROJECT_ROOT/package.json" '"@prisma/client"' "Prisma Client dependency"
echo ""

# === Summary ===
echo "════════════════════════════════════════════════════════════"
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL))

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "  ${GREEN}✅ All Checks Passed! Ready for Deployment${NC}"
  echo ""
  echo "  Summary: $CHECKS_PASSED/$TOTAL checks passed (${PERCENTAGE}%)"
else
  echo "  ${RED}❌ Some Checks Failed${NC}"
  echo ""
  echo "  Summary: $CHECKS_PASSED/$TOTAL checks passed (${PERCENTAGE}%)"
  echo "  ${YELLOW}⚠️ Fix issues before deploying${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# === Deployment Instructions ===
if [ $CHECKS_FAILED -eq 0 ]; then
  echo "📝 Ready to Deploy!"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes:"
  echo "     ${BLUE}git log --oneline -3${NC}"
  echo ""
  echo "  2. Run deployment:"
  echo "     ${BLUE}bash scripts/deploy-prod.sh${NC}"
  echo ""
  echo "  3. Verify deployment:"
  echo "     ${BLUE}curl https://www.clickanunt.ro/api/version${NC}"
  echo ""
  echo "  4. Check live changes:"
  echo "     Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
  echo ""
fi

exit $CHECKS_FAILED
