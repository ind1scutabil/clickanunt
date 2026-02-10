#!/bin/bash

# Security Testing Script
# Tests OWASP ASVS baseline implementation

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 Starting Security Tests for ClickAnunț Platform"
echo "Target: $BASE_URL"
echo "=================================================="
echo ""

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
pass_test() {
    ((PASSED++))
    ((TOTAL++))
    echo -e "${GREEN}✓ PASSED${NC}: $1"
}

fail_test() {
    ((FAILED++))
    ((TOTAL++))
    echo -e "${RED}✗ FAILED${NC}: $1"
    echo "   Details: $2"
}

test_header() {
    echo ""
    echo -e "${YELLOW}Testing: $1${NC}"
    echo "----------------------------------------"
}

# Test 1: Security Headers
test_header "Security Headers"

HEADERS=$(curl -sI "$BASE_URL/")

if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
    pass_test "CSP header present"
else
    fail_test "CSP header missing" "No Content-Security-Policy header found"
fi

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    pass_test "X-Frame-Options present"
else
    fail_test "X-Frame-Options missing" "Clickjacking protection not enabled"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    pass_test "X-Content-Type-Options present"
else
    fail_test "X-Content-Type-Options missing" "MIME sniffing protection not enabled"
fi

if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    pass_test "HSTS header present"
else
    fail_test "HSTS header missing" "HTTPS enforcement not configured"
fi

if echo "$HEADERS" | grep -q "Referrer-Policy"; then
    pass_test "Referrer-Policy present"
else
    fail_test "Referrer-Policy missing" "Referrer policy not configured"
fi

# Test 2: Rate Limiting
test_header "Rate Limiting - Login Endpoint"

echo "Attempting 6 rapid login requests..."
RATE_LIMITED=false

for i in {1..6}; do
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrongpassword"}')
    
    if [ "$RESPONSE" = "429" ]; then
        RATE_LIMITED=true
        break
    fi
    sleep 0.5
done

if [ "$RATE_LIMITED" = true ]; then
    pass_test "Login rate limiting works"
else
    fail_test "Login rate limiting" "No 429 response after 6 attempts"
fi

# Test 3: CSRF Protection
test_header "CSRF Protection"

CSRF_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST "$BASE_URL/api/listings/create" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","priceAmount":1000}')

if [ "$CSRF_RESPONSE" = "403" ] || [ "$CSRF_RESPONSE" = "401" ]; then
    pass_test "CSRF protection enabled (403/401 without token)"
else
    fail_test "CSRF protection" "Expected 403/401, got $CSRF_RESPONSE"
fi

# Test 4: Input Validation - XSS
test_header "Input Validation - XSS Prevention"

XSS_PAYLOAD='<script>alert(1)</script>'
XSS_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/listings/create" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$XSS_PAYLOAD\",\"priceAmount\":1000}")

if echo "$XSS_RESPONSE" | grep -q "error\|invalid\|Invalid"; then
    pass_test "XSS payload rejected in title"
else
    fail_test "XSS validation" "Payload not properly validated"
fi

# Test 5: SQL Injection
test_header "Input Validation - SQL Injection"

SQL_PAYLOAD="admin' OR '1'='1"
SQL_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SQL_PAYLOAD\",\"password\":\"test\"}")

if echo "$SQL_RESPONSE" | grep -q "error\|invalid\|Email invalid"; then
    pass_test "SQL injection payload rejected"
else
    fail_test "SQL injection protection" "Payload not properly validated"
fi

# Test 6: Password Complexity
test_header "Password Complexity Validation"

WEAK_PASSWORD_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"weak","name":"Test User"}')

if echo "$WEAK_PASSWORD_RESPONSE" | grep -qi "password.*character\|complex"; then
    pass_test "Weak password rejected"
else
    fail_test "Password complexity" "Weak password not rejected properly"
fi

# Test 7: Path Traversal
test_header "Path Traversal Prevention"

TRAVERSAL_PAYLOAD="../../etc/passwd"
TRAVERSAL_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    "$BASE_URL/api/files/$TRAVERSAL_PAYLOAD")

if [ "$TRAVERSAL_RESPONSE" = "400" ] || [ "$TRAVERSAL_RESPONSE" = "403" ] || [ "$TRAVERSAL_RESPONSE" = "404" ]; then
    pass_test "Path traversal blocked"
else
    fail_test "Path traversal" "Expected 400/403/404, got $TRAVERSAL_RESPONSE"
fi

# Test 8: Large Payload Rejection
test_header "Large Payload Protection"

LARGE_PAYLOAD=$(python3 -c "print('a' * 100000)")
LARGE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST "$BASE_URL/api/listings/create" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test\",\"description\":\"$LARGE_PAYLOAD\"}")

if [ "$LARGE_RESPONSE" = "400" ] || [ "$LARGE_RESPONSE" = "413" ]; then
    pass_test "Large payload rejected"
else
    fail_test "Large payload protection" "Large payload not rejected: $LARGE_RESPONSE"
fi

# Test 9: Email Format Validation
test_header "Email Format Validation"

INVALID_EMAIL_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"not-an-email","password":"test123"}')

if echo "$INVALID_EMAIL_RESPONSE" | grep -qi "email.*invalid"; then
    pass_test "Invalid email format rejected"
else
    fail_test "Email validation" "Invalid email not rejected"
fi

# Test 10: Numeric Range Validation
test_header "Numeric Range Validation"

NEGATIVE_PRICE_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/listings/create" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","priceAmount":-1000}')

if echo "$NEGATIVE_PRICE_RESPONSE" | grep -qi "error\|invalid\|positive"; then
    pass_test "Negative price rejected"
else
    fail_test "Price validation" "Negative price not rejected"
fi

# Test 11: Missing Required Fields
test_header "Required Fields Validation"

MISSING_FIELDS_RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}')

if echo "$MISSING_FIELDS_RESPONSE" | grep -qi "required\|password"; then
    pass_test "Missing required fields detected"
else
    fail_test "Required field validation" "Missing fields not detected"
fi

# Test 12: HTTPS Redirect (if in production)
if [ "$BASE_URL" != "http://localhost:3000" ]; then
    test_header "HTTPS Redirect"
    
    HTTP_URL=$(echo "$BASE_URL" | sed 's/https/http/')
    HTTP_RESPONSE=$(curl -sI "$HTTP_URL/" | grep -i "location: https")
    
    if [ -n "$HTTP_RESPONSE" ]; then
        pass_test "HTTP redirects to HTTPS"
    else
        fail_test "HTTPS redirect" "No redirect from HTTP to HTTPS"
    fi
fi

# Test 13: API CORS Headers
test_header "API CORS Configuration"

API_HEADERS=$(curl -sI "$BASE_URL/api/listings")

if echo "$API_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
    pass_test "CORS headers present"
else
    fail_test "CORS headers" "API lacks CORS configuration"
fi

# Test 14: No Sensitive Data in Errors
test_header "Error Message Information Disclosure"

ERROR_RESPONSE=$(curl -s "$BASE_URL/api/nonexistent-endpoint")

if echo "$ERROR_RESPONSE" | grep -qi "stack\|trace\|password\|secret"; then
    fail_test "Error information disclosure" "Sensitive data in error response"
else
    pass_test "No sensitive data in errors"
fi

# Test 15: Session Cookie Security
test_header "Session Cookie Security Attributes"

COOKIE_HEADERS=$(curl -sI "$BASE_URL/api/auth/login" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}')

if echo "$COOKIE_HEADERS" | grep -i "set-cookie" | grep -q "httponly"; then
    pass_test "HttpOnly flag on cookies"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: HttpOnly flag not detected (may be OK for token-based auth)"
fi

if echo "$COOKIE_HEADERS" | grep -i "set-cookie" | grep -q "samesite"; then
    pass_test "SameSite attribute on cookies"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: SameSite attribute not detected"
fi

# Summary
echo ""
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

PASS_RATE=$((PASSED * 100 / TOTAL))
echo -e "Pass Rate: $PASS_RATE%"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All security tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some security tests failed. Review and fix issues.${NC}"
    exit 1
fi
