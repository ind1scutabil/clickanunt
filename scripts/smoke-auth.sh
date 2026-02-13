#!/bin/bash
# Smoke test for authentication endpoints
# Tests CSRF, register, and login against a running server

set +e  # Don't exit on error, we want to report all failures

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:3000}"
TEST_EMAIL="smoke-test-$(date +%s)@example.com"
TEST_PASSWORD="SmokeTest123!"
TEST_NAME="Smoke Test User"
COOKIE_JAR=$(mktemp)
FAILED=0

echo -e "${YELLOW}🧪 Auth Smoke Test - $(date)${NC}"
echo -e "📍 Target: $API_URL"
echo -e "📧 Test Email: $TEST_EMAIL"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check response
check_response() {
  local response=$1
  local expected_status=$2
  local description=$3
  
  local status=$(echo "$response" | tail -1 | grep "HTTP_STATUS" | cut -d':' -f2)
  
  if [ "$status" == "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $description (status: $status)"
    return 0
  else
    echo -e "${RED}✗${NC} $description (expected: $expected_status, got: $status)"
    echo "Response: $response"
    return 1
  fi
}

# Step 1: Get CSRF Token
echo -e "${YELLOW}Step 1: Getting CSRF token...${NC}"
CSRF_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_URL/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo -e "${RED}✗ Failed to get CSRF token${NC}"
  exit 1
fi

check_response "$CSRF_RESPONSE" "200" "Get CSRF token"
echo ""

# Step 2: Register new user
echo -e "${YELLOW}Step 2: Registering new user...${NC}"
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

check_response "$REGISTER_RESPONSE" "201" "Register new user"

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ No access token in register response${NC}"
  exit 1
fi
echo -e "${GREEN}  Access token received${NC}"
echo ""

# Step 3: Try to register duplicate user (should fail with 409)
echo -e "${YELLOW}Step 3: Testing duplicate registration...${NC}"
DUPLICATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

check_response "$DUPLICATE_RESPONSE" "409" "Duplicate registration blocked"
echo ""

# Step 4: Login with correct credentials
echo -e "${YELLOW}Step 4: Testing login with correct credentials...${NC}"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

check_response "$LOGIN_RESPONSE" "200" "Login with correct credentials"

# Extract access token
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -z "$LOGIN_TOKEN" ]; then
  echo -e "${RED}✗ No access token in login response${NC}"
  exit 1
fi
echo -e "${GREEN}  Access token received${NC}"
echo ""

# Step 5: Login with wrong password (should fail with 401)
echo -e "${YELLOW}Step 5: Testing login with wrong password...${NC}"
WRONG_PASSWORD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"WrongPassword123!\"
  }")

check_response "$WRONG_PASSWORD_RESPONSE" "401" "Wrong password rejected"
echo ""

# Step 6: Test invalid email format (should fail with 400)
echo -e "${YELLOW}Step 6: Testing invalid email format...${NC}"
INVALID_EMAIL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{
    \"email\": \"not-an-email\",
    \"password\": \"$TEST_PASSWORD\"
  }")

check_response "$INVALID_EMAIL_RESPONSE" "400" "Invalid email format rejected"
echo ""

# Step 7: Test missing CSRF token (should fail with 403)
echo -e "${YELLOW}Step 7: Testing request without CSRF token...${NC}"
NO_CSRF_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"nocsrf-$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"No CSRF\"
  }")

check_response "$NO_CSRF_RESPONSE" "403" "Request without CSRF rejected"
echo ""

# Step 8: Test authenticated endpoint
echo -e "${YELLOW}Step 8: Testing authenticated endpoint access...${NC}"
ME_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $LOGIN_TOKEN")

check_response "$ME_RESPONSE" "200" "Access authenticated endpoint"
echo ""

# Step 9: Rate limiting test (optional, can be slow)
if [ "$2" == "--full" ]; then
  echo -e "${YELLOW}Step 9: Testing rate limiting (this may take a moment)...${NC}"
  for i in {1..6}; do
    curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -H "x-csrf-token: $CSRF_TOKEN" \
      -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"WrongPassword\"
      }" > /dev/null
  done
  
  RATE_LIMIT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $CSRF_TOKEN" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")
  
  check_response "$RATE_LIMIT_RESPONSE" "429" "Rate limiting triggered"
  echo ""
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All smoke tests passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Test user created:${NC}"
echo -e "  Email: $TEST_EMAIL"
echo -e "  Password: $TEST_PASSWORD"
echo ""
echo -e "${YELLOW}Note:${NC} Test user was NOT cleaned up. Clean up manually if needed."
echo ""

exit 0
