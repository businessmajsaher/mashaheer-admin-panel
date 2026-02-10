#!/bin/bash

# Verify Hesabe Webhook Accessibility
# This script tests if the webhook endpoint is publicly accessible

echo "=========================================="
echo "Hesabe Webhook Access Verification"
echo "=========================================="
echo ""

# Get project reference from environment or prompt
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  read -p "Enter your Supabase Project Reference: " SUPABASE_PROJECT_REF
fi

WEBHOOK_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/hesabe-webhook"

echo "Testing webhook URL: $WEBHOOK_URL"
echo ""

# Test 1: Check if endpoint is accessible (should return 200 or 400, not 401)
echo "Test 1: Checking endpoint accessibility..."
echo "----------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "reference_number": "test-ref-123",
    "status": "SUCCESSFUL",
    "amount": "10.00",
    "payment_type": "KNET",
    "datetime": "2024-01-01 10:00:00"
  }' \
  "$WEBHOOK_URL")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "❌ FAILED: Webhook is not publicly accessible"
  echo "   Status: $HTTP_CODE (Unauthorized/Forbidden)"
  echo ""
  echo "🔧 SOLUTION: Enable public access in Supabase Dashboard"
  echo "   1. Go to: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions"
  echo "   2. Find: hesabe-webhook"
  echo "   3. Click Settings (gear icon)"
  echo "   4. Enable 'Allow unauthenticated access'"
  echo "   5. Save"
  echo ""
  exit 1
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  echo "✅ SUCCESS: Webhook is publicly accessible"
  echo "   Status: $HTTP_CODE"
  echo ""
  if [ "$HTTP_CODE" = "400" ]; then
    echo "   Note: 400 is expected for test data (payment not found)"
    echo "   This confirms the endpoint is accessible!"
  fi
else
  echo "⚠️  WARNING: Unexpected status code: $HTTP_CODE"
  echo "   Check the response body above for details"
  echo ""
fi

# Test 2: Check CORS (OPTIONS request)
echo "Test 2: Checking CORS support..."
echo "----------------------------------------"

CORS_RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS \
  -H "Origin: https://hesabe.com" \
  -H "Access-Control-Request-Method: POST" \
  "$WEBHOOK_URL")

CORS_CODE=$(echo "$CORS_RESPONSE" | tail -n1)

if [ "$CORS_CODE" = "204" ]; then
  echo "✅ CORS is properly configured"
else
  echo "⚠️  CORS response code: $CORS_CODE (expected 204)"
fi
echo ""

# Test 3: Verify function exists
echo "Test 3: Verifying function deployment..."
echo "----------------------------------------"

FUNC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET \
  "$WEBHOOK_URL")

if [ "$FUNC_CHECK" = "405" ]; then
  echo "✅ Function exists (405 = Method Not Allowed for GET, which is correct)"
elif [ "$FUNC_CHECK" = "401" ]; then
  echo "❌ Function requires authentication (needs public access enabled)"
else
  echo "⚠️  Unexpected response: $FUNC_CHECK"
fi
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "   1. Check Supabase Dashboard → Logs → Edge Functions"
echo "   2. Filter by: hesabe-webhook"
echo "   3. Look for incoming requests from this test"
echo ""
echo "To test with real payment:"
echo "   1. Make a test payment through Hesabe"
echo "   2. Check Supabase logs for webhook calls"
echo "   3. Verify payment status updates correctly"
echo ""

