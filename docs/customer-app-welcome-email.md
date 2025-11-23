# Customer App Welcome Email Integration

## Goal
Send a branded welcome email automatically whenever a new customer account is created from the Flutter customer app. The Flutter app should remain lightweight—no email–sending logic or API keys in the client. All email work should run via Supabase triggers + edge functions so the flow works regardless of which client creates the account.

## Architecture Overview

1. **Flutter app** signs up the user with Supabase auth.
2. **Flutter app** (or a follow-up call) inserts the matching `profiles` row with `role = 'customer'`.
3. **Postgres trigger** on `auth.users` detects the new account, reads the profile, and invokes the edge function.
4. **Edge function `send-customer-welcome-email`** sends the actual email (via Resend or other provider).

> The influencer flow already reuses the edge function `send-welcome-email` from the admin panel. You’re duplicating that pattern for customers so Flutter never has to handle email directly.

## Files & Artifacts

| File | Purpose |
| --- | --- |
| `supabase/functions/send-customer-welcome-email/index.ts` | Edge function that sends the customer welcome email |
| `supabase/migrations/20241101000100_customer_welcome_trigger.sql` | Trigger that calls the edge function when a new auth user is created and the profile role is `customer` |
| `docs/customer-welcome-email-setup.md` | Detailed instructions for deploying secrets, running migrations, testing |

## Flutter App Changes

1. **Signup via Supabase auth**  
   ```dart
   final authResponse = await supabase.auth.signUp(
     email: email,
     password: password,
   );
   ```

2. **Immediately create the matching profile** (if not already handled server-side).
   ```dart
   await supabase.from('profiles').insert({
     'id': authResponse.user!.id,
     'email': email,
     'name': fullName,
     'role': 'customer',
     // other profile fields…
   });
   ```

3. **Optional UX**  
   After signup, show a snackbar/toast: “Welcome! Check your email for next steps.” This does not affect the backend flow; it just improves user feedback.

No other Flutter changes are required. Do **not** store email provider keys in the client.

## Supabase Setup Steps

1. **Deploy edge function** `send-customer-welcome-email` (already added).  
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_key
   supabase secrets set CUSTOMER_APP_URL=https://your-customer-app.example.com
   supabase functions deploy send-customer-welcome-email
   ```

2. **Configure database settings** that the trigger will use to call the edge function:  
   ```sql
   alter database postgres set app.edge_customer_welcome_url = 'https://<project-ref>.supabase.co/functions/v1/send-customer-welcome-email';
   alter database postgres set app.service_role_key = '<service-role-key>';
   ```

3. **Apply migration** `supabase/migrations/20241101000100_customer_welcome_trigger.sql`:  
   ```bash
   supabase db push
   ```

   The migration:
   ```sql
   drop trigger if exists on_auth_user_created on auth.users;
   drop function if exists send_customer_welcome();

   create or replace function send_customer_welcome()
   returns trigger as $$
   declare
     profile record;
     invoke_response record;
   begin
     select * into profile from public.profiles where id = new.id;

     if profile.role = 'customer' then
       select net.http_post(
         url := current_setting('app.edge_customer_welcome_url'),
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || current_setting('app.service_role_key')
         ),
         body := jsonb_build_object(
           'email', new.email,
           'name', coalesce(profile.name, '')
         )
       ) into invoke_response;
     end if;

     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute function send_customer_welcome();
   ```

4. **Verify**  
   - Create a test customer via Flutter → confirm email arrives.
   - Check edge function logs in Supabase dashboard (`Functions -> Logs`).
   - Ensure fallback path: if the profile row is missing or role ≠ customer, no email is sent.

## Reference: Influencer Flow
- Admin UI calls `sendWelcomeEmail` directly after creating an influencer.
- Email template lives in `supabase/functions/send-welcome-email/index.ts`.
- No trigger exists; the admin panel drives the email send.

## Maintenance Tips
- Store HTML templates alongside functions (e.g., `emails/customer-welcome.html`) to avoid inline duplication.
- If you later allow customers to sign up through admin tooling, the trigger still fires as long as the profile has `role = 'customer'`.
- Set up observability (e.g., log severity or error alerts) on the edge function to catch delivery failures.



