-- Run after reader-return-setup.sql and before deploying quiet-reading.
-- Existing subscriptions remain quotes. No content or subscriptions are deleted.
begin;
alter table public.quote_reminder_subscriptions
  add column if not exists reminder_kind text not null default 'quote'
  check (reminder_kind in ('reading','quote'));
alter table public.quote_reminder_subscriptions alter column reminder_time set default '09:00';
update public.quote_reminder_subscriptions set reminder_time='09:00' where reminder_time<>'09:00';

create or replace function public.save_daily_reminder(
  p_browser_hash text,p_endpoint_hash text,p_endpoint text,p_p256dh text,
  p_auth text,p_vapid_public_key text,p_time_zone text,p_reminder_kind text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_reminder_kind is null or p_reminder_kind not in ('reading','quote')
    then raise exception 'Invalid reminder kind' using errcode='22023'; end if;
  perform public.save_scheduled_quote_subscription(p_browser_hash,p_endpoint_hash,p_endpoint,
    p_p256dh,p_auth,p_vapid_public_key,'09:00',p_time_zone);
  update public.quote_reminder_subscriptions set reminder_kind=p_reminder_kind where browser_hash=p_browser_hash;
end; $$;

create or replace function public.claim_daily_reminders(p_vapid_public_key text, p_quote_available boolean, p_reading_available boolean, p_limit integer default 12)
returns table(id bigint, endpoint text, p256dh text, auth text, claim_token uuid, local_day text, reminder_kind text)
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid limit'; end if;
  return query with candidates as (
    select s.id,(pg_catalog.now() at time zone s.time_zone)::date as day
    from public.quote_reminder_subscriptions s
    cross join lateral (
      select (((pg_catalog.now() at time zone s.time_zone)::date+s.reminder_time) at time zone s.time_zone) as due
    ) timing
    where ((s.reminder_kind='quote' and p_quote_available) or (s.reminder_kind='reading' and p_reading_available))
      and s.enabled and s.vapid_public_key=p_vapid_public_key
      and pg_catalog.now()>=timing.due and pg_catalog.now()<timing.due+interval '30 minutes'
      and (s.last_attempt_date is null or s.last_attempt_date<(pg_catalog.now() at time zone s.time_zone)::date)
      and (s.last_attempt_at is null or s.last_attempt_at<pg_catalog.now()-interval '20 hours')
    order by s.id limit p_limit for update of s skip locked
  ) update public.quote_reminder_subscriptions s
    set last_attempt_date=c.day,last_attempt_at=pg_catalog.now(),claim_token=pg_catalog.gen_random_uuid()
    from candidates c where s.id=c.id
    returning s.id,s.endpoint,s.p256dh,s.auth,s.claim_token,c.day::text,s.reminder_kind;
end; $$;


revoke all on function public.save_daily_reminder(text,text,text,text,text,text,text,text),
 public.claim_daily_reminders(text,boolean,boolean,integer) from public,anon,authenticated;
grant execute on function public.save_daily_reminder(text,text,text,text,text,text,text,text),
 public.claim_daily_reminders(text,boolean,boolean,integer) to service_role;
commit;
