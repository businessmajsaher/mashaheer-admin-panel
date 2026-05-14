import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined,
  UserAddOutlined,
} from '@ant-design/icons';

import { PermissionGuard } from '@/components/PermissionGuard';
import { ProtectedButton } from '@/components/ProtectedButton';
import { usePermissions } from '@/context/PermissionContext';
import type {
  Designation,
  Permission,
  StaffPermissionOverride,
  StaffUserListItem,
} from '@/types/rbac';
import {
  createDesignation,
  deleteDesignation,
  getDesignationPermissionIds,
  listDesignations,
  listPermissions,
  setDesignationPermissions,
} from '@/services/permissionService';
import {
  createStaffUser,
  listStaffOverrides,
  listStaffUsers,
  replaceStaffOverrides,
  resetStaffPassword,
  setStaffActive,
  updateStaffUser,
} from '@/services/staffService';

const { Title } = Typography;

const PRETTY_MODULE: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  influencers: 'Influencers',
  categories: 'Categories',
  services: 'Services',
  contracts: 'Contracts',
  reviews: 'Reviews',
  bookings: 'Bookings',
  cash_out: 'Cash Out',
  refunds: 'Refunds',
  platforms: 'Platforms',
  discounts: 'Discounts',
  legal_notices: 'Legal Notices',
  privacy_policy: 'Privacy Policy',
  contact_support: 'Contact Support',
  help_support: 'Help & Support',
  settings: 'Settings',
  staff: 'Staff',
};

interface PermissionRow {
  permission: Permission;
  fromDesignation: boolean;
  override: 'allow' | 'deny' | null;
}

export default function Staff() {
  const { isSuperAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffUserListItem[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<StaffUserListItem | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const [permsTarget, setPermsTarget] = useState<StaffUserListItem | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [designationPerms, setDesignationPerms] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<StaffPermissionOverride[]>([]);
  const [effective, setEffective] = useState<Set<string>>(new Set());

  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [newRoleForm] = Form.useForm();
  const [roleCreateLoading, setRoleCreateLoading] = useState(false);
  const [rolePermDesig, setRolePermDesig] = useState<Designation | null>(null);
  const [rolePermLoading, setRolePermLoading] = useState(false);
  const [rolePermSaving, setRolePermSaving] = useState(false);
  const [rolePermEffective, setRolePermEffective] = useState<Set<string>>(new Set());

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, d, p] = await Promise.all([
        listStaffUsers(),
        listDesignations(),
        listPermissions(),
      ]);
      setStaff(s);
      setDesignations(d);
      setPermissions(p);
    } catch (e: any) {
      message.error(e.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.designation?.name?.toLowerCase().includes(q)
    );
  }, [staff, search]);

  // ---------------- Create staff
  const handleCreate = async (values: any) => {
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await createStaffUser({
        email: values.email,
        full_name: values.full_name,
        designation_id: values.designation_id ?? null,
        login_url: `${window.location.origin}/login`,
        is_active: values.is_active !== false,
      });
      if (!res.email_sent) {
        message.warning(
          `Staff created, but credentials email failed: ${
            res.email_error || 'unknown error'
          }. You can use "Reset password" to try again.`
        );
      } else {
        message.success('Staff created. Credentials email sent.');
      }
      setAddOpen(false);
      addForm.resetFields();
      void loadAll();
    } catch (e: any) {
      setAddError(e.message || 'Failed to create staff');
    } finally {
      setAddLoading(false);
    }
  };

  // ---------------- Edit staff
  const openEdit = (row: StaffUserListItem) => {
    setEditTarget(row);
    editForm.setFieldsValue({
      email: row.email,
      full_name: row.full_name,
      designation_id: row.designation_id ?? null,
      is_active: row.is_active,
    });
  };

  const handleEdit = async (values: any) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await updateStaffUser(editTarget.id, {
        email: values.email,
        full_name: values.full_name,
        designation_id: values.designation_id ?? null,
        is_active: !!values.is_active,
      });
      message.success('Staff updated');
      setEditTarget(null);
      void loadAll();
    } catch (e: any) {
      message.error(e.message || 'Failed to update staff');
    } finally {
      setEditLoading(false);
    }
  };

  // ---------------- Activate / deactivate
  const handleToggleActive = async (row: StaffUserListItem) => {
    try {
      await setStaffActive(row.id, !row.is_active);
      message.success(row.is_active ? 'Staff deactivated' : 'Staff activated');
      void loadAll();
    } catch (e: any) {
      message.error(e.message || 'Failed to update status');
    }
  };

  // ---------------- Reset password
  const handleResetPassword = async (row: StaffUserListItem) => {
    try {
      const res = await resetStaffPassword(row.id, `${window.location.origin}/login`);
      if (res.email_sent) {
        message.success(`New password emailed to ${res.email}`);
      } else {
        message.warning(
          `Password was reset, but email failed: ${res.email_error || 'unknown'}`
        );
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to reset password');
    }
  };

  // ---------------- Permission matrix
  const openPerms = async (row: StaffUserListItem) => {
    setPermsTarget(row);
    setPermsLoading(true);
    try {
      const ovr = await listStaffOverrides(row.id);
      setOverrides(ovr);
      const baseIds = row.designation_id
        ? await getDesignationPermissionIds(row.designation_id)
        : [];
      setDesignationPerms(new Set(baseIds));

      const eff = new Set<string>(baseIds);
      for (const o of ovr) {
        if (o.allowed) eff.add(o.permission_id);
        else eff.delete(o.permission_id);
      }
      setEffective(eff);
    } catch (e: any) {
      message.error(e.message || 'Failed to load permissions');
    } finally {
      setPermsLoading(false);
    }
  };

  const toggleEffective = (permission: Permission, checked: boolean) => {
    setEffective((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permission.id);
      else next.delete(permission.id);
      return next;
    });
  };

  const openRolesModal = () => {
    setRolesModalOpen(true);
    newRoleForm.resetFields();
    void loadAll();
  };

  const handleCreateDesignation = async (values: { name: string; description?: string }) => {
    setRoleCreateLoading(true);
    try {
      await createDesignation(values.name, values.description);
      message.success('Role (designation) created');
      newRoleForm.resetFields();
      const d = await listDesignations();
      setDesignations(d);
    } catch (e: any) {
      message.error(e.message || 'Failed to create role');
    } finally {
      setRoleCreateLoading(false);
    }
  };

  const handleDeleteDesignation = async (id: string) => {
    try {
      await deleteDesignation(id);
      message.success('Role removed');
      const d = await listDesignations();
      setDesignations(d);
    } catch (e: any) {
      message.error(e.message || 'Cannot delete — it may still be assigned to staff');
    }
  };

  const openRoleDesignationPerms = async (d: Designation) => {
    setRolePermDesig(d);
    setRolePermLoading(true);
    try {
      const ids = await getDesignationPermissionIds(d.id);
      setRolePermEffective(new Set(ids));
    } catch (e: any) {
      message.error(e.message || 'Failed to load default permissions');
      setRolePermDesig(null);
    } finally {
      setRolePermLoading(false);
    }
  };

  const toggleRolePerm = (permissionId: string, checked: boolean) => {
    setRolePermEffective((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const saveRoleDesignationPerms = async () => {
    if (!rolePermDesig) return;
    setRolePermSaving(true);
    try {
      await setDesignationPermissions(rolePermDesig.id, Array.from(rolePermEffective));
      message.success('Default permissions saved for this role');
      setRolePermDesig(null);
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setRolePermSaving(false);
    }
  };

  const savePerms = async () => {
    if (!permsTarget) return;
    setPermsSaving(true);
    try {
      const allowGrants: string[] = [];
      const denyOverrides: string[] = [];
      for (const p of permissions) {
        const fromDesig = designationPerms.has(p.id);
        const want = effective.has(p.id);
        if (want && !fromDesig) allowGrants.push(p.id);
        else if (!want && fromDesig) denyOverrides.push(p.id);
      }
      await replaceStaffOverrides(permsTarget.id, allowGrants, denyOverrides);
      message.success('Permissions saved');
      setPermsTarget(null);
    } catch (e: any) {
      message.error(e.message || 'Failed to save permissions');
    } finally {
      setPermsSaving(false);
    }
  };

  // ---------------- Matrix rows grouped by module
  const matrixRows = useMemo<Record<string, PermissionRow[]>>(() => {
    const groups: Record<string, PermissionRow[]> = {};
    for (const p of permissions) {
      const overrideRow = overrides.find((o) => o.permission_id === p.id) ?? null;
      groups[p.module_name] ??= [];
      groups[p.module_name].push({
        permission: p,
        fromDesignation: designationPerms.has(p.id),
        override: overrideRow ? (overrideRow.allowed ? 'allow' : 'deny') : null,
      });
    }
    return groups;
  }, [permissions, overrides, designationPerms]);

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (row: StaffUserListItem) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.full_name}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{row.email}</div>
        </div>
      ),
    },
    {
      title: 'Designation',
      key: 'designation',
      render: (row: StaffUserListItem) =>
        row.designation?.name ? (
          <Tag color="blue">{row.designation.name}</Tag>
        ) : (
          <Tag>Unassigned</Tag>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row: StaffUserListItem) =>
        row.is_active ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (row: StaffUserListItem) => (
        <Space>
          <ProtectedButton
            permission="staff.edit"
            icon={<EditOutlined />}
            size="small"
            type="link"
            onClick={() => openEdit(row)}
          >
            Edit
          </ProtectedButton>
          <ProtectedButton
            permission="staff.edit"
            icon={<KeyOutlined />}
            size="small"
            type="link"
            onClick={() => openPerms(row)}
          >
            Permissions
          </ProtectedButton>
          <Popconfirm
            title="Reset password and email new credentials?"
            description="A new temporary password will be generated and emailed to the user."
            onConfirm={() => handleResetPassword(row)}
            okText="Yes"
            cancelText="No"
          >
            <ProtectedButton
              permission="staff.edit"
              icon={<ReloadOutlined />}
              size="small"
              type="link"
            >
              Reset password
            </ProtectedButton>
          </Popconfirm>
          <Popconfirm
            title={row.is_active ? 'Deactivate this staff user?' : 'Activate this staff user?'}
            onConfirm={() => handleToggleActive(row)}
            okText="Yes"
            cancelText="No"
          >
            <ProtectedButton
              permission="staff.edit"
              icon={row.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              size="small"
              type="link"
              danger={row.is_active}
            >
              {row.is_active ? 'Deactivate' : 'Activate'}
            </ProtectedButton>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ margin: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Staff Management</Title>
          <Space>
            <Input.Search
              placeholder="Search by name, email, designation"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 320 }}
            />
            {isSuperAdmin && (
              <Button icon={<SettingOutlined />} onClick={openRolesModal}>
                Manage roles
              </Button>
            )}
            <ProtectedButton
              permission="staff.create"
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                setAddOpen(true);
                addForm.resetFields();
              }}
            >
              Add staff
            </ProtectedButton>
          </Space>
        </div>

        {!isSuperAdmin && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="Only super administrators can create or modify staff."
          />
        )}

        <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} />
      </Card>

      {/* ---------- Add staff modal */}
      <Modal
        title="Add staff"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreate} initialValues={{ is_active: true }}>
          <Form.Item
            label="Full name"
            name="full_name"
            rules={[{ required: true, message: 'Enter full name' }]}
          >
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Enter email' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input placeholder="jane@example.com" />
          </Form.Item>
          <Form.Item label="Designation" name="designation_id">
            <Select
              allowClear
              placeholder="Select a designation (optional)"
              options={designations.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="A secure temporary password will be generated and emailed to the user."
          />
          {addError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={addError}
            />
          )}
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setAddOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={addLoading}>
              Create &amp; email credentials
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ---------- Edit staff modal */}
      <Modal
        title={editTarget ? `Edit staff — ${editTarget.full_name}` : 'Edit staff'}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter email' }, { type: 'email' }]}>
            <Input type="email" autoComplete="off" />
          </Form.Item>
          <Form.Item label="Full name" name="full_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Designation" name="designation_id">
            <Select
              allowClear
              options={designations.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setEditTarget(null)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>
              Save
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ---------- Staff roles (designations) — super admin */}
      <Modal
        title="Staff roles (designations)"
        open={rolesModalOpen}
        onCancel={() => setRolesModalOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Create job roles here, then assign them to staff and set default permissions for each role. Only super administrators can manage roles."
        />
        <Form form={newRoleForm} layout="vertical" onFinish={handleCreateDesignation}>
          <Form.Item label="Role name" name="name" rules={[{ required: true, message: 'Enter role name' }]}>
            <Input placeholder="e.g. Content Moderator" maxLength={120} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Optional" maxLength={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={roleCreateLoading}>
            Add role
          </Button>
        </Form>
        <Divider orientation="left">Existing roles</Divider>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {designations.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                {d.description ? (
                  <div style={{ color: '#888', fontSize: 12 }}>{d.description}</div>
                ) : null}
              </div>
              <Space>
                <Button type="link" size="small" onClick={() => openRoleDesignationPerms(d)}>
                  Default permissions
                </Button>
                <Popconfirm
                  title="Delete this role?"
                  description="Staff assigned to it will become unassigned for this role."
                  onConfirm={() => handleDeleteDesignation(d.id)}
                  okText="Delete"
                  okType="danger"
                >
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      </Modal>

      {/* ---------- Default permissions for a designation */}
      <Modal
        title={rolePermDesig ? `Default permissions — ${rolePermDesig.name}` : 'Permissions'}
        open={!!rolePermDesig}
        onCancel={() => setRolePermDesig(null)}
        width={760}
        footer={null}
        destroyOnHidden
      >
        {rolePermLoading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 8 }}>
            {Object.keys(
              permissions.reduce<Record<string, Permission[]>>((acc, p) => {
                acc[p.module_name] ??= [];
                acc[p.module_name].push(p);
                return acc;
              }, {})
            )
              .sort((a, b) => (PRETTY_MODULE[a] || a).localeCompare(PRETTY_MODULE[b] || b))
              .map((mod) => {
                const modPerms = permissions.filter((p) => p.module_name === mod);
                return (
                  <div key={mod} style={{ marginBottom: 18 }}>
                    <Divider orientation="left" style={{ margin: '8px 0' }}>
                      {PRETTY_MODULE[mod] || mod}
                    </Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {modPerms.map((p) => (
                        <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Checkbox
                            checked={rolePermEffective.has(p.id)}
                            onChange={(e) => toggleRolePerm(p.id, e.target.checked)}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{p.action_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button onClick={() => setRolePermDesig(null)} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" loading={rolePermSaving} onClick={saveRoleDesignationPerms}>
            Save defaults
          </Button>
        </div>
      </Modal>

      {/* ---------- Per-staff permission matrix */}
      <Modal
        title={
          permsTarget
            ? `Permissions — ${permsTarget.full_name}${
                permsTarget.designation?.name ? ' (' + permsTarget.designation.name + ')' : ''
              }`
            : 'Permissions'
        }
        open={!!permsTarget}
        width={760}
        onCancel={() => setPermsTarget(null)}
        footer={null}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Check or uncheck to grant or revoke permissions. The designation provides a baseline; differences are stored as per-user overrides."
        />
        {permsLoading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 8 }}>
            {Object.keys(matrixRows)
              .sort((a, b) => (PRETTY_MODULE[a] || a).localeCompare(PRETTY_MODULE[b] || b))
              .map((mod) => (
                <div key={mod} style={{ marginBottom: 18 }}>
                  <Divider orientation="left" style={{ margin: '8px 0' }}>
                    {PRETTY_MODULE[mod] || mod}
                  </Divider>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {matrixRows[mod].map((r) => {
                      const isChecked = effective.has(r.permission.id);
                      const label = (
                        <Space>
                          <span style={{ textTransform: 'capitalize' }}>{r.permission.action_name}</span>
                          {r.fromDesignation && (
                            <Tooltip title="Granted by designation">
                              <Tag color="blue">designation</Tag>
                            </Tooltip>
                          )}
                          {r.override === 'allow' && <Tag color="green">override grant</Tag>}
                          {r.override === 'deny' && <Tag color="red">override deny</Tag>}
                        </Space>
                      );
                      return (
                        <label key={r.permission.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Checkbox
                            checked={isChecked}
                            onChange={(e) => toggleEffective(r.permission, e.target.checked)}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button onClick={() => setPermsTarget(null)} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <PermissionGuard permission="staff.edit">
            <Button type="primary" loading={permsSaving} onClick={savePerms}>
              Save permissions
            </Button>
          </PermissionGuard>
        </div>
      </Modal>
    </>
  );
}
