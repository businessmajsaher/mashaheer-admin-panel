// Test email function to run in browser console
// Copy and paste this into your browser console when on the admin panel

window.testEmail = async () => {
  console.log('🧪 Testing email service...');
  
  try {
    // Import the email service function
    const { sendWelcomeEmail } = await import('./src/services/emailService.js');
    
    console.log('📧 Sending test email to akshaykc222@gmail.com...');
    
    const result = await sendWelcomeEmail(
      'akshaykc222@gmail.com',
      'Test Influencer',
      'TestPass123!'
    );
    
    console.log('📧 Email result:', result);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check akshaykc222@gmail.com inbox for the welcome email');
      alert('✅ Test email sent successfully! Check akshaykc222@gmail.com inbox.');
    } else {
      console.log('❌ Test email failed:', result.error);
      alert('❌ Test email failed: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    alert('❌ Test email error: ' + error.message);
  }
};

console.log('📧 Test email function loaded. Run: testEmail()');

