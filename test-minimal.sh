#!/bin/bash

echo "=== Testing Edge Function Step by Step ==="

echo -e "\n1. Testing with minimal data:"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"email":"test@test.com","password":"12345678","name":"Test"}'

echo -e "\n\n2. Testing with your exact data but simpler:"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"email":"influencer@example.com","password":"securepassword123","name":"Influencer Name"}'

echo -e "\n\n3. Testing with just the required fields:"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"email":"simple@test.com","password":"password123","name":"Simple Name"}'

echo -e "\n\n4. Testing with different content type:"
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Bearer test-token" \
  -d "email=form@test.com&password=password123&name=Form%20Name"

echo -e "\n\nTests completed!" 