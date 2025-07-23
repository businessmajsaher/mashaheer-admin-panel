import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spin } from 'antd';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  console.log('ProtectedRoute user:', user, 'loading:', loading);
  if (loading) return <Spin size="large" fullscreen tip="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}; 