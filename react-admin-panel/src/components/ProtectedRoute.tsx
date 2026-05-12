import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionContext';
import { Spin, Alert, Button } from 'antd';

interface Props {
  children: React.ReactNode;
  /** A specific permission required for this route. */
  requirePermission?: string;
  /** Any of these permissions grants access. */
  anyOf?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, requirePermission, anyOf }) => {
  const { user, loading, signOut } = useAuth();
  const { has, hasAny, loading: permsLoading, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (loading) console.warn('ProtectedRoute: still loading after 15s');
    }, 15000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading || permsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh', gap: '16px' }}>
        <Spin size="large" />
        <div>Loading authentication...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin panel = super admin OR active staff user.
  const hasAdminAccess = user.super_admin === true || user.is_staff === true;
  if (!hasAdminAccess) {
    return (
      <div style={{ maxWidth: 520, margin: '64px auto', padding: 24 }}>
        <Alert
          type="warning"
          message="Admin access required"
          description="This dashboard is restricted to super administrators and active staff users. Ask your owner to create a staff account for you in Mashaheer Admin."
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

  // Per-route permission gate. Super admins always pass via usePermissions().
  if (!isSuperAdmin) {
    if (requirePermission && !has(requirePermission)) {
      return <AccessDenied missing={requirePermission} />;
    }
    if (anyOf?.length && !hasAny(...anyOf)) {
      return <AccessDenied missing={anyOf.join(' or ')} />;
    }
  }

  return <>{children}</>;
};

const AccessDenied: React.FC<{ missing: string }> = ({ missing }) => (
  <div style={{ maxWidth: 520, margin: '64px auto', padding: 24 }}>
    <Alert
      type="error"
      message="Access denied"
      description={
        <span>
          You do not have permission to view this page. Required permission:{' '}
          <code>{missing}</code>. Contact your administrator to request access.
        </span>
      }
      showIcon
    />
  </div>
);
