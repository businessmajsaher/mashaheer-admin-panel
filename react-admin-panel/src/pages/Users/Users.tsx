import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Tag, Space, Avatar, message } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { supabase } from '@/services/supabaseClient';

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
        <Button type="link" icon={<EditOutlined />} size="small">
          Edit
        </Button>
        <Button 
          type="link" 
          icon={<DeleteOutlined />} 
          size="small"
          danger
        >
          Suspend
        </Button>
      </Space>
    ),
  },
];

export default function Users() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      // Get customers with pagination
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) {
        throw error;
      }

      setCustomers(data || []);
      setTotal(count || 0);
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

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Customers</Typography.Title>
        <Button type="primary" icon={<UserAddOutlined />}>Add Customer</Button>
      </div>
      
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
  );
} 