#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Test 1: Admin Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@autoplatform.ro","password":"admin123"}')

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "⚠️ No token received"
  exit 0
fi

echo ""
echo "✅ Token: ${TOKEN:0:30}..."

echo ""
echo "=== Test 2: Get Admin Users ==="
curl -s -X GET "$BASE_URL/api/admin/users?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null | head -30

echo ""
echo "=== Test 3: Get Admin Dashboard ==="
curl -s -X GET "$BASE_URL/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" | head -30

echo ""
echo "✅ Tests Complete"
