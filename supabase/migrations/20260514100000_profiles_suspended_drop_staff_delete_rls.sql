-- Influencer suspend flag (admin panel); does not delete auth user.
alter table public.profiles
  add column if not exists account_suspended boolean not null default false;

comment on column public.profiles.account_suspended is
  'When true, influencer is suspended from platform activity (enforce in app/RLS as needed).';

create index if not exists idx_profiles_account_suspended
  on public.profiles (account_suspended)
  where account_suspended = true;

-- Remove parallel DELETE for active staff (admins/super admins keep their own delete policies).
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
    if exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      execute format('drop policy if exists "Active staff can delete" on public.%I', t);
    end if;
  end loop;
end$$;
