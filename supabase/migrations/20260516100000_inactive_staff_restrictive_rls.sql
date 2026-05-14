-- Inactive staff must not SELECT/INSERT/UPDATE on admin-managed tables (even if another permissive policy would allow).
-- Active staff already use is_staff_active() on permissive policies; this closes gaps for deactivated accounts.

create or replace function public.auth_user_is_inactive_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.user_has_staff_role(uid)
    and exists (
      select 1 from public.staff_users su
       where su.auth_user_id = uid
         and su.is_active = false
    );
$$;

comment on function public.auth_user_is_inactive_staff(uuid) is
  'True when metadata role is staff and staff_users.is_active is false. Blocks read/write on admin tables.';

grant execute on function public.auth_user_is_inactive_staff(uuid) to authenticated;

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
    if not exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Inactive staff forbids select" on public.%I', t);
    execute format(
      'create policy "Inactive staff forbids select" on public.%I '
      'as restrictive for select to authenticated '
      'using (not public.auth_user_is_inactive_staff((select auth.uid())))',
      t
    );

    execute format('drop policy if exists "Inactive staff forbids insert" on public.%I', t);
    execute format(
      'create policy "Inactive staff forbids insert" on public.%I '
      'as restrictive for insert to authenticated '
      'with check (not public.auth_user_is_inactive_staff((select auth.uid())))',
      t
    );

    execute format('drop policy if exists "Inactive staff forbids update" on public.%I', t);
    execute format(
      'create policy "Inactive staff forbids update" on public.%I '
      'as restrictive for update to authenticated '
      'using (not public.auth_user_is_inactive_staff((select auth.uid()))) '
      'with check (not public.auth_user_is_inactive_staff((select auth.uid())))',
      t
    );
  end loop;
end$$;

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
     and (
       policyname like 'Active staff%'
       or policyname = 'Staff identity forbids delete'
       or policyname like 'Inactive staff forbids%'
     )
   order by tablename, cmd;

comment on view public.staff_rls_policy_audit is
  'Staff RLS audit: Active staff* (active-only select/insert/update), Inactive staff forbids select/insert/update, Staff identity forbids delete.';

grant select on public.staff_rls_policy_audit to authenticated;
