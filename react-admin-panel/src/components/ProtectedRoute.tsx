import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spin, Alert, Button } from 'antd';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  
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

  if (user.super_admin !== true) {
    return (
      <div style={{ maxWidth: 520, margin: '64px auto', padding: 24 }}>
        <Alert
          type="warning"
          message="Super administrator required"
          description="Only accounts with super administrator access can use this dashboard. Ask your owner to set super_admin to true on your user in Supabase Auth (User Metadata)."
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button
          type="primary"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Back to login
        </Button>
      </div>
    );
  }

  console.log('🔒 ProtectedRoute: User authenticated, showing content');
  return <>{children}</>;
};
