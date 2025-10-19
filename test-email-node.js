// Test email using Node.js
// Run with: node test-email-node.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wilshhncdehbnyldsjzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbHNoaG5jZGVoYm55bGRzanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI0NzMsImV4cCI6MjA1MDU0ODQ3M30.7QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = async () => {
  console.log('🧪 Testing email service...');
  console.log('📧 Sending test email to akshaykc222@gmail.com...');
  
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: 'akshaykc222@gmail.com',
        name: 'Test Influencer',
        password: 'TestPass123!',
        loginUrl: 'https://your-app.com/login'
      }
    });

    if (error) {
      console.error('❌ Email service error:', error);
      return;
    }

    console.log('📧 Email service response:', data);
    
    if (data.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check akshaykc222@gmail.com inbox for the welcome email');
    } else {
      console.log('❌ Test email failed:', data.error);
    }
  } catch (err) {
    console.error('❌ Test email error:', err);
  }
};

// Run the test
testEmail();

