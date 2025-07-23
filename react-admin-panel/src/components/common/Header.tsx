import React from 'react';
import { Layout, Avatar, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export const Header: React.FC = () => {
  return (
    <Layout.Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px #f0f1f2' }}>
      <span style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button shape="circle" icon={<UserOutlined />} />
        <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
      </div>
    </Layout.Header>
  );
}; 