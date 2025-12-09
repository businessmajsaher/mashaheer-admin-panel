import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Row, Col, Divider, Typography, Space } from 'antd';
import { SaveOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { settingsService, PlatformSettings } from '../../services/settingsService';

const { Title, Text } = Typography;

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch platform settings
      const data = await settingsService.getSettings();
      setSettings(data);
      
      // Fetch app settings
      const appSettingsData = await settingsService.getAppSettings();
      setAppSettings(appSettingsData);
      
      if (data) {
        form.setFieldsValue({
          influencer_approval_hours: data.influencer_approval_hours || 12,
          payment_deadline_hours: data.payment_deadline_hours || 12,
          script_submission_base_hours: data.script_submission_base_hours || 8,
          influencer_response_minutes: data.influencer_response_minutes || 30,
          auto_approval_hour: data.auto_approval_hour || 22,
          auto_approval_minute: data.auto_approval_minute || 30,
          appointment_end_hour: data.appointment_end_hour || 23,
          appointment_end_minute: data.appointment_end_minute || 59,
          booking_cooldown_days: appSettingsData.booking_cooldown_days ? parseInt(appSettingsData.booking_cooldown_days) : 2,
        });
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      message.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      // Save platform settings (excluding booking_cooldown_days)
      const { booking_cooldown_days, ...platformSettings } = values;
      const updated = await settingsService.updateSettings(platformSettings);
      setSettings(updated);
      
      // Save app settings (booking_cooldown_days)
      if (booking_cooldown_days !== undefined) {
        await settingsService.updateAppSetting('booking_cooldown_days', booking_cooldown_days.toString());
        setAppSettings(prev => ({ ...prev, booking_cooldown_days: booking_cooldown_days.toString() }));
      }
      
      message.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      message.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>App Settings</Title>
      
      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            influencer_approval_hours: 12,
            payment_deadline_hours: 12,
            script_submission_base_hours: 8,
            influencer_response_minutes: 30,
            auto_approval_hour: 22,
            auto_approval_minute: 30,
            appointment_end_hour: 23,
            appointment_end_minute: 59,
            booking_cooldown_days: 2,
          }}
        >
          {/* Automation Timing Settings */}
          <Divider orientation="left">
            <Space>
              <ClockCircleOutlined />
              <span>Automatic Status Change Timing</span>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Influencer Approval Deadline"
                name="influencer_approval_hours"
                tooltip="Hours for influencer to approve/reject booking after creation"
                rules={[
                  { required: true, message: 'Please enter hours' },
                  { type: 'number', min: 1, message: 'Must be at least 1 hour' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={1}
                  addonAfter="hours"
                  placeholder="12"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Payment Deadline"
                name="payment_deadline_hours"
                tooltip="Hours for customer to pay after influencer approval"
                rules={[
                  { required: true, message: 'Please enter hours' },
                  { type: 'number', min: 1, message: 'Must be at least 1 hour' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={1}
                  addonAfter="hours"
                  placeholder="12"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Script Submission Base Hours"
                name="script_submission_base_hours"
                tooltip="Base hours for script submission (multiplied by days_gap - 1). Example: 8 hours × (2 days - 1) = 8 hours"
                rules={[
                  { required: true, message: 'Please enter hours' },
                  { type: 'number', min: 1, message: 'Must be at least 1 hour' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={1}
                  addonAfter="hours"
                  placeholder="8"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Influencer Response Time"
                name="influencer_response_minutes"
                tooltip="Minutes for influencer to respond after script rejection (before AI takes over)"
                rules={[
                  { required: true, message: 'Please enter minutes' },
                  { type: 'number', min: 1, message: 'Must be at least 1 minute' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={0}
                  addonAfter="minutes"
                  placeholder="30"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Auto-Approval Time"
                tooltip="Time of day when latest script is auto-approved if still pending"
              >
                <Space>
                  <Form.Item
                    name="auto_approval_hour"
                    noStyle
                    rules={[
                      { required: true, message: 'Hour required' },
                      { type: 'number', min: 0, max: 23, message: 'Must be 0-23' }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={23}
                      precision={0}
                      addonBefore="Hour"
                      style={{ width: 120 }}
                      placeholder="22"
                    />
                  </Form.Item>
                  <Form.Item
                    name="auto_approval_minute"
                    noStyle
                    rules={[
                      { required: true, message: 'Minute required' },
                      { type: 'number', min: 0, max: 59, message: 'Must be 0-59' }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={59}
                      precision={0}
                      addonBefore="Min"
                      style={{ width: 120 }}
                      placeholder="30"
                    />
                  </Form.Item>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  Default: 22:30 (10:30 PM)
                </Text>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Appointment End Time"
                tooltip="Time of day when appointment ends and service closes"
              >
                <Space>
                  <Form.Item
                    name="appointment_end_hour"
                    noStyle
                    rules={[
                      { required: true, message: 'Hour required' },
                      { type: 'number', min: 0, max: 23, message: 'Must be 0-23' }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={23}
                      precision={0}
                      addonBefore="Hour"
                      style={{ width: 120 }}
                      placeholder="23"
                    />
                  </Form.Item>
                  <Form.Item
                    name="appointment_end_minute"
                    noStyle
                    rules={[
                      { required: true, message: 'Minute required' },
                      { type: 'number', min: 0, max: 59, message: 'Must be 0-59' }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={59}
                      precision={0}
                      addonBefore="Min"
                      style={{ width: 120 }}
                      placeholder="59"
                    />
                  </Form.Item>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  Default: 23:59 (11:59 PM)
                </Text>
              </Form.Item>
            </Col>
          </Row>

          {/* Booking Cooldown Settings */}
          <Divider orientation="left">
            <Space>
              <ClockCircleOutlined />
              <span>Booking Settings</span>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Booking Cooldown Days"
                name="booking_cooldown_days"
                tooltip="Minimum number of days between bookings for the same influencer"
                rules={[
                  { required: true, message: 'Please enter cooldown days' },
                  { type: 'number', min: 0, message: 'Must be 0 or greater' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={0}
                  addonAfter="days"
                  placeholder="2"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size="large"
            >
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
