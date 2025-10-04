import React, { useEffect, useState } from 'react';
import { Card, Alert, Spin, Button, Input, Form, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

interface SupabaseAuthProps {
  mode: 'signin' | 'signup' | 'forgot-password' | 'reset-password';
  onSuccess?: () => void;
}

export default function SupabaseAuth({ mode, onSuccess }: SupabaseAuthProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Get reset token from URL if in reset-password mode
  useEffect(() => {
    if (mode === 'reset-password') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('code');
      if (token) {
        setResetToken(token);
      }
    }
  }, [mode]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage('Sign in successful!');
      onSuccess?.();
    } catch (error: any) {
      setMessage(error.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setMessage('Sign up successful! Please check your email for verification.');
    } catch (error: any) {
      setMessage(error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) throw error;

      setMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setMessage('No reset token found. Please use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      // Exchange the token for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(resetToken);
      
      if (error) throw error;

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setMessage('Password updated successfully! You can now sign in.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'signin':
        return (
          <>
            <Form.Item>
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </Form.Item>
            <Form.Item>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
            <Button type="primary" block loading={loading} onClick={handleSignIn}>
              Sign In
            </Button>
          </>
        );

      case 'signup':
        return (
          <>
            <Form.Item>
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </Form.Item>
            <Form.Item>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Item>
            <Button type="primary" block loading={loading} onClick={handleSignUp}>
              Sign Up
            </Button>
          </>
        );

      case 'forgot-password':
        return (
          <>
            <Form.Item>
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </Form.Item>
            <Button type="primary" block loading={loading} onClick={handleForgotPassword}>
              Send Reset Email
            </Button>
          </>
        );

      case 'reset-password':
        return (
          <>
            <Form.Item>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Item>
            <Button type="primary" block loading={loading} onClick={handleResetPassword}>
              Reset Password
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Sign Up';
      case 'forgot-password': return 'Forgot Password';
      case 'reset-password': return 'Reset Password';
      default: return 'Authentication';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Card style={{ width: '100%', maxWidth: '400px' }} title={getTitle()}>
        {message && (
          <Alert
            message={message}
            type={message.includes('successful') ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form layout="vertical">
          {renderForm()}
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {mode === 'signin' && (
            <>
              <Button type="link" onClick={() => window.location.href = '/auth?mode=signup'}>
                Don't have an account? Sign up
              </Button>
              <br />
              <Button type="link" onClick={() => window.location.href = '/auth?mode=forgot-password'}>
                Forgot password?
              </Button>
            </>
          )}
          
          {mode === 'signup' && (
            <Button type="link" onClick={() => window.location.href = '/auth?mode=signin'}>
              Already have an account? Sign in
            </Button>
          )}
          
          {mode === 'forgot-password' && (
            <Button type="link" onClick={() => window.location.href = '/auth?mode=signin'}>
              Back to sign in
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}


