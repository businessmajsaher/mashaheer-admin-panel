// Test script to send a welcome email to akshaykc222@gmail.com
// This will test the email service directly

import { sendWelcomeEmail } from './react-admin-panel/src/services/emailService.js';

const sendTestEmail = async () => {
  console.log('🧪 Sending test welcome email to akshaykc222@gmail.com...');
  
  try {
    const result = await sendWelcomeEmail(
      'akshaykc222@gmail.com',
      'Test Influencer',
      'TestPass123!'
    );
    
    console.log('📧 Test email result:', result);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check akshaykc222@gmail.com inbox for the welcome email');
    } else {
      console.log('❌ Test email failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
  }
};

// Run the test
sendTestEmail();

