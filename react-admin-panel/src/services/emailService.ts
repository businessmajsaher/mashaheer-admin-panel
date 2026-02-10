import { supabase } from './supabaseClient';

// Generate a random password
export const generateRandomPassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Send welcome email to influencer
export const sendWelcomeEmail = async (
  email: string, 
  name: string, 
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending welcome email to:', email);
    
    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email,
        name,
        password,
        loginUrl: `${window.location.origin}/login`
      }
    });

    if (error) {
      console.error('❌ Email service error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Welcome email sent successfully');
    return { success: true };
  } catch (err: any) {
    console.error('❌ Email sending failed:', err);
    return { success: false, error: err.message };
  }
};

// Alternative: Send email using a third-party service (if Edge Function is not available)
export const sendWelcomeEmailAlternative = async (
  email: string, 
  name: string, 
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending welcome email (alternative method) to:', email);
    
    // This would use a service like Resend, SendGrid, or similar
    // For now, we'll just log the email content
    const emailContent = {
      to: email,
      subject: 'Welcome to Mashaheer - Your Account is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1890ff; margin: 0;">Welcome to Mashaheer!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #262626; margin: 0 0 15px 0;">Hello ${name}!</h2>
            <p style="color: #595959; margin: 0 0 15px 0; line-height: 1.6;">
              Your influencer account has been successfully created. You can now access your dashboard and start managing your profile.
            </p>
          </div>
          
          <div style="background: #fff; border: 1px solid #d9d9d9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #262626; margin: 0 0 15px 0;">Your Login Credentials:</h3>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 0; color: #1890ff; font-weight: 500;">
                <strong>Email:</strong> ${email}
              </p>
              <p style="margin: 0; color: #1890ff; font-weight: 500;">
                <strong>Password:</strong> ${password}
              </p>
            </div>
            <p style="color: #8c8c8c; font-size: 14px; margin: 0;">
              Please change your password after your first login for security.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${window.location.origin}/login" 
               style="background: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px;">
            <p style="color: #8c8c8c; font-size: 12px; margin: 0; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    console.log('📧 Email content prepared:', {
      to: emailContent.to,
      subject: emailContent.subject,
      name,
      password
    });

    // In a real implementation, you would send this email using a service like:
    // - Resend API
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // For now, we'll simulate success
    console.log('✅ Welcome email prepared successfully (simulation)');
    return { success: true };
  } catch (err: any) {
    console.error('❌ Email preparation failed:', err);
    return { success: false, error: err.message };
  }
};
