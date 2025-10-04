import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/MockAuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting mock signIn with:', values.email);
      await signIn(values.email, values.password);
      console.log('Mock SignIn successful, navigating to /dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Mock SignIn error:', err);
      let msg = err?.message || 'Login failed';
      setError(msg);
    } finally {
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