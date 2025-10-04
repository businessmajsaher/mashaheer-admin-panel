import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/MockAuthContext';
import { Spin, Alert } from 'antd';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log('🔒 ProtectedRoute: loading=', loading, 'user=', user);
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ ProtectedRoute: Loading timeout - forcing redirect to login');
      }
    }, 15000); // 15 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [loading]);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div>Loading authentication...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Debug: loading={loading.toString()}, user={user ? 'present' : 'null'}
        </div>
        <Alert
          message="If this takes too long, please refresh the page"
          type="info"
          showIcon
          style={{ maxWidth: '400px' }}
        />
        <button 
          onClick={() => window.location.reload()} 
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Force Refresh
        </button>
      </div>
    );
  }
  
  if (!user) {
    console.log('🔒 ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('🔒 ProtectedRoute: User authenticated, showing content');
  return <>{children}</>;
}; 