-- Schedules the daily-reminders edge function on the hosted project.
-- Run once after the notifications + reminder_keys migrations and after the
-- function is deployed. Safe to run again (it replaces the job).
--
-- 15:00 UTC = 5 PM Cairo in winter (6 PM in summer time): the evening
-- before each meeting.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select public.ensure_reminders_cron_secret();

select cron.unschedule('daily-reminders')
where exists (select 1 from cron.job where jobname = 'daily-reminders');

select cron.schedule(
  'daily-reminders',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://deoxqsutaevjazglxmeb.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- Create the push keys now, so phones can turn notifications on right away.
select net.http_post(
  url := 'https://deoxqsutaevjazglxmeb.supabase.co/functions/v1/daily-reminders',
  headers := jsonb_build_object(
    'content-type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
  ),
  body := '{"init": true}'::jsonb
);
