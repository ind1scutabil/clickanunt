#!/bin/bash

# Test Safari Connection Fix
# Script pentru verificare CORS și header-e Safari

echo "🧪 Test Safari Connection Fix"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo "📍 Testing: $BASE_URL"
echo ""

# Test 1: OPTIONS Preflight
echo "1️⃣  Test OPTIONS (Preflight Request)..."
RESPONSE=$(curl -s -X OPTIONS "$BASE_URL/api/listings" \
  -H "Origin: $BASE_URL" \
  -H "Access-Control-Request-Method: POST" \
  -w "\n%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "204" ]; then
  echo -e "${GREEN}✅ OPTIONS request: PASS (204 No Content)${NC}"
else
  echo -e "${RED}❌ OPTIONS request: FAIL (got $RESPONSE)${NC}"
fi

# Test 2: CORS Headers
echo ""
echo "2️⃣  Test CORS Headers..."
CORS_ORIGIN=$(curl -s -I "$BASE_URL/api/health" \
  -H "Origin: $BASE_URL" | grep -i "access-control-allow-origin")

if [ -n "$CORS_ORIGIN" ]; then
  echo -e "${GREEN}✅ Access-Control-Allow-Origin: PRESENT${NC}"
  echo "   $CORS_ORIGIN"
else
  echo -e "${RED}❌ Access-Control-Allow-Origin: MISSING${NC}"
fi

# Test 3: Credentials Header
echo ""
echo "3️⃣  Test Credentials Header..."
CORS_CREDS=$(curl -s -I "$BASE_URL/api/health" \
  -H "Origin: $BASE_URL" | grep -i "access-control-allow-credentials")

if [ -n "$CORS_CREDS" ]; then
  echo -e "${GREEN}✅ Access-Control-Allow-Credentials: PRESENT${NC}"
  echo "   $CORS_CREDS"
else
  echo -e "${RED}❌ Access-Control-Allow-Credentials: MISSING${NC}"
fi

# Test 4: Security Headers
echo ""
echo "4️⃣  Test Security Headers..."
SECURITY_HEADERS=$(curl -s -I "$BASE_URL/api/health" | grep -E "X-Content-Type-Options|X-Frame-Options")

if [ -n "$SECURITY_HEADERS" ]; then
  echo -e "${GREEN}✅ Security Headers: PRESENT${NC}"
  echo "$SECURITY_HEADERS" | sed 's/^/   /'
else
  echo -e "${RED}❌ Security Headers: MISSING${NC}"
fi

# Test 5: Health Endpoint
echo ""
echo "5️⃣  Test Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health" -H "Origin: $BASE_URL")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "degraded" ]; then
  echo -e "${GREEN}✅ Health Endpoint: PASS (status: $HEALTH_STATUS)${NC}"
else
  echo -e "${RED}❌ Health Endpoint: FAIL${NC}"
  echo "   Response: $HEALTH_RESPONSE"
fi

# Test 6: Login Endpoint (with CORS)
echo ""
echo "6️⃣  Test Login Endpoint CORS..."
LOGIN_HEADERS=$(curl -s -I "$BASE_URL/api/auth/login" \
  -H "Origin: $BASE_URL" \
  -H "Content-Type: application/json" | grep -i "access-control")

if [ -n "$LOGIN_HEADERS" ]; then
  echo -e "${GREEN}✅ Login CORS Headers: PRESENT${NC}"
else
  echo -e "${RED}❌ Login CORS Headers: MISSING${NC}"
fi

# Test 7: Cookie Test (Login)
echo ""
echo "7️⃣  Test Cookie Settings (Login)..."
COOKIE_TEST=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE_URL" \
  -d '{"email":"owner@autoplatform.ro","password":"admin123"}' \
  -c /tmp/cookies.txt \
  2>&1)

if [ -f /tmp/cookies.txt ]; then
  COOKIES=$(cat /tmp/cookies.txt | grep -E "accessToken|refreshToken")
  if [ -n "$COOKIES" ]; then
    echo -e "${GREEN}✅ Cookies: SET${NC}"
    echo "$COOKIES" | sed 's/^/   /'
  else
    echo -e "${YELLOW}⚠️  Cookies: NOT SET (check login credentials)${NC}"
  fi
  rm /tmp/cookies.txt
else
  echo -e "${RED}❌ Cookies: ERROR${NC}"
fi

# Summary
echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo ""
echo -e "${YELLOW}🔧 Pentru testare în Safari:${NC}"
echo "1. Deschide Safari → http://localhost:3000"
echo "2. Deschide Developer Tools (Develop menu)"
echo "3. Network tab → verifică header-ele CORS"
echo "4. Storage tab → verifică cookie-urile"
echo ""
echo -e "${YELLOW}🐛 Debug în Safari Console:${NC}"
echo "fetch('$BASE_URL/api/health', {"
echo "  credentials: 'include',"
echo "  headers: { 'Content-Type': 'application/json' }"
echo "})"
echo ".then(r => r.json())"
echo ".then(console.log)"
echo ".catch(console.error)"
echo ""

echo "✅ Test complet!"
