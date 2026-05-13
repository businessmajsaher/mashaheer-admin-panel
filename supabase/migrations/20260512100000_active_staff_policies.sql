-- =====================================================================
-- Active staff: parallel RLS (select / insert / update / delete via is_staff_active)
--
--   - public.is_super_admin(uid) is defined in 20260511120000_create_rbac_staff.sql
--     (column is_super_admin OR metadata is_super_admin). Do not redefine here.
--   - public.is_admin(): profiles.role admin OR raw_user_meta_data.role admin OR is_super_admin(uid).
--   - Staff lives in staff_users only; profiles.role stays admin | customer | influencer.
--     Staff checks use raw_user_meta_data.role = ''staff'' plus active staff_users.
--   - New parallel policies here only reference public.is_staff_active()
--     (including delete).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Staff identity in auth metadata only (profiles has no staff role)
-- ---------------------------------------------------------------------
create or replace function public.user_has_staff_role(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from auth.users u
     where u.id = uid
       and coalesce((u.raw_user_meta_data->>'role')::text, '') = 'staff'
  );
$$;

comment on function public.user_has_staff_role(uuid) is
  'True when raw_user_meta_data.role is staff. Staff records live in staff_users; profiles.role is admin | customer | influencer only.';

grant execute on function public.user_has_staff_role(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 1. public.is_admin() — profiles / metadata role admin / super-admin (see is_super_admin in RBAC migration)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and role = 'admin'
  ) or exists (
    select 1 from auth.users
     where id = (select auth.uid())
       and (raw_user_meta_data->>'role')::text = 'admin'
  ) or coalesce(public.is_super_admin((select auth.uid())), false);
$$;

comment on function public.is_admin() is
  'Admin: profiles.role admin, raw_user_meta_data.role admin (e.g. super admin), or is_super_admin(uid) column/metadata. Staff uses is_staff_active() policies.';


-- ---------------------------------------------------------------------
-- 2. New helper: is_staff_active()
--    SECURITY DEFINER so the function can read staff_users regardless
--    of RLS on that table.
-- ---------------------------------------------------------------------
create or replace function public.is_staff_active()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.staff_users su
     where su.auth_user_id = (select auth.uid())
       and su.is_active = true
       and public.user_has_staff_role(su.auth_user_id)
  );
$$;

comment on function public.is_staff_active() is
  'Active staff_users row plus raw_user_meta_data.role = staff. Profiles stay admin/customer/influencer.';

grant execute on function public.is_staff_active() to authenticated;

-- ---------------------------------------------------------------------
-- 2b. RBAC — staff permissions only when user_has_staff_role() holds
-- ---------------------------------------------------------------------
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

  if not public.user_has_staff_role(uid) then
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

create or replace function public.get_my_permissions()
returns table(key text)
language sql
stable
security definer
set search_path = public, auth
as $$
  with me as ( select auth.uid() as uid ),
  sa as ( select public.is_super_admin((select uid from me)) as ok ),
  granted_by_designation as (
    select p.key
      from public.staff_users su
      join public.designation_permissions dp on dp.designation_id = su.designation_id
      join public.permissions p on p.id = dp.permission_id, me
     where su.auth_user_id = me.uid and su.is_active = true
       and public.user_has_staff_role(me.uid)
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
     where su.auth_user_id = me.uid and su.is_active = true
       and public.user_has_staff_role(me.uid)
       and sp.allowed = true
  )
  select '*'::text as key from sa where ok
  union
  select key from granted_by_designation where not (select ok from sa)
  union
  select key from override_grants where not (select ok from sa);
$$;

grant execute on function public.get_my_permissions() to authenticated, anon;
grant execute on function public.has_permission(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. Coupon tables — align admin check with public.is_admin()
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'discount_coupons'
  ) then
    execute 'drop policy if exists "Admins can manage all coupons" on public.discount_coupons';
    execute $p$
      create policy "Admins can manage all coupons" on public.discount_coupons
        for all to authenticated
        using (public.is_admin())
        with check (public.is_admin())
    $p$;
  end if;

  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'coupon_usage_log'
  ) then
    execute 'drop policy if exists "Admins can view all usage" on public.coupon_usage_log';
    execute $p$
      create policy "Admins can view all usage" on public.coupon_usage_log
        for select to authenticated
        using (public.is_admin())
    $p$;
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 4. Parallel RLS per table — USING / WITH CHECK only public.is_staff_active()
--    (select, insert, update, delete).
--
--    Tables included (mirrors the comprehensive admin RLS migration):
--      services, bookings, payments, transactions, refunds, settlements,
--      contract_*,  ratings*, discount_*, coupon_*, reviews, profiles,
--      contact_support_info, support_tickets/responses/categories,
--      help_sections, faq_items, legal_notices,
--      service_categories / platforms / partners / types / mappings,
--      social_media_platforms / social_links / social_stats,
--      influencer_media, notifications, booking_*,
--      platform_settings, admin_actions, moderation_queue.
--
--    NOT included (intentionally super-admin only):
--      designations, permissions, designation_permissions,
--      staff_users, staff_permissions   — these are RBAC-management
--      tables and already restrict writes to super admin in
--      20260511120000_create_rbac_staff.sql.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  admin_tables text[] := array[
    'services',
    'bookings',
    'payments',
    'transactions',
    'refunds',
    'settlements',
    'contract_templates',
    'contract_instances',
    'contract_signatures',
    'contract_amendments',
    'discount_coupons',
    'coupon_usage_log',
    'coupon_categories',
    'reviews',
    'ratings',
    'detailed_ratings',
    'rating_categories',
    'influencer_ratings',
    'profiles',
    'service_categories',
    'service_category_mappings',
    'service_platforms',
    'service_partners',
    'service_types',
    'social_media_platforms',
    'social_links',
    'social_stats',
    'influencer_media',
    'contact_support_info',
    'support_tickets',
    'support_ticket_responses',
    'support_categories',
    'help_sections',
    'faq_items',
    'legal_notices',
    'booking_analytics',
    'booking_statuses',
    'platform_settings',
    'profile_views',
    'admin_actions',
    'moderation_queue',
    'notifications',
    'script_approvals',
    'admin_settings'
  ];
begin
  foreach t in array admin_tables loop
    -- Skip tables that don't exist on this database.
    if not exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      continue;
    end if;

    -- Make sure RLS is on; admins already enabled it but be defensive.
    execute format('alter table public.%I enable row level security', t);

    -- Drop any prior version we may have created so this is idempotent.
    execute format('drop policy if exists "Active staff can select" on public.%I', t);
    execute format('drop policy if exists "Active staff can insert" on public.%I', t);
    execute format('drop policy if exists "Active staff can update" on public.%I', t);
    execute format('drop policy if exists "Active staff can delete" on public.%I', t);
    execute format('drop policy if exists "Active staff forbidden delete" on public.%I', t);

    execute format(
      'create policy "Active staff can select" on public.%I '
      'for select to authenticated using (public.is_staff_active())',
      t
    );
    execute format(
      'create policy "Active staff can insert" on public.%I '
      'for insert to authenticated with check (public.is_staff_active())',
      t
    );
    execute format(
      'create policy "Active staff can update" on public.%I '
      'for update to authenticated '
      'using (public.is_staff_active()) with check (public.is_staff_active())',
      t
    );
    execute format(
      'create policy "Active staff can delete" on public.%I '
      'for delete to authenticated using (public.is_staff_active())',
      t
    );
  end loop;
end$$;


-- ---------------------------------------------------------------------
-- 5. Sanity: handy view to audit which staff policies exist.
--    Drop & recreate so it always reflects current state.
-- ---------------------------------------------------------------------
drop view if exists public.staff_rls_policy_audit;
create or replace view public.staff_rls_policy_audit as
  select
    schemaname,
    tablename,
    policyname,
    cmd as command,
    permissive
    from pg_policies
   where schemaname = 'public'
     and policyname like 'Active staff%'
   order by tablename, cmd;

comment on view public.staff_rls_policy_audit is
  'Lists RLS policies named Active staff* (parallel select/insert/update/delete via is_staff_active).';

grant select on public.staff_rls_policy_audit to authenticated;
