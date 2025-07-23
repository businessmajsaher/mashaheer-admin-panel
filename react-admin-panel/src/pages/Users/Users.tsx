import React from 'react';
import { Card, Table, Button, Typography } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';

const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  { id: 3, name: 'Alice Brown', email: 'alice@example.com', role: 'User' },
];

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', dataIndex: 'role', key: 'role' },
  {
    title: 'Action',
    key: 'action',
    render: () => <Button type="link">Edit</Button>,
  },
];

export default function Users() {
  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Users</Typography.Title>
        <Button type="primary" icon={<UserAddOutlined />}>Add User</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" />
    </Card>
  );
} 