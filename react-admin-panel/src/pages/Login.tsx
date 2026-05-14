import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const infoMessage = (location.state as { message?: string } | null)?.message;

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    // Hard safety: if anything wedges, never leave the user stuck on
    // the spinner. 15s is comfortably longer than a normal sign-in.
    const safety = setTimeout(() => {
      console.warn('Login: safety timeout reached, releasing spinner.');
      setLoading(false);
      setError(
        'Sign in is taking longer than expected. Please check your network and try again.'
      );
    }, 15000);

    try {
      console.log('Attempting signIn with:', values.email);
      const { user } = await signIn(values.email, values.password);

      console.log('Login: access diagnostics', {
        email: user?.email,
        is_super_admin: user?.is_super_admin,
        is_staff: user?.is_staff,
        role: user?.role,
      });

      const allowed = !!user && (user.is_super_admin === true || user.is_staff === true);
      if (!allowed) {
        await signOut();
        setError(
          'This account is not authorized for the admin panel. Ask your super administrator to create a staff account for you.'
        );
        return;
      }

      console.log('SignIn successful, navigating to /dashboard');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('SignIn error:', err);
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      clearTimeout(safety);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', position: 'relative' }}>
      {loading && <Spin size="large" tip="Signing in..." fullscreen />}
      <Card style={{ width: 350, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          Admin Login
        </Typography.Title>
        {infoMessage && (
          <Alert message={infoMessage} type="info" showIcon style={{ marginBottom: 16 }} closable />
        )}
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Sign In
            </Button>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <a href="#">Forgot Password?</a>
              <Link to="/signup">Sign up</Link>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
