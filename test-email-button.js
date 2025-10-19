// Add this to your React app to test email functionality
// You can add this as a temporary button in your admin panel

import { sendWelcomeEmail } from './src/services/emailService';

const TestEmailButton = () => {
  const handleTestEmail = async () => {
    console.log('🧪 Testing email service...');
    
    try {
      const result = await sendWelcomeEmail(
        'akshaykc222@gmail.com',
        'Test Influencer',
        'TestPass123!'
      );
      
      console.log('📧 Email result:', result);
      
      if (result.success) {
        alert('✅ Test email sent successfully! Check akshaykc222@gmail.com inbox.');
      } else {
        alert('❌ Test email failed: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Test email error:', error);
      alert('❌ Test email error: ' + error.message);
    }
  };

  return (
    <button 
      onClick={handleTestEmail}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        background: '#1890ff',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      🧪 Test Email
    </button>
  );
};

export default TestEmailButton;

