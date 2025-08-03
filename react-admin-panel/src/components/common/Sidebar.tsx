import React from 'react';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  StarOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  StarTwoTone,
  CalendarOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Users', to: '/users', icon: <UserOutlined /> },
  { label: 'Influencers', to: '/influencers', icon: <StarOutlined /> },
  { label: 'Platforms', to: '/platforms', icon: <AppstoreOutlined /> },
  { label: 'Services', to: '/services', icon: <AppstoreOutlined /> },
  { label: 'Orders', to: '/orders', icon: <ShoppingCartOutlined /> },
  { label: 'Wallets', to: '/wallets', icon: <WalletOutlined /> },
  { label: 'Reviews', to: '/reviews', icon: <StarTwoTone twoToneColor="#faad14" /> },
  { label: 'Bookings', to: '/bookings', icon: <CalendarOutlined /> },
  { label: 'Settings', to: '/settings', icon: <SettingOutlined /> },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  return (
    <div style={{ width: 220, minHeight: '100vh', background: '#001529', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 22, color: '#fff', letterSpacing: 2 }}>
        ADMIN
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ borderRight: 0, flex: 1 }}
      >
        {navItems.map((item) => (
          <Menu.Item key={item.to} icon={item.icon}>
            <Link to={item.to}>{item.label}</Link>
          </Menu.Item>
        ))}
      </Menu>
    </div>
  );
}; 