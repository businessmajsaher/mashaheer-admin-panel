import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  WalletOutlined,
  StarOutlined,
  CalendarOutlined,
  SettingOutlined,
  GlobalOutlined,
  SafetyOutlined,
  QuestionCircleOutlined,
  PhoneOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/context/ThemeContext';

const { Sider } = Layout;
const { Title } = Typography;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/influencers',
      icon: <TeamOutlined />,
      label: 'Influencers',
    },
    {
      key: '/categories',
      icon: <AppstoreOutlined />,
      label: 'Categories',
    },
    {
      key: '/services',
      icon: <ShoppingOutlined />,
      label: 'Services',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: 'Contracts',
    },
    {
      key: '/wallets',
      icon: <WalletOutlined />,
      label: 'Wallets',
    },
    {
      key: '/reviews',
      icon: <StarOutlined />,
      label: 'Reviews',
    },
    {
      key: '/bookings',
      icon: <CalendarOutlined />,
      label: 'Bookings',
    },
    {
      key: '/platforms',
      icon: <GlobalOutlined />,
      label: 'Platforms',
    },
    {
      type: 'divider',
    },
    {
      key: '/legal-notices',
      icon: <SafetyOutlined />,
      label: 'Legal Notices',
    },
    {
      key: '/privacy-policy',
      icon: <BookOutlined />,
      label: 'Privacy Policy',
    },
    {
      key: '/terms-of-service',
      icon: <FileTextOutlined />,
      label: 'Terms of Service',
    },
    {
      key: '/contact-support',
      icon: <PhoneOutlined />,
      label: 'Contact Support',
    },
    {
      key: '/help-support',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
    },
    {
      type: 'divider',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      width={250}
      style={{
        background: isDarkMode ? '#001529' : '#fff',
        borderRight: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
      }}
      theme={isDarkMode ? 'dark' : 'light'}
    >
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Title
          level={4}
          style={{
            margin: 0,
            color: isDarkMode ? '#fff' : '#1890ff',
            fontWeight: 'bold',
          }}
        >
          Mashaheer Admin
        </Title>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          background: 'transparent',
          border: 'none',
        }}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </Sider>
  );
};

export default Sidebar;
