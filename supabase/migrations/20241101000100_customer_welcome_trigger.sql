-- Customer Welcome Email Trigger
-- Run: supabase db push

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists send_customer_welcome();

create or replace function send_customer_welcome()
returns trigger as $$
declare
  profile record;
  invoke_response record;
begin
  -- Fetch profile row for the new auth user
  select * into profile from public.profiles where id = new.id;

  -- Only process customer accounts
  if profile.role = 'customer' then
    -- Invoke the edge function using Supabase service role key
    select
      net.http_post(
        url := current_setting('app.edge_customer_welcome_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'email', new.email,
          'name', coalesce(profile.name, '')
        )
      )
    into invoke_response;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function send_customer_welcome();


