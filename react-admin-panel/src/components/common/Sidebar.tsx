import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Users', to: '/users' },
  { label: 'Influencers', to: '/influencers' },
  { label: 'Services', to: '/services' },
  { label: 'Orders', to: '/orders' },
  { label: 'Wallets', to: '/wallets' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Bookings', to: '/bookings' },
  { label: 'Settings', to: '/settings' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  return (
    <aside className="w-64 bg-card border-r hidden md:block">
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              location.pathname.startsWith(item.to) && 'bg-accent text-accent-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}; 