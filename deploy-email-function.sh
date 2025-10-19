#!/bin/bash

# Deploy Email Function Script
echo "🚀 Deploying Welcome Email Function to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase first:"
    echo "supabase login"
    exit 1
fi

# Set environment variable for Resend API key
echo "🔧 Setting up environment variables..."
supabase secrets set RESEND_API_KEY=re_XUZU3pCV_JV94kXsEuDi9LHpiWrJT1WeQ

# Deploy the function
echo "📦 Deploying send-welcome-email function..."
supabase functions deploy send-welcome-email

if [ $? -eq 0 ]; then
    echo "✅ Welcome email function deployed successfully!"
    echo ""
    echo "📧 Function URL: https://your-project.supabase.co/functions/v1/send-welcome-email"
    echo "🔑 API Key configured: re_XUZU3pCV_JV94kXsEuDi9LHpiWrJT1WeQ"
    echo ""
    echo "🧪 Test the function:"
    echo "curl -X POST https://your-project.supabase.co/functions/v1/send-welcome-email \\"
    echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"email\":\"test@example.com\",\"name\":\"Test User\",\"password\":\"test123\",\"loginUrl\":\"https://your-app.com/login\"}'"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
