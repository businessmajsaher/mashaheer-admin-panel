import React, { useEffect, useState } from 'react';
import { Card, Alert, Spin, Button } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function PasswordResetCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get the code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          setStatus('error');
          setMessage('No reset code found in URL');
          return;
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Password reset error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to reset password');
          return;
        }

        if (data.user) {
          setStatus('success');
          setMessage('Password reset successful! You can now set a new password.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    handlePasswordReset();
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />;
      default:
        return <Spin size="large" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'error':
        return '#ff4d4f';
      default:
        return '#1890ff';
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
      <Card style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          {getStatusIcon()}
        </div>
        
        <h2 style={{ color: getStatusColor(), marginBottom: '16px' }}>
          {status === 'loading' && 'Processing Password Reset...'}
          {status === 'success' && 'Password Reset Successful!'}
          {status === 'error' && 'Password Reset Failed'}
        </h2>
        
        <p style={{ marginBottom: '24px', fontSize: '16px' }}>
          {message}
        </p>
        
        {status === 'success' && (
          <p style={{ color: '#666', fontSize: '14px' }}>
            Redirecting to login page in 3 seconds...
          </p>
        )}
        
        {status === 'error' && (
          <Button 
            type="primary" 
            onClick={() => navigate('/login')}
            style={{ marginRight: '12px' }}
          >
            Go to Login
          </Button>
        )}
        
        <Button onClick={() => navigate('/')}>
          Go Home
        </Button>
      </Card>
    </div>
  );
}
