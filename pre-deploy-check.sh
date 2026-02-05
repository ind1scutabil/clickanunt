#!/bin/bash

# Pre-deployment Checklist and Verification

echo "✓ ClickAnunț - Pre-Deployment Checklist"
echo "========================================"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check item
check_item() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
        ((CHECKS_PASSED++))
    else
        echo "❌ $2"
        ((CHECKS_FAILED++))
    fi
}

# 1. Check files exist
echo "📁 Checking required files..."
[ -f "package.json" ] && check_item 0 "package.json exists"
[ -f "next.config.ts" ] && check_item 0 "next.config.ts exists"
[ -f "prisma/schema.prisma" ] && check_item 0 "schema.prisma exists"
[ -f ".env.production" ] && check_item 0 ".env.production exists"
[ -f "ecosystem.config.js" ] && check_item 0 "ecosystem.config.js exists"

echo ""
echo "🔧 Checking deployment scripts..."
[ -f "setup-server.sh" ] && check_item 0 "setup-server.sh exists" || check_item 1 "setup-server.sh missing"
[ -f "setup-nginx.sh" ] && check_item 0 "setup-nginx.sh exists" || check_item 1 "setup-nginx.sh missing"
[ -f "setup-ssl.sh" ] && check_item 0 "setup-ssl.sh exists" || check_item 1 "setup-ssl.sh missing"
[ -f "full-deploy.sh" ] && check_item 0 "full-deploy.sh exists" || check_item 1 "full-deploy.sh missing"

echo ""
echo "📦 Checking dependencies..."
[ -d "node_modules" ] && check_item 0 "node_modules exists" || check_item 1 "node_modules missing (run npm install)"
[ -f "package-lock.json" ] && check_item 0 "package-lock.json exists" || check_item 1 "package-lock.json missing"

echo ""
echo "🗄️ Checking database configuration..."
if [ -f ".env.production" ]; then
    if grep -q "DATABASE_URL" .env.production; then
        check_item 0 "DATABASE_URL configured"
    else
        check_item 1 "DATABASE_URL not found in .env.production"
    fi
    
    if grep -q "NEXT_PUBLIC_SITE_URL" .env.production; then
        check_item 0 "SITE_URL configured"
    else
        check_item 1 "SITE_URL not configured"
    fi
fi

echo ""
echo "🌐 Checking contact information..."
if [ -f ".env.production" ]; then
    if grep -q "CONTACT_EMAIL" .env.production; then
        check_item 0 "Contact email configured"
    else
        check_item 1 "Contact email not configured"
    fi
fi

echo ""
echo "════════════════════════════════════════"
echo "Summary:"
echo "✅ Passed: $CHECKS_PASSED"
echo "❌ Failed: $CHECKS_FAILED"
echo "════════════════════════════════════════"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All checks passed! Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Make scripts executable:"
    echo "   chmod +x *.sh"
    echo ""
    echo "2. On your server, run:"
    echo "   sudo ./setup-server.sh"
    echo ""
    echo "3. Transfer files to server:"
    echo "   rsync -avz --exclude 'node_modules' --exclude '.next' . user@server:/var/www/clickanunt/"
    echo ""
    echo "4. On server, run:"
    echo "   cd /var/www/clickanunt"
    echo "   ./full-deploy.sh"
    exit 0
else
    echo ""
    echo "⚠️  Some checks failed. Please fix the issues above before deploying."
    exit 1
fi
