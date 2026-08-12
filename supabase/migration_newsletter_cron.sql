-- Schedules the daily-tip Edge Function to run every day at 9:00 UTC via pg_cron + pg_net.
-- Adjust the schedule string if 9am should mean a specific non-UTC timezone.
--
-- BEFORE running this:
--   1. Run migration_profile_preferences.sql first (adds newsletter_subscribed).
--   2. Deploy the function:  supabase functions deploy daily-tip
--   3. Set its secrets:      supabase secrets set GROQ_API_KEY=... RESEND_API_KEY=... RESEND_FROM_EMAIL=...
--      (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected — don't set those.)
--   4. Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below with your project's values.
--      Never commit the real service role key to source control — fill it in only in
--      the Supabase SQL Editor, not in this file.
-- Run once in Supabase SQL Editor.

-- Narrow, purpose-built read: only the emails of subscribed users, nothing else about
-- them. Bypasses RLS via SECURITY DEFINER intentionally and narrowly, same pattern as
-- get_display_names() in migration_community.sql. Only the Edge Function's service-role
-- client ever calls this.
create or replace function public.get_subscribed_emails()
returns table (email text)
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.newsletter_subscribed = true;
$$;

grant execute on function public.get_subscribed_emails() to service_role;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'daily-tip-9am-utc',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-tip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To stop/replace the schedule later:
-- select cron.unschedule('daily-tip-9am-utc');
