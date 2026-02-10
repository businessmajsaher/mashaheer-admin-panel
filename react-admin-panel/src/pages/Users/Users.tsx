import React, { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Typography, Tag, Space, Avatar, message, Modal, Form, Input, Alert, Switch, Upload, Popconfirm } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, EyeOutlined, KeyOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';
import { PasswordResetModal } from '@/components/PasswordResetModal';

interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  profile_image_url?: string;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
}



export default function Users() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [passwordResetModal, setPasswordResetModal] = useState({
    isOpen: false,
    email: '',
    name: ''
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<any>(null);
  const [editProfileImageFile, setEditProfileImageFile] = useState<any>(null);
  const [currentProfileImageUrl, setCurrentProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) {
      return allCustomers;
    }
    const searchLower = search.toLowerCase();
    return allCustomers.filter((customer) =>
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.bio?.toLowerCase().includes(searchLower)
    );
  }, [allCustomers, search]);

  // Update customers based on filtered results and pagination
  useEffect(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setCustomers(filteredCustomers.slice(start, end));
    setTotal(filteredCustomers.length);
  }, [filteredCustomers, currentPage, pageSize]);

  // Populate edit form when modal opens
  useEffect(() => {
    if (editModalOpen && editingCustomer) {
      editForm.resetFields();
      editForm.setFieldsValue({
        name: editingCustomer.name,
        email: editingCustomer.email,
        bio: editingCustomer.bio || '',
        is_verified: editingCustomer.is_verified,
        is_suspended: editingCustomer.is_suspended,
        profile_image_url: editingCustomer.profile_image_url,
      });
      setEditProfileImageFile(null);
      setCurrentProfileImageUrl(editingCustomer.profile_image_url || null);
    }
    if (!editModalOpen) {
      editForm.resetFields();
      setEditProfileImageFile(null);
      setCurrentProfileImageUrl(null);
    }
  }, [editModalOpen, editingCustomer, editForm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch all customers for search functionality
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAllCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handlePasswordReset = (email: string, name: string) => {
    setPasswordResetModal({
      isOpen: true,
      email,
      name
    });
  };

  const closePasswordResetModal = () => {
    setPasswordResetModal({
      isOpen: false,
      email: '',
      name: ''
    });
  };

  // Handle suspend/unsuspend customer
  const handleSuspendCustomer = async (customer: Customer) => {
    try {
      const newSuspendedStatus = !customer.is_suspended;
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: newSuspendedStatus })
        .eq('id', customer.id);

      if (error) throw error;

      message.success(
        newSuspendedStatus 
          ? `Customer ${customer.name} has been suspended` 
          : `Customer ${customer.name} has been unsuspended`
      );
      fetchCustomers();
    } catch (err: any) {
      message.error(err.message || 'Failed to update suspension status');
    }
  };

  // Handle add customer
  const handleAddCustomer = async (values: any) => {
    setFormLoading(true);
    setFormError(null);
    try {
      let profile_image_url = values.profile_image_url;
      
      // Upload profile image if provided
      if (profileImageFile) {
        const filePath = `customer-profiles/${Date.now()}-${profileImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        // Try influencer-profile bucket first (common bucket), fallback to profiles
        let uploadError = null;
        let bucket = 'influencer-profile';
        
        const { error: err1 } = await supabase.storage
          .from(bucket)
          .upload(filePath, profileImageFile, { upsert: true });
        
        if (err1) {
          // Try profiles bucket as fallback
          bucket = 'profiles';
          const { error: err2 } = await supabase.storage
            .from(bucket)
            .upload(filePath, profileImageFile, { upsert: true });
          uploadError = err2;
        }
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        profile_image_url = publicUrlData?.publicUrl;
      }

      // Get session token for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session. Please log in again.');
      }
      const token = sessionData.session.access_token;

      // Call edge function to create customer using admin API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password || 'TempPassword123!',
          name: values.name,
          bio: values.bio || null,
          profile_image_url: profile_image_url || null,
          is_verified: values.is_verified || false,
          is_suspended: values.is_suspended || false,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create customer' }));
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to create customer`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create customer');
      }

      message.success('Customer added successfully!');
      setAddModalOpen(false);
      form.resetFields();
      setProfileImageFile(null);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add customer');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle edit customer
  const handleEditCustomer = async (values: any) => {
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      if (!editingCustomer) return;

      let profile_image_url = editingCustomer.profile_image_url;
      
      // Upload new profile image if provided
      if (editProfileImageFile) {
        const filePath = `customer-profiles/${Date.now()}-${editProfileImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        // Try influencer-profile bucket first (common bucket), fallback to profiles
        let uploadError = null;
        let bucket = 'influencer-profile';
        
        const { error: err1 } = await supabase.storage
          .from(bucket)
          .upload(filePath, editProfileImageFile, { upsert: true });
        
        if (err1) {
          // Try profiles bucket as fallback
          bucket = 'profiles';
          const { error: err2 } = await supabase.storage
            .from(bucket)
            .upload(filePath, editProfileImageFile, { upsert: true });
          uploadError = err2;
        }
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        profile_image_url = publicUrlData?.publicUrl;
      }

      // Update profile
      const updatePayload: any = {
        name: values.name,
        email: values.email,
        bio: values.bio || null,
        is_verified: values.is_verified || false,
        is_suspended: values.is_suspended || false,
      };

      // Only update profile_image_url if it changed
      if (profile_image_url !== editingCustomer.profile_image_url) {
        updatePayload.profile_image_url = profile_image_url || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', editingCustomer.id);

      if (error) throw error;

      message.success('Customer updated successfully!');
      setEditModalOpen(false);
      setEditingCustomer(null);
      setEditProfileImageFile(null);
      setCurrentProfileImageUrl(null);
      fetchCustomers();
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update customer');
    } finally {
      setEditFormLoading(false);
    }
  };

  const columns = [
    {
      title: 'Profile',
      key: 'profile',
      render: (record: Customer) => (
        <Space>
          <Avatar 
            src={record.profile_image_url} 
            size={40}
            style={{ backgroundColor: record.profile_image_url ? 'transparent' : '#1890ff' }}
          >
            {record.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: Customer) => (
        <Space>
          {record.is_verified && <Tag color="green">Verified</Tag>}
          {record.is_suspended && <Tag color="red">Suspended</Tag>}
          {!record.is_verified && !record.is_suspended && <Tag color="default">Pending</Tag>}
        </Space>
      ),
    },
    {
      title: 'Bio',
      dataIndex: 'bio',
      key: 'bio',
      render: (bio: string) => bio ? (
        <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bio}
        </div>
      ) : (
        <span style={{ color: '#999' }}>No bio</span>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Customer) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => {
              setEditingCustomer(record);
              setEditModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            icon={<KeyOutlined />} 
            size="small"
            onClick={() => handlePasswordReset(record.email, record.name)}
          >
            Reset Password
          </Button>
          <Popconfirm
            title={record.is_suspended ? "Unsuspend this customer?" : "Suspend this customer?"}
            description={record.is_suspended 
              ? "This customer will be able to access their account again." 
              : "This customer will be unable to access their account."}
            onConfirm={() => handleSuspendCustomer(record)}
            okText="Yes"
            cancelText="No"
          >
          <Button 
            type="link" 
            icon={<DeleteOutlined />} 
            size="small"
              danger={!record.is_suspended}
          >
              {record.is_suspended ? 'Unsuspend' : 'Suspend'}
          </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ margin: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Customers</Typography.Title>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />}
            onClick={() => {
              setAddModalOpen(true);
              form.resetFields();
              setProfileImageFile(null);
            }}
          >
            Add Customer
          </Button>
        </div>
        
        <Input.Search
          placeholder="Search customers by name, email, or bio"
          allowClear
          style={{ width: 300, marginBottom: 16 }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        
        <Table 
          columns={columns} 
          dataSource={customers} 
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <PasswordResetModal
        isOpen={passwordResetModal.isOpen}
        onClose={closePasswordResetModal}
        userEmail={passwordResetModal.email}
        userName={passwordResetModal.name}
      />

      {/* Add Customer Modal */}
      <Modal
        title="Add Customer"
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
          setProfileImageFile(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleAddCustomer}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="bio" label="Bio">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Profile Image">
            <div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  if (!file.type.startsWith('image/')) {
                    message.error('Only image files are allowed.');
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    message.error('Image must be smaller than 5MB');
                    return false;
                  }
                  setProfileImageFile(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Upload Profile Image</Button>
              </Upload>
              {profileImageFile && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={URL.createObjectURL(profileImageFile)}
                    alt="preview"
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }}
                  />
                </div>
              )}
            </div>
          </Form.Item>
          <Form.Item name="is_verified" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="Verified" unCheckedChildren="Not Verified" />
          </Form.Item>
          <Form.Item name="is_suspended" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="Suspended" unCheckedChildren="Active" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={formLoading}>
              Add Customer
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        title="Edit Customer"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingCustomer(null);
          editForm.resetFields();
          setEditProfileImageFile(null);
          setCurrentProfileImageUrl(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {editFormError && <Alert message={editFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form
          key={editingCustomer?.id || 'new'}
          form={editForm}
          layout="vertical"
          onFinish={handleEditCustomer}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="bio" label="Bio">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Profile Image">
            <div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  if (!file.type.startsWith('image/')) {
                    message.error('Only image files are allowed.');
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    message.error('Image must be smaller than 5MB');
                    return false;
                  }
                  setEditProfileImageFile(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Upload New Profile Image</Button>
              </Upload>
              {(editProfileImageFile || currentProfileImageUrl) && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={
                      editProfileImageFile
                        ? URL.createObjectURL(editProfileImageFile)
                        : currentProfileImageUrl || ''
                    }
                    alt="preview"
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '4px' }}
                    onError={(e) => {
                      console.error('Image load error:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </Form.Item>
          <Form.Item name="is_verified" valuePropName="checked">
            <Switch checkedChildren="Verified" unCheckedChildren="Not Verified" />
          </Form.Item>
          <Form.Item name="is_suspended" valuePropName="checked">
            <Switch checkedChildren="Suspended" unCheckedChildren="Active" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={editFormLoading}>
              Update Customer
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
} 