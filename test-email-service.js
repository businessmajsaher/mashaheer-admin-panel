// Test script to verify email service is working
// Run this in browser console or as a separate test

import { sendWelcomeEmail } from './src/services/emailService.js';

const testEmailService = async () => {
  console.log('🧪 Testing email service...');
  
  try {
    const result = await sendWelcomeEmail(
      'test@example.com', // Replace with a real email for testing
      'Test Influencer',
      'TestPass123!'
    );
    
    console.log('📧 Email service result:', result);
    
    if (result.success) {
      console.log('✅ Email service is working!');
    } else {
      console.log('❌ Email service failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Email service test failed:', error);
  }
};

// Uncomment to run the test
// testEmailService();

