import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, message } from 'antd';
import { resetPassword } from '@/services/authService';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  userName = ''
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userEmail) {
      form.setFieldsValue({ email: userEmail });
    }
    if (!isOpen) {
      form.resetFields();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, userEmail, form]);

  const handleSubmit = async (values: any) => {
    const email = values.email.trim();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      // Use the password reset callback page as redirect URL
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      await resetPassword(email, redirectUrl);
      setSuccess(true);
      message.success('Password reset email sent successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send password reset email';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      title="Reset Password"
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ display: success ? 'none' : 'block' }}>
        {userName && (
          <Alert
            message={`Resetting password for: ${userName}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter email address' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
        >
          <Input placeholder="Enter user's email address" disabled={loading} />
        </Form.Item>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Send Reset Email
          </Button>
        </Form.Item>
      </Form>
      
      {success && (
        <div>
          <Alert
            message="Password Reset Email Sent"
            description={
              <div>
                <p>A password reset email has been sent to <strong>{form.getFieldValue('email')}</strong></p>
                <p style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              The user will receive an email with a link to reset their password. 
                </p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleClose}>Close</Button>
          </div>
            </div>
        )}
    </Modal>
  );
};

