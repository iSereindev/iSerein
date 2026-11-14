-- Run AFTER deploying the new code and running reader-return-setup.sql.
-- In Supabase Vault first create a secret named iserein_cron_secret whose value
-- exactly matches your existing Vercel CRON_SECRET. Never paste it into a chat.
-- Enable pg_cron, pg_net and Vault from the Supabase dashboard if needed.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='iserein_cron_secret')
    then raise exception 'Create iserein_cron_secret in Supabase Vault first'; end if;
end $$;

-- Only an authenticated request to the fixed iSEREIN delivery endpoint is sent.
-- Jobs with this name are updated on rerun, not duplicated.
select cron.schedule(
  'iserein-local-reminders',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := 'https://iserein.app/api/cron/daily-quote',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='iserein_cron_secret' limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
-- HTTP headers briefly enter pg_net's queue. Do not grant untrusted database
-- roles access to net.http_request_queue or vault.decrypted_secrets.
-- Stop ONLY this task when needed:
-- select cron.unschedule('iserein-local-reminders');
