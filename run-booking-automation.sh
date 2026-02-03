#!/bin/bash

# Booking Automation Runner
# Replace YOUR_SERVICE_ROLE_KEY with your actual key from Supabase Dashboard

SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
FUNCTION_URL="https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "$FUNCTION_URL"

echo ""
echo "Automation function called at $(date)"

