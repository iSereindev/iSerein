-- Run once in Supabase SQL Editor, before deploying the reader-return patch.
-- Preserves all content, existing subscription ownership rules and RLS.
begin;

alter table public.articles add column if not exists moods text[];
comment on column public.articles.moods is
'Optional reading suggestions: calm,courage,connection,perspective,explore. NULL uses title/subtitle matching; an empty array excludes the article.';

alter table public.quote_reminder_subscriptions
  add column if not exists reminder_time time not null default '01:00',
  add column if not exists time_zone text not null default 'UTC',
  add column if not exists last_attempt_at timestamptz;

create table if not exists public.reminder_scheduler_health (
  id boolean primary key default true check(id),
  last_tick timestamptz
);
alter table public.reminder_scheduler_health enable row level security;
revoke all on public.reminder_scheduler_health from public, anon, authenticated;
grant all on public.reminder_scheduler_health to service_role;

create or replace function public.record_reminder_tick()
returns void language sql security definer set search_path='' as $$
  insert into public.reminder_scheduler_health(id,last_tick) values(true,pg_catalog.now())
  on conflict(id) do update set last_tick=excluded.last_tick;
$$;

create or replace function public.reminder_scheduler_status()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select last_tick>pg_catalog.now()-interval '15 minutes'
    from public.reminder_scheduler_health where id=true),false);
$$;

create or replace function public.save_scheduled_quote_subscription(
  p_browser_hash text, p_endpoint_hash text, p_endpoint text, p_p256dh text,
  p_auth text, p_vapid_public_key text, p_reminder_time text, p_time_zone text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_reminder_time is null or p_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or p_time_zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone)
    then raise exception 'Invalid reminder time zone or time' using errcode='22023'; end if;
  -- Existing function validates keys, proves endpoint ownership and serializes writes.
  perform public.save_quote_subscription(p_browser_hash,p_endpoint_hash,p_endpoint,p_p256dh,p_auth,p_vapid_public_key);
  update public.quote_reminder_subscriptions
    set reminder_time=p_reminder_time::time,time_zone=p_time_zone
    where browser_hash=p_browser_hash;
end; $$;

create or replace function public.claim_due_quote_deliveries(p_vapid_public_key text, p_limit integer default 12)
returns table(id bigint, endpoint text, p256dh text, auth text, claim_token uuid, local_day text)
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid limit'; end if;
  return query with candidates as (
    select s.id,(pg_catalog.now() at time zone s.time_zone)::date as day
    from public.quote_reminder_subscriptions s
    cross join lateral (
      select (((pg_catalog.now() at time zone s.time_zone)::date+s.reminder_time) at time zone s.time_zone) as due
    ) timing
    where s.enabled and s.vapid_public_key=p_vapid_public_key
      and pg_catalog.now()>=timing.due and pg_catalog.now()<timing.due+interval '30 minutes'
      and (s.last_attempt_date is null or s.last_attempt_date<(pg_catalog.now() at time zone s.time_zone)::date)
      and (s.last_attempt_at is null or s.last_attempt_at<pg_catalog.now()-interval '20 hours')
    order by s.id limit p_limit for update of s skip locked
  ) update public.quote_reminder_subscriptions s
    set last_attempt_date=c.day,last_attempt_at=pg_catalog.now(),claim_token=pg_catalog.gen_random_uuid()
    from candidates c where s.id=c.id
    returning s.id,s.endpoint,s.p256dh,s.auth,s.claim_token,c.day::text;
end; $$;

-- The existing once-daily trigger must also respect reader choices during rollout.
create or replace function public.claim_quote_deliveries(p_day date,p_vapid_public_key text,p_limit integer default 12)
returns table(id bigint,endpoint text,p256dh text,auth text,claim_token uuid)
language sql security definer set search_path='' as $$
  select q.id,q.endpoint,q.p256dh,q.auth,q.claim_token
  from public.claim_due_quote_deliveries(p_vapid_public_key,p_limit) q;
$$;

revoke all on function public.record_reminder_tick(),public.reminder_scheduler_status(),
 public.save_scheduled_quote_subscription(text,text,text,text,text,text,text,text),
 public.claim_due_quote_deliveries(text,integer) from public,anon,authenticated;
grant execute on function public.record_reminder_tick(),public.reminder_scheduler_status(),
 public.save_scheduled_quote_subscription(text,text,text,text,text,text,text,text),
 public.claim_due_quote_deliveries(text,integer) to service_role;
commit;
