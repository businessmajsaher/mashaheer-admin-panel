import React from 'react';
import { Layout, Avatar, Button, Dropdown, Menu, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import type { MenuProps } from 'antd';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'logout',
      label: 'Sign Out',
      // onClick removed
    },
  ];

  return (
    <div style={{ height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', boxShadow: '0 1px 4px #0001' }}>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Typography.Text style={{ fontWeight: 500 }}>{user.email} ({user.role})</Typography.Text>
          <Dropdown
            menu={{
              items: menuItems,
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout();
              },
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Avatar style={{ background: '#1890ff', cursor: 'pointer' }}>{user.email?.[0]?.toUpperCase() || '?'}</Avatar>
          </Dropdown>
        </div>
      )}
    </div>
  );
}; 