import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, Alert, Spin, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

export default function Influencers() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch influencers from Supabase
  useEffect(() => {
    async function fetchInfluencers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .eq('role', 'influencer')
        .order('created_at', { ascending: false });
      if (error) message.error(error.message);
      setInfluencers(data || []);
      setLoading(false);
    }
    fetchInfluencers();
  }, [modalOpen]); // refresh after modal closes

  // Add Influencer handler
  const handleAddInfluencer = async (values: any) => {
    setFormLoading(true);
    setFormError(null);
    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { role: 'influencer', name: values.name } },
      });
      if (authError) throw authError;
      // 2. Insert into profiles table
      const { user } = authData;
      if (user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            name: values.name,
            email: values.email,
            role: 'influencer',
            created_at: new Date().toISOString(),
          },
        ]);
        if (profileError) throw profileError;
      }
      message.success('Influencer created!');
      setModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create influencer');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Influencers</Typography.Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)}>
          Add Influencer
        </Button>
      </div>
      {loading ? <Spin size="large" /> : <Table columns={columns} dataSource={influencers} rowKey="id" />}
      <Modal
        title="Add Influencer"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleAddInfluencer}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name' }]}> <Input autoFocus /> </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter an email' }]}> <Input type="email" /> </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter a password' }]}> <Input.Password /> </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>Create</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
} 