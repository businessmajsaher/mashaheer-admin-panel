import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Row, Col, Divider, Typography, Space, Select } from 'antd';

import { SaveOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
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
        const cooldownHrs = appSettingsData.booking_cooldown_hours
          ? parseInt(appSettingsData.booking_cooldown_hours, 10)
          : appSettingsData.booking_cooldown_days
            ? Math.max(0, parseInt(appSettingsData.booking_cooldown_days, 10) * 8)
            : 24;

        const appDual = parseFloat(appSettingsData.dual_platform_commission_percentage || '');
        const commissionPct =
          Number.isFinite(appDual) && appDual >= 0 && appDual <= 100
            ? appDual
            : data.commission_percentage ?? 5;

        form.setFieldsValue({
          influencer_approval_hours: data.influencer_approval_hours || 12,
          payment_deadline_hours: data.payment_deadline_hours || 12,
          appointment_end_hour: data.appointment_end_hour || 23,
          appointment_end_minute: data.appointment_end_minute || 59,

          booking_cooldown_hours: Number.isFinite(cooldownHrs) ? cooldownHrs : 24,
          refund_buffer_days: appSettingsData.refund_buffer_days
            ? parseInt(appSettingsData.refund_buffer_days, 10)
            : 7,
          max_script_reject_count: appSettingsData.max_script_reject_count
            ? parseInt(appSettingsData.max_script_reject_count, 10)
            : 3,
          commission_percentage: commissionPct,
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
      const {
        booking_cooldown_hours,
        refund_buffer_days,
        max_script_reject_count,
        ...platformSettings
      } = values;

      const updated = await settingsService.updateSettings(platformSettings);
      setSettings(updated);

      if (platformSettings.commission_percentage !== undefined && platformSettings.commission_percentage !== null) {
        await settingsService.updateAppSetting(
          'dual_platform_commission_percentage',
          String(platformSettings.commission_percentage)
        );
        setAppSettings((prev) => ({
          ...prev,
          dual_platform_commission_percentage: String(platformSettings.commission_percentage)
        }));
      }

      if (booking_cooldown_hours !== undefined) {
        await settingsService.updateAppSetting('booking_cooldown_hours', String(booking_cooldown_hours));
        setAppSettings((prev) => ({
          ...prev,
          booking_cooldown_hours: String(booking_cooldown_hours)
        }));
      }
      if (refund_buffer_days !== undefined) {
        await settingsService.updateAppSetting('refund_buffer_days', String(refund_buffer_days));
        setAppSettings((prev) => ({ ...prev, refund_buffer_days: String(refund_buffer_days) }));
      }
      if (max_script_reject_count !== undefined) {
        await settingsService.updateAppSetting('max_script_reject_count', String(max_script_reject_count));
        setAppSettings((prev) => ({
          ...prev,
          max_script_reject_count: String(max_script_reject_count)
        }));
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
            appointment_end_hour: 23,
            appointment_end_minute: 59,
            booking_cooldown_hours: 24,
            refund_buffer_days: 7,
            max_script_reject_count: 3,
            commission_percentage: 5,
          }}
        >
          <Divider orientation="left">
            <Space>
              <DollarOutlined />
              <span>Platform commission</span>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Platform commission (%) — dual & shared services"
                name="commission_percentage"
                tooltip="Percentage taken by the platform from the net amount after payment gateway fees (dual services)."
                rules={[
                  { required: true, message: 'Please enter percentage' },
                  { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  precision={2}
                  addonAfter="%"
                  placeholder="5"
                />
              </Form.Item>
            </Col>
          </Row>
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
                label="Customer Approval and Payment Deadline"
                name="payment_deadline_hours"
                tooltip="Hours for customer to approve and pay after influencer approval"
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
                label="Booking cooldown"
                name="booking_cooldown_hours"
                tooltip="Minimum hours before the same customer can book the same influencer again."
                rules={[
                  { required: true, message: 'Required' },
                  { type: 'number', min: 0, message: 'Must be 0 or more' }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="hours" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Refund buffer (days)"
                name="refund_buffer_days"
                tooltip="Days after publish before earnings are final; used with refund rules."
                rules={[
                  { required: true, message: 'Required' },
                  { type: 'number', min: 0, message: 'Must be 0 or more' }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} precision={0} addonAfter="days" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Max script reject count"
                name="max_script_reject_count"
                tooltip="Maximum script revision rounds allowed before escalation."
                rules={[
                  { required: true, message: 'Required' },
                  { type: 'number', min: 1, message: 'Must be at least 1' }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} precision={0} />
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
    </div >
  );
}
