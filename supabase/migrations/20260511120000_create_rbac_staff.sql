-- =====================================================================
-- Staff management + RBAC (designations, permissions, overrides)
-- Convention: permission "key" = "<module>.<action>".
-- Note: "designations" replaces the typical "roles" name to avoid clash
-- with auth/profile/raw_user_meta_data.role already used by the project.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. designations
-- ---------------------------------------------------------------------
create table if not exists public.designations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. permissions
--    key example: "users.view", "refunds.approve"
-- ---------------------------------------------------------------------
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module_name text not null,
  action_name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_permissions_module on public.permissions(module_name);

-- ---------------------------------------------------------------------
-- 3. designation_permissions (M:N)
-- ---------------------------------------------------------------------
create table if not exists public.designation_permissions (
  id uuid primary key default gen_random_uuid(),
  designation_id uuid not null references public.designations(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(designation_id, permission_id)
);

-- ---------------------------------------------------------------------
-- 4. staff_users (business profile mirror of auth.users for staff)
-- ---------------------------------------------------------------------
create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  designation_id uuid references public.designations(id) on delete set null,
  is_active boolean not null default true,
  force_password_reset boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_staff_users_designation on public.staff_users(designation_id);
create index if not exists idx_staff_users_active on public.staff_users(is_active);

create or replace function public.staff_users_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_staff_users_set_updated_at on public.staff_users;
create trigger tg_staff_users_set_updated_at
before update on public.staff_users
for each row execute function public.staff_users_set_updated_at();

-- ---------------------------------------------------------------------
-- 5. staff_permissions (per-user overrides; allowed=true grants extra,
--    allowed=false revokes a permission their designation otherwise gives)
-- ---------------------------------------------------------------------
create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(staff_user_id, permission_id)
);

-- =====================================================================
-- Helper SQL functions
-- =====================================================================

-- Super admin check — accepts either auth.users.is_super_admin OR
-- user_metadata.super_admin = true (or "true" string).
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((select is_super_admin from auth.users where id = uid), false)
      or coalesce(
           (select (raw_user_meta_data->>'super_admin')::boolean
              from auth.users where id = uid),
           false
         )
      or coalesce(
           lower(coalesce((select raw_user_meta_data->>'super_admin'
                             from auth.users where id = uid), '')) = 'true',
           false
         );
$$;

-- Has permission check used in policies and server logic.
create or replace function public.has_permission(uid uuid, perm_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_perm_id uuid;
  v_staff_id uuid;
  v_override boolean;
begin
  if public.is_super_admin(uid) then
    return true;
  end if;

  select id into v_perm_id from public.permissions where key = perm_key;
  if v_perm_id is null then
    return false;
  end if;

  select id into v_staff_id
    from public.staff_users
   where auth_user_id = uid and is_active = true;
  if v_staff_id is null then
    return false;
  end if;

  select allowed into v_override
    from public.staff_permissions
   where staff_user_id = v_staff_id and permission_id = v_perm_id
   limit 1;
  if v_override is not null then
    return v_override;
  end if;

  return exists(
    select 1
      from public.staff_users su
      join public.designation_permissions dp on dp.designation_id = su.designation_id
     where su.id = v_staff_id and dp.permission_id = v_perm_id
  );
end;
$$;

-- Returns permission keys for the calling user. Super admins get '*'.
create or replace function public.get_my_permissions()
returns table(key text)
language sql
stable
security definer
set search_path = public, auth
as $$
  with me as ( select auth.uid() as uid ),
  sa as ( select public.is_super_admin((select uid from me)) as ok ),
  staff as (
    select su.id
      from public.staff_users su, me
     where su.auth_user_id = me.uid and su.is_active = true
  ),
  granted_by_designation as (
    select p.key
      from public.staff_users su
      join public.designation_permissions dp on dp.designation_id = su.designation_id
      join public.permissions p on p.id = dp.permission_id, me
     where su.auth_user_id = me.uid and su.is_active = true
       and not exists (
         select 1 from public.staff_permissions sp
          where sp.staff_user_id = su.id
            and sp.permission_id = p.id
            and sp.allowed = false
       )
  ),
  override_grants as (
    select p.key
      from public.staff_permissions sp
      join public.permissions p on p.id = sp.permission_id
      join public.staff_users su on su.id = sp.staff_user_id, me
     where su.auth_user_id = me.uid and su.is_active = true and sp.allowed = true
  )
  select '*'::text as key from sa where ok
  union
  select key from granted_by_designation where not (select ok from sa)
  union
  select key from override_grants where not (select ok from sa);
$$;

grant execute on function public.get_my_permissions() to authenticated, anon;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- =====================================================================
-- RLS policies
-- =====================================================================
alter table public.designations enable row level security;
alter table public.permissions enable row level security;
alter table public.designation_permissions enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_permissions enable row level security;

-- READS: any authenticated user can read the RBAC catalog tables so the
-- admin app can render menus/forms. Super admin only for staff_users.
drop policy if exists "designations_select_auth" on public.designations;
create policy "designations_select_auth" on public.designations
  for select to authenticated using (true);

drop policy if exists "permissions_select_auth" on public.permissions;
create policy "permissions_select_auth" on public.permissions
  for select to authenticated using (true);

drop policy if exists "designation_permissions_select_auth" on public.designation_permissions;
create policy "designation_permissions_select_auth" on public.designation_permissions
  for select to authenticated using (true);

drop policy if exists "staff_users_select_self_or_super" on public.staff_users;
create policy "staff_users_select_self_or_super" on public.staff_users
  for select to authenticated
  using (public.is_super_admin(auth.uid()) or auth_user_id = auth.uid());

drop policy if exists "staff_permissions_select_self_or_super" on public.staff_permissions;
create policy "staff_permissions_select_self_or_super" on public.staff_permissions
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.staff_users su
       where su.id = staff_user_id and su.auth_user_id = auth.uid()
    )
  );

-- WRITES: super admin only on every table.
drop policy if exists "designations_write_super" on public.designations;
create policy "designations_write_super" on public.designations
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "permissions_write_super" on public.permissions;
create policy "permissions_write_super" on public.permissions
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "designation_permissions_write_super" on public.designation_permissions;
create policy "designation_permissions_write_super" on public.designation_permissions
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "staff_users_write_super" on public.staff_users;
create policy "staff_users_write_super" on public.staff_users
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "staff_permissions_write_super" on public.staff_permissions;
create policy "staff_permissions_write_super" on public.staff_permissions
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- =====================================================================
-- Seed: designations + permissions catalog
-- =====================================================================

insert into public.designations (name, description) values
  ('Manager',       'Broad access across most modules'),
  ('Support Staff', 'Read-mostly access; can edit help/legal pages'),
  ('Refund Team',   'Bookings + Refunds approval workflow')
on conflict (name) do nothing;

-- Bulk permission seeder.
do $$
declare
  modules text[] := array[
    'dashboard','users','influencers','categories','services','contracts',
    'reviews','bookings','cash_out','refunds','platforms','discounts',
    'legal_notices','privacy_policy','contact_support','help_support',
    'settings','staff'
  ];
  m text;
  base_actions text[] := array['view','create','edit','delete'];
  a text;
begin
  foreach m in array modules loop
    foreach a in array base_actions loop
      insert into public.permissions(key, module_name, action_name, description)
      values (m || '.' || a, m, a, initcap(a) || ' ' || replace(m,'_',' '))
      on conflict (key) do nothing;
    end loop;
  end loop;

  -- Special actions
  insert into public.permissions(key, module_name, action_name, description) values
    ('refunds.approve',  'refunds',  'approve',  'Approve refund requests'),
    ('refunds.reject',   'refunds',  'reject',   'Reject refund requests'),
    ('bookings.export',  'bookings', 'export',   'Export bookings to CSV'),
    ('cash_out.approve', 'cash_out', 'approve',  'Approve influencer cash out')
  on conflict (key) do nothing;
end$$;

-- Map permissions to default designations.
-- Manager = everything except staff.*
do $$
declare
  manager_id uuid;
  support_id uuid;
  refund_id  uuid;
begin
  select id into manager_id from public.designations where name = 'Manager';
  select id into support_id from public.designations where name = 'Support Staff';
  select id into refund_id  from public.designations where name = 'Refund Team';

  insert into public.designation_permissions(designation_id, permission_id)
  select manager_id, p.id from public.permissions p
   where p.module_name <> 'staff'
  on conflict do nothing;

  insert into public.designation_permissions(designation_id, permission_id)
  select support_id, p.id from public.permissions p
   where p.key in (
     'dashboard.view','users.view','influencers.view','categories.view',
     'services.view','reviews.view','bookings.view','contracts.view',
     'platforms.view','discounts.view',
     'legal_notices.view','legal_notices.edit',
     'privacy_policy.view','privacy_policy.edit',
     'contact_support.view','contact_support.edit',
     'help_support.view','help_support.edit',
     'settings.view'
   )
  on conflict do nothing;

  insert into public.designation_permissions(designation_id, permission_id)
  select refund_id, p.id from public.permissions p
   where p.key in (
     'dashboard.view','bookings.view','bookings.edit','bookings.export',
     'refunds.view','refunds.create','refunds.edit',
     'refunds.approve','refunds.reject',
     'users.view','services.view'
   )
  on conflict do nothing;
end$$;

comment on table public.staff_users is 'Mirror of auth.users for admin/staff users. Identity stays in auth.users; business data here.';
comment on table public.designations is 'Application "roles" — renamed to avoid colliding with role inside raw_user_meta_data.';
comment on table public.permissions is 'Permission catalog. Keys follow "<module>.<action>" convention.';
