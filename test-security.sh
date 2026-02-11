#!/bin/bash
echo "=== Security Test Suite ==="
echo ""

# Test 1: Check if admin routes are protected
echo "Test 1: Admin Route Protection"
grep -q "verifyAdmin" middleware.ts && echo "✅ Admin middleware exists" || echo "❌ No admin middleware"

# Test 2: Check for input validation  
echo ""
echo "Test 2: Input Validation (Zod)"
grep "zod" package.json > /dev/null && echo "✅ Zod installed" || echo "❌ Zod not installed"

# Test 3: Check for CSRF protection
echo ""
echo "Test 3: CSRF Protection"
csrf_count=$(grep -r "csrf" app/api --include="*.ts" 2>/dev/null | wc -l)
echo "Found CSRF implementations: $csrf_count"
[ "$csrf_count" -eq 0 ] && echo "❌ No CSRF protection detected"

# Test 4: Check for audit logging
echo ""
echo "Test 4: Audit Logging"
[ -f "lib/audit.ts" ] && echo "✅ Audit file exists" || echo "❌ No audit.ts"

# Test 5: Check for image optimization
echo ""
echo "Test 5: Image Optimization"
next_image=$(grep -r "next/image" app --include="*.tsx" 2>/dev/null | wc -l)
img_tags=$(grep -r "<img " app --include="*.tsx" 2>/dev/null | wc -l)
echo "Using next/image: $next_image"
echo "Using <img> tags: $img_tags"

# Test 6: Check for SEO
echo ""
echo "Test 6: SEO"
[ -f "public/robots.txt" ] && echo "✅ robots.txt exists" || echo "❌ No robots.txt"
[ -f "public/sitemap.xml" ] && echo "✅ sitemap.xml exists" || echo "❌ No sitemap.xml"

# Test 7: Check caching
echo ""
echo "Test 7: Caching Strategy"
cache_count=$(grep -r "revalidate" app/api --include="*.ts" 2>/dev/null | wc -l)
echo "Cache revalidation tags: $cache_count"

echo ""
echo "=== Summary ==="
echo "Priority: Security hardening + Input validation"
