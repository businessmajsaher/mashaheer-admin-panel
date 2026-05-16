import React, { useMemo } from 'react';
import { Layout, Menu, Typography, MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  StarOutlined,
  CalendarOutlined,
  SettingOutlined,
  GlobalOutlined,
  SafetyOutlined,
  QuestionCircleOutlined,
  PhoneOutlined,
  BookOutlined,
  GiftOutlined,
  BarChartOutlined,
  WalletOutlined,
  RollbackOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/context/ThemeContext';
import { usePermissions } from '@/context/PermissionContext';

const { Sider } = Layout;
const { Title } = Typography;

interface MenuEntry {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Module key matching seeded permissions (e.g. "users"). */
  module?: string;
  /** Hide entry unless user has at least this permission. */
  requirePermission?: string;
  children?: MenuEntry[];
}

const entries: Array<MenuEntry | { divider: true }> = [
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined />, module: 'dashboard' },
  { key: '/users',     label: 'Users',     icon: <UserOutlined />,      module: 'users' },
  { key: '/influencers', label: 'Influencers', icon: <TeamOutlined />,  module: 'influencers' },
  { key: '/categories',  label: 'Categories',  icon: <AppstoreOutlined />, module: 'categories' },
  { key: '/services',    label: 'Services',    icon: <ShoppingOutlined />, module: 'services' },
  { key: '/contracts',   label: 'Contracts',   icon: <FileTextOutlined />, module: 'contracts' },
  { key: '/reviews',     label: 'Reviews',     icon: <StarOutlined />,    module: 'reviews' },
  { key: '/bookings',    label: 'Bookings',    icon: <CalendarOutlined />, module: 'bookings' },
  { key: '/cash-out',    label: 'Cash Out',    icon: <WalletOutlined />,   module: 'cash_out' },
  { key: '/transactions', label: 'Transactions', icon: <BarChartOutlined />, module: 'transactions' },
  { key: '/refunds',     label: 'Refunds',     icon: <RollbackOutlined />, module: 'refunds' },
  { key: '/platforms',   label: 'Platforms',   icon: <GlobalOutlined />,   module: 'platforms' },
  {
    key: 'discounts', label: 'Discounts', icon: <GiftOutlined />, module: 'discounts',
    children: [
      { key: '/discounts',           label: 'Manage Coupons', module: 'discounts' },
      { key: '/discounts/analytics', label: 'Analytics',      module: 'discounts' },
    ],
  },
  { divider: true },
  { key: '/legal-notices',   label: 'Legal Notices',   icon: <SafetyOutlined />,         module: 'legal_notices' },
  { key: '/privacy-policy',  label: 'Privacy Policy',  icon: <BookOutlined />,           module: 'privacy_policy' },
  { key: '/contact-support', label: 'Contact Support', icon: <PhoneOutlined />,          module: 'contact_support' },
  { key: '/help-support',    label: 'Help & Support',  icon: <QuestionCircleOutlined />, module: 'help_support' },
  { divider: true },
  { key: '/staff',    label: 'Staff Management', icon: <IdcardOutlined />,  module: 'staff' },
  { key: '/settings', label: 'Settings',         icon: <SettingOutlined />, module: 'settings' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { canAccessModule, isSuperAdmin } = usePermissions();

  const menuItems = useMemo<MenuProps['items']>(() => {
    const items: NonNullable<MenuProps['items']> = [];
    for (const e of entries) {
      if ('divider' in e) {
        items.push({ type: 'divider' });
        continue;
      }
      // Hide modules the user cannot access at all. Super admins see everything.
      if (e.module && !isSuperAdmin && !canAccessModule(e.module)) continue;
      if (e.children?.length) {
        const visibleChildren = e.children.filter(
          (c) => !c.module || isSuperAdmin || canAccessModule(c.module),
        );
        if (visibleChildren.length === 0) continue;
        items.push({
          key: e.key,
          label: e.label,
          icon: e.icon,
          children: visibleChildren.map((c) => ({ key: c.key, label: c.label })),
        });
      } else {
        items.push({ key: e.key, label: e.label, icon: e.icon });
      }
    }
    return items;
  }, [canAccessModule, isSuperAdmin]);

  const handleMenuClick = ({ key }: { key: string }) => navigate(key);

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
        <Title level={4} style={{ margin: 0, color: isDarkMode ? '#fff' : '#1890ff', fontWeight: 'bold' }}>
          Mashaheer Admin
        </Title>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={location.pathname.startsWith('/discounts') ? ['discounts'] : []}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ background: 'transparent', border: 'none' }}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </Sider>
  );
};

export default Sidebar;
