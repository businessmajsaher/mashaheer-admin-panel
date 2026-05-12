import React from 'react';
import { Button, ButtonProps, Tooltip } from 'antd';
import { usePermissions } from '@/context/PermissionContext';

interface Props extends ButtonProps {
  /** Permission required to invoke this action. */
  permission?: string;
  /** Any of these permissions grants access. */
  anyOf?: string[];
  /** Behavior when not allowed: hide (default) or disable. */
  unauthorized?: 'hide' | 'disable';
  /** Tooltip to show when the user is not allowed (disable mode only). */
  noAccessTooltip?: string;
}

/**
 * Drop-in replacement for AntD <Button> that becomes hidden (default)
 * or disabled when the current user lacks the required permission(s).
 *
 *   <ProtectedButton permission="services.create" type="primary">Add</ProtectedButton>
 *   <ProtectedButton permission="services.delete" unauthorized="disable">Delete</ProtectedButton>
 */
export const ProtectedButton: React.FC<Props> = ({
  permission,
  anyOf,
  unauthorized = 'hide',
  noAccessTooltip = 'You do not have permission to perform this action.',
  disabled,
  children,
  ...rest
}) => {
  const { has, hasAny, isSuperAdmin } = usePermissions();

  let allowed = isSuperAdmin;
  if (!allowed && permission) allowed = has(permission);
  if (!allowed && anyOf?.length) allowed = hasAny(...anyOf);
  if (!permission && !anyOf?.length) allowed = true;

  if (!allowed && unauthorized === 'hide') return null;

  const btn = (
    <Button {...rest} disabled={!allowed || disabled}>
      {children}
    </Button>
  );

  if (!allowed && unauthorized === 'disable') {
    return <Tooltip title={noAccessTooltip}>{btn}</Tooltip>;
  }
  return btn;
};
