import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message, Form, Input, Select, Row, Col, Divider } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, PhoneOutlined, MailOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { contactSupportService, supportTicketsService, ContactSupportInfo } from '@/services/legalSupportService';

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
    try {
      // Create support ticket using mock service
      await supportTicketsService.createTicket({
        user_id: 'mock-user-id', // In real app, get from auth context
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
      <Title level={2} style={{ color: '#000' }}>إدارة دعم العملاء</Title>
      <Paragraph style={{ color: '#333' }}>
        إدارة معلومات دعم العملاء وتوفير طرق متعددة للمستخدمين للوصول إلى فريق الدعم الخاص بك.
      </Paragraph>

      <Alert
        message="إدارة دعم العملاء"
        description="تعديل معلومات الاتصال وساعات الدعم ومحتوى المساعدة. يتم حفظ التغييرات في قاعدة البيانات."
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
                        آخر تحديث: {new Date(info.last_updated).toLocaleDateString()}
                      </small>
                      {editingId !== info.id && (
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => handleEdit(info)}
                          style={{ backgroundColor: '#000', borderColor: '#000' }}
                        >
                          تعديل
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
                          محتوى HTML:
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
                        placeholder="أدخل محتوى HTML هنا..."
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
                        حفظ التغييرات
                      </Button>
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleCancel}
                        style={{ color: '#000', borderColor: '#000' }}
                      >
                        إلغاء
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
          <Card title="معاينة نموذج الاتصال" style={{ position: 'sticky', top: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormSubmit}
            >
              <Form.Item
                name="name"
                label="الاسم الكامل"
                rules={[{ required: true, message: 'يرجى إدخال اسمك' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="اسمك الكامل" />
              </Form.Item>

              <Form.Item
                name="email"
                label="عنوان البريد الإلكتروني"
                rules={[
                  { required: true, message: 'يرجى إدخال بريدك الإلكتروني' },
                  { type: 'email', message: 'يرجى إدخال بريد إلكتروني صحيح' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="your.email@example.com" />
              </Form.Item>

              <Form.Item
                name="subject"
                label="الموضوع"
                rules={[{ required: true, message: 'يرجى إدخال موضوع' }]}
              >
                <Input placeholder="ملخص موجز لاستفسارك" />
              </Form.Item>

              <Form.Item
                name="category"
                label="الفئة"
                rules={[{ required: true, message: 'يرجى اختيار فئة' }]}
              >
                <Select placeholder="اختر فئة">
                  <Option value="technical">مشاكل تقنية</Option>
                  <Option value="account">إدارة الحساب</Option>
                  <Option value="payment">الدفع والفواتير</Option>
                  <Option value="campaign">دعم الحملات</Option>
                  <Option value="feature">طلبات الميزات</Option>
                  <Option value="general">استفسار عام</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="priority"
                label="الأولوية"
                rules={[{ required: true, message: 'يرجى اختيار الأولوية' }]}
              >
                <Select placeholder="اختر مستوى الأولوية">
                  <Option value="low">منخفض - أسئلة عامة</Option>
                  <Option value="medium">متوسط - مشاكل الحساب</Option>
                  <Option value="high">عالي - قضايا عاجلة</Option>
                  <Option value="critical">حرج - مشاكل المنصة</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="message"
                label="الرسالة"
                rules={[{ required: true, message: 'يرجى إدخال رسالتك' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="يرجى وصف مشكلتك أو سؤالك بالتفصيل..."
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block icon={<MessageOutlined />} style={{ backgroundColor: '#000', borderColor: '#000' }}>
                  إرسال الرسالة
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                <ClockCircleOutlined /> رد خلال 24 ساعة
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}


