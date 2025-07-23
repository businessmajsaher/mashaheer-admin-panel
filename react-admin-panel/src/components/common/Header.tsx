import React from 'react';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
      <h1 className="text-lg font-bold">Admin Panel</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {/* User menu placeholder */}
        <div className="w-8 h-8 rounded-full bg-muted" />
      </div>
    </header>
  );
}; 