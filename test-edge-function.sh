#!/bin/bash

# Test script for the create-influencer Edge Function
echo "Testing Edge Function..."

# Test with valid data
echo "Test 1: Valid data"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "bio": "Test bio",
    "is_verified": false
  }'

echo -e "\n\nTest 2: Missing email"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "password": "password123",
    "name": "Test User"
  }'

echo -e "\n\nTest 3: Missing password"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'

echo -e "\n\nTest 4: Missing name"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

echo -e "\n\nTest 5: Empty JSON"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{}'

echo -e "\n\nTest 6: Invalid JSON"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{invalid json}'

echo -e "\n\nTests completed!" 