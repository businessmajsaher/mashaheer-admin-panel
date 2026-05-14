-- Block DELETE for any staff identity (active or inactive) on admin-managed tables.
-- Uses RESTRICTIVE policy so permissive "delete own row" etc. cannot grant deletes to staff.

create or replace function public.auth_user_is_staff_identity(uid uuid)
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
    );
$$;

comment on function public.auth_user_is_staff_identity(uuid) is
  'True when raw_user_meta_data.role = staff and any staff_users row exists (active or inactive). Forbids DELETE for staff.';

grant execute on function public.auth_user_is_staff_identity(uuid) to authenticated;

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
    execute format('drop policy if exists "Staff identity forbids delete" on public.%I', t);
    execute format(
      'create policy "Staff identity forbids delete" on public.%I '
      'as restrictive for delete to authenticated '
      'using (not public.auth_user_is_staff_identity((select auth.uid())))',
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
     )
   order by tablename, cmd;

comment on view public.staff_rls_policy_audit is
  'Staff-related RLS: Active staff* permissive policies + Staff identity forbids delete (restrictive).';

grant select on public.staff_rls_policy_audit to authenticated;
