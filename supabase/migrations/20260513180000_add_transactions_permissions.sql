-- Transactions module: permissions + default designation grants (RBAC catalog).

insert into public.permissions(key, module_name, action_name, description)
values
  ('transactions.view',   'transactions', 'view',   'View payments / transactions list'),
  ('transactions.create', 'transactions', 'create', 'Create transaction-related records'),
  ('transactions.edit',   'transactions', 'edit',   'Edit transaction-related records'),
  ('transactions.delete', 'transactions', 'delete', 'Delete transaction-related records')
on conflict (key) do nothing;

-- Manager: all transactions.* (same pattern as other non-staff modules)
insert into public.designation_permissions(designation_id, permission_id)
select d.id, p.id
from public.designations d
cross join public.permissions p
where d.name = 'Manager'
  and p.module_name = 'transactions'
on conflict (designation_id, permission_id) do nothing;

-- Support Staff: read-only access to Transactions tab
insert into public.designation_permissions(designation_id, permission_id)
select d.id, p.id
from public.designations d
join public.permissions p on p.key = 'transactions.view'
where d.name = 'Support Staff'
on conflict (designation_id, permission_id) do nothing;

-- Refund Team: view transactions (e.g. follow refund reference links from Payments)
insert into public.designation_permissions(designation_id, permission_id)
select d.id, p.id
from public.designations d
join public.permissions p on p.key = 'transactions.view'
where d.name = 'Refund Team'
on conflict (designation_id, permission_id) do nothing;
