-- Keys for the daily-reminders job, kept in Supabase Vault (encrypted):
--   reminders_cron_secret  shared by pg_cron and the edge function
--   vapid_public_key / vapid_private_key  sign Web Push messages; the function
--     creates them on its first run, so no secret ever has to be copied by hand.

-- Everything the edge function needs (service role only).
create function public.reminder_settings()
returns table (cron_secret text, vapid_public text, vapid_private text)
language sql stable security definer set search_path = ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key');
$$;

-- Stores the push key pair once; later calls keep the first pair (a new pair
-- would silently break every device already subscribed). Returns the stored
-- public key.
create function public.save_vapid_keys(p_public text, p_private text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from vault.secrets where name = 'vapid_public_key') then
    perform vault.create_secret(p_private, 'vapid_private_key', 'Web Push private key (daily-reminders)');
    perform vault.create_secret(p_public, 'vapid_public_key', 'Web Push public key (daily-reminders)');
  end if;
  return (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key');
end;
$$;

-- Creates the cron secret if missing (run by the cron setup script).
create function public.ensure_reminders_cron_secret()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from vault.secrets where name = 'reminders_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'reminders_cron_secret',
      'Sent by pg_cron to the daily-reminders edge function');
  end if;
end;
$$;

-- The public key browsers subscribe with (not a secret).
create function public.vapid_public_key()
returns text
language sql stable security definer set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key';
$$;

revoke execute on function
  public.reminder_settings(),
  public.save_vapid_keys(text, text),
  public.ensure_reminders_cron_secret(),
  public.vapid_public_key()
from anon, public, authenticated;
grant execute on function public.reminder_settings(), public.save_vapid_keys(text, text) to service_role;
grant execute on function public.vapid_public_key() to authenticated;
