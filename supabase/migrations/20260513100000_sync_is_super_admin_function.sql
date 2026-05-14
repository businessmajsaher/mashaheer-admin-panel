-- Re-applies public.is_super_admin() after edits to 20260511120000 (already applied remotely).
-- Requires auth.users.is_super_admin — add once in Dashboard → SQL if missing:
--   alter table auth.users add column if not exists is_super_admin boolean not null default false;

create or replace function public.is_super_admin(uid uuid)
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
       and (
         coalesce(u.is_super_admin, false) = true
         or (
           case
             when u.raw_user_meta_data is null
               or not (u.raw_user_meta_data ? 'is_super_admin')
             then false
             when jsonb_typeof(u.raw_user_meta_data->'is_super_admin') = 'boolean' then
               (u.raw_user_meta_data->'is_super_admin')::text::boolean
             when jsonb_typeof(u.raw_user_meta_data->'is_super_admin') = 'string' then
               lower(trim(u.raw_user_meta_data->>'is_super_admin')) in ('true')
             else false
           end
         )
       )
  );
$$;

comment on function public.is_super_admin(uuid) is
  'True when auth.users.is_super_admin or raw_user_meta_data.is_super_admin is truthy.';

grant execute on function public.is_super_admin(uuid) to authenticated;
