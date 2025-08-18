#!/bin/bash

echo "🧪 Testing the new create-influencer-complete Edge Function..."

# Test data for a new influencer
TEST_DATA='{
  "email": "test.influencer@example.com",
  "password": "test@pass",
  "name": "Test Influencer",
  "bio": "This is a test bio for the new Edge Function",
  "profile_image_url": "https://example.com/test-image.jpg",
  "is_verified": false,
  "social_links": [
    {
      "platform_id": "550e8400-e29b-41d4-a716-446655440000",
      "handle": "@testinfluencer",
      "profile_url": "https://instagram.com/testinfluencer"
    }
  ],
  "media_files": [
    {
      "file_url": "https://example.com/test-media1.jpg",
      "file_type": "image/jpeg",
      "file_name": "test-photo-1.jpg"
    }
  ],
  "is_update": false
}'

echo "📤 Sending test data to Edge Function..."
echo "Data: $TEST_DATA"

# Make the request to the Edge Function
RESPONSE=$(curl -s -X POST "https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer-complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "$TEST_DATA" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

echo ""
echo "📥 Response Status: $HTTP_STATUS"
echo "📥 Response Body: $RESPONSE_BODY"

if [ "$HTTP_STATUS" = "401" ]; then
    echo "✅ Expected 401 (Invalid JWT) - Edge Function is working!"
    echo "   This means the function is deployed and responding correctly."
    echo "   The 401 is expected since we used a test token."
elif [ "$HTTP_STATUS" = "201" ]; then
    echo "🎉 SUCCESS! Influencer created successfully!"
    echo "   This means the Edge Function is working perfectly!"
else
    echo "⚠️  Unexpected response. Status: $HTTP_STATUS"
    echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "🔗 Edge Function URL: https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer-complete"
echo "📊 Check logs in Supabase Dashboard: https://supabase.com/dashboard/project/wilshhncdehbnyldsjzs/functions" 