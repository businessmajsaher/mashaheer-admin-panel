#!/bin/bash
# Quick test script for booking automation

echo "Testing Booking Automation Function..."
echo ""

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 9754a7a9e6c7d1ab1a841afe4be0f2f00c3fcb76ca08fcb256a6f2ee9b749fae" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation

echo ""
echo ""
echo "Check Supabase Dashboard → Edge Functions → process-booking-automation → Logs"
echo "to see the execution results."
