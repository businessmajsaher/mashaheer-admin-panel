// Test script for the welcome email function
// Run this with: node test-email-function.js

const testEmailFunction = async () => {
  const SUPABASE_URL = 'https://wilshhncdehbnyldsjzs.supabase.co'
  const SUPABASE_ANON_KEY = 'your_anon_key_here' // Replace with your actual anon key
  
  const testData = {
    email: 'test@example.com', // Replace with a real email for testing
    name: 'Test Influencer',
    password: 'TestPass123!',
    loginUrl: 'https://your-app.com/login'
  }
  
  try {
    console.log('🧪 Testing welcome email function...')
    console.log('📧 Sending test email to:', testData.email)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Email sent successfully!')
      console.log('📧 Email ID:', result.emailId)
      console.log('📧 Response:', result)
    } else {
      console.log('❌ Email failed to send')
      console.log('❌ Error:', result.error)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEmailFunction()
