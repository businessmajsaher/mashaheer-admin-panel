import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message, Form, Input, Select, Row, Col, Divider } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, PhoneOutlined, MailOutlined, MessageOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { contactSupportService, supportTicketsService, ContactSupportInfo } from '@/services/legalSupportService';
import { useAuth } from '@/context/AuthContext';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  priority: string;
}

export default function ContactSupport() {
  const { user } = useAuth();
  const [contactInfo, setContactInfo] = useState<ContactSupportInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Load contact support info from mock service
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const data = await contactSupportService.getAllContactInfo();
        setContactInfo(data);
      } catch (error) {
        message.error('Failed to load contact support information');
        console.error('Error fetching contact info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  const handleEdit = (info: ContactSupportInfo) => {
    setEditingId(info.id);
    setEditContent(info.content);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      await contactSupportService.updateContactInfo(editingId, {
        content: editContent,
        last_updated: new Date().toISOString()
      });

      // Refresh the data
      const updatedData = await contactSupportService.getAllContactInfo();
      setContactInfo(updatedData);

      setEditingId(null);
      setEditContent('');
      message.success('Contact information updated successfully!');
    } catch (error) {
      message.error('Failed to save changes');
      console.error('Error updating contact info:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleFormSubmit = async (values: ContactForm) => {
    if (!user) {
      message.error('You must be logged in to send a message');
      return;
    }

    try {
      // Create support ticket using real user ID
      await supportTicketsService.createTicket({
        user_id: user.id,
        subject: values.subject,
        message: values.message,
        category: values.category,
        priority: values.priority as any,
        status: 'open'
      });

      message.success('Your message has been sent! We\'ll respond within 24 hours.');
      form.resetFields();
    } catch (error) {
      message.error('Failed to send message. Please try again.');
      console.error('Error creating support ticket:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ color: '#000' }}>Customer Support Management</Title>
      <Paragraph style={{ color: '#333' }}>
        Manage customer support information and provide multiple ways for users to access your support team.
      </Paragraph>

      <Alert
        message="Customer Support Management"
        description="Edit contact information, support hours, and help content. Changes are saved to the database."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {contactInfo.map((info) => (
              <Card
                key={info.id}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{info.title}</span>
                    <Space>
                      <small style={{ color: '#666' }}>
                        Last updated: {new Date(info.last_updated).toLocaleDateString()}
                      </small>
                      {editingId !== info.id && (
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => handleEdit(info)}
                          style={{ backgroundColor: '#000', borderColor: '#000' }}
                        >
                          Edit
                        </Button>
                      )}
                    </Space>
                  </div>
                }
                style={{ width: '100%' }}
              >
                {editingId === info.id ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#000' }}>
                        HTML Content:
                      </label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                          width: '100%',
                          height: '300px',
                          padding: '12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                        placeholder="Enter HTML content here..."
                      />
                    </div>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                        style={{ backgroundColor: '#000', borderColor: '#000' }}
                      >
                        Save Changes
                      </Button>
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleCancel}
                        style={{ color: '#000', borderColor: '#000' }}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: info.content }}
                    style={{
                      lineHeight: '1.6',
                      color: '#333'
                    }}
                  />
                )}
              </Card>
            ))}
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Contact Form Preview" style={{ position: 'sticky', top: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormSubmit}
            >
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Your full name" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="your.email@example.com" />
              </Form.Item>

              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: 'Please enter a subject' }]}
              >
                <Input placeholder="Brief summary of your inquiry" />
              </Form.Item>

              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="technical">Technical Issues</Option>
                  <Option value="account">Account Management</Option>
                  <Option value="payment">Payment & Billing</Option>
                  <Option value="campaign">Campaign Support</Option>
                  <Option value="feature">Feature Requests</Option>
                  <Option value="general">General Inquiry</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority level">
                  <Option value="low">Low - General Questions</Option>
                  <Option value="medium">Medium - Account Issues</Option>
                  <Option value="high">High - Urgent Issues</Option>
                  <Option value="critical">Critical - Platform Problems</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: 'Please enter your message' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Please describe your problem or question in detail..."
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block icon={<MessageOutlined />} style={{ backgroundColor: '#000', borderColor: '#000' }}>
                  Send Message
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                <ClockCircleOutlined /> Response within 24 hours
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
