-- Run after quiet-reading-setup.sql. Publication calendar remains UTC.
begin;
alter table public.articles add column if not exists is_featured boolean not null default false;
comment on column public.articles.is_featured is 'Optional homepage lead. Among today’s featured readings the highest ID wins. All releases still join the daily notification.';

-- Enforce the embargo even if an existing permissive policy allows all articles.
alter table public.articles enable row level security;
drop policy if exists iserein_published_readings on public.articles;
create policy iserein_published_readings on public.articles for select to anon,authenticated
 using (published_date <= (now() at time zone 'UTC')::date);
drop policy if exists iserein_future_embargo on public.articles;
create policy iserein_future_embargo on public.articles as restrictive for select to anon,authenticated
 using (published_date <= (now() at time zone 'UTC')::date);
grant select on public.articles to anon,authenticated;

-- Only tomorrow’s titles and count are public before release. No caller-supplied date.
create or replace function public.tomorrow_reading_titles()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('total',(select count(*) from public.articles where published_date=(now() at time zone 'UTC')::date+1),
 'titles',coalesce((select jsonb_agg(t.title order by t.id) from
   (select id,title from public.articles where published_date=(now() at time zone 'UTC')::date+1 order by id limit 3) t),'[]'::jsonb));
$$;
revoke all on function public.tomorrow_reading_titles() from public;
grant execute on function public.tomorrow_reading_titles() to anon,authenticated,service_role;

create table if not exists public.article_release_events (
 article_id bigint primary key references public.articles(id) on delete cascade,
 available_at timestamptz not null
);
alter table public.article_release_events enable row level security;
revoke all on public.article_release_events from public,anon,authenticated;
grant all on public.article_release_events to service_role;
insert into public.article_release_events(article_id,available_at)
 select id,published_date::timestamp at time zone 'UTC' from public.articles where published_date is not null
 on conflict(article_id) do nothing;

create or replace function public.track_article_release()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.published_date is not distinct from old.published_date then return new; end if;
 if new.published_date is null then
   delete from public.article_release_events where article_id=new.id;
 else
   insert into public.article_release_events(article_id,available_at)
   values(new.id,greatest(now(),new.published_date::timestamp at time zone 'UTC'))
   on conflict(article_id) do update set available_at=excluded.available_at;
 end if;
 return new;
end; $$;
revoke all on function public.track_article_release() from public,anon,authenticated;
drop trigger if exists iserein_article_release on public.articles;
create trigger iserein_article_release after insert or update of published_date on public.articles
 for each row execute function public.track_article_release();

alter table public.quote_reminder_subscriptions
 add column if not exists digest_since timestamptz not null default ((now() at time zone 'UTC')::date::timestamp at time zone 'UTC');
update public.quote_reminder_subscriptions set reminder_kind='reading',reminder_time='09:00' where reminder_kind<>'reading' or reminder_time<>'09:00';

create table if not exists public.article_notification_batches (
 id uuid primary key,
 subscription_id bigint references public.quote_reminder_subscriptions(id) on delete cascade,
 article_ids bigint[] not null,
 status text not null default 'pending' check(status in ('pending','sent','expired','failed')),
 created_at timestamptz not null default now()
);
create index if not exists article_batches_subscription on public.article_notification_batches(subscription_id,status);
alter table public.article_notification_batches enable row level security;
revoke all on public.article_notification_batches from public,anon,authenticated;
grant all on public.article_notification_batches to service_role;

-- Anyone with the notification URL can see its published reading titles, never subscriber data.
create or replace function public.notification_readings(p_batch uuid)
returns table(id bigint,title text,topic text,published_date date)
language sql stable security definer set search_path='' as $$
 select a.id::bigint,a.title::text,a.topic::text,a.published_date::date
 from public.article_notification_batches b join public.articles a on a.id=any(b.article_ids)
 where b.id=p_batch and a.published_date<=(now() at time zone 'UTC')::date
 order by a.published_date desc,a.id desc;
$$;
revoke all on function public.notification_readings(uuid) from public;
grant execute on function public.notification_readings(uuid) to anon,authenticated,service_role;

create table if not exists public.reminder_read_history (
 subscription_id bigint not null references public.quote_reminder_subscriptions(id) on delete cascade,
 article_id bigint not null references public.articles(id) on delete cascade,
 primary key(subscription_id,article_id)
);
alter table public.reminder_read_history enable row level security;
revoke all on public.reminder_read_history from public,anon,authenticated;
grant all on public.reminder_read_history to service_role;
alter table public.article_notification_batches add column if not exists is_recommendation boolean not null default false;

create or replace function public.sync_reminder_reads(p_browser_hash text,p_ids bigint[])
returns void language plpgsql security definer set search_path='' as $$
declare sid bigint;
begin
 if p_browser_hash is null or p_browser_hash !~ '^[a-f0-9]{64}$'
   or p_ids is null or cardinality(p_ids)>250
   or exists(select 1 from unnest(p_ids) i where i is null or i<=0)
 then raise exception 'Invalid read history'; end if;
 -- Serializes against disable so a late sync cannot recreate history after opt-out.
 select s.id into sid from public.quote_reminder_subscriptions s
 where s.browser_hash=p_browser_hash and s.enabled for share;
 if sid is null then return; end if;
 insert into public.reminder_read_history(subscription_id,article_id)
 select sid,a.id from public.articles a where a.id=any(p_ids)
 and a.published_date<=(now() at time zone 'UTC')::date
 on conflict do nothing;
end; $$;

create or replace function public.disable_reading_reminder(
 p_browser_hash text,p_endpoint_hash text default null,p_p256dh text default null,p_auth text default null
) returns void language plpgsql security definer set search_path='' as $$
declare owned_ids bigint[];
begin
 select array_agg(s.id) into owned_ids from public.quote_reminder_subscriptions s
 where s.browser_hash=p_browser_hash or (s.endpoint_hash=p_endpoint_hash and s.p256dh=p_p256dh and s.auth=p_auth);
 perform public.disable_quote_subscription(p_browser_hash,p_endpoint_hash,p_p256dh,p_auth);
 delete from public.reminder_read_history h using public.quote_reminder_subscriptions s
 where h.subscription_id=s.id and s.id=any(owned_ids) and not s.enabled;
end; $$;

create or replace function public.limit_read_history_sync(p_browser_hash text,p_network_hash text)
returns void language plpgsql security definer set search_path='' as $$
declare bucket timestamptz:=date_trunc('hour',clock_timestamp()); n integer;
begin
 if p_browser_hash is null or p_browser_hash !~ '^[a-f0-9]{64}$' or p_network_hash is null or p_network_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'Invalid identity'; end if;
 delete from public.quote_reminder_limits where window_start<now()-interval '1 day';
 insert into public.quote_reminder_limits values('read-network',p_network_hash,bucket,1)
 on conflict(kind,client_hash,window_start) do update set attempts=public.quote_reminder_limits.attempts+1 returning attempts into n;
 if n>600 then raise exception 'Please wait' using errcode='PT429'; end if;
 insert into public.quote_reminder_limits values('read-sync',p_browser_hash,bucket,1)
 on conflict(kind,client_hash,window_start) do update set attempts=public.quote_reminder_limits.attempts+1 returning attempts into n;
 if n>120 then raise exception 'Please wait' using errcode='PT429'; end if;
end; $$;
revoke all on function public.sync_reminder_reads(text,bigint[]),public.disable_reading_reminder(text,text,text,text),
 public.limit_read_history_sync(text,text) from public,anon,authenticated;
grant execute on function public.sync_reminder_reads(text,bigint[]),public.disable_reading_reminder(text,text,text,text),
 public.limit_read_history_sync(text,text) to service_role;

create or replace function public.claim_reading_notifications(p_vapid_public_key text,p_limit integer default 12)
returns table(id bigint,endpoint text,p256dh text,auth text,claim_token uuid,local_day text,
 digest_id uuid,article_count integer,first_id bigint,first_title text,is_recommendation boolean)
language plpgsql security definer set search_path='' as $$
declare r record; token uuid;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid limit'; end if;
 for r in
   select s.id as sid,s.endpoint as ep,s.p256dh as pk,s.auth as ak,
     (now() at time zone s.time_zone)::date as day,
     coalesce(items.ids,array[fallback.aid]) as ids,
     coalesce(items.titles,array[fallback.atitle]) as titles,
     items.ids is null as recommendation
   from public.quote_reminder_subscriptions s
   cross join lateral (select (((now() at time zone s.time_zone)::date+time '09:00') at time zone s.time_zone) as due) timing
   cross join lateral (
     select array_agg(a.id::bigint order by a.published_date desc,a.id desc) as ids,
            array_agg(a.title::text order by a.published_date desc,a.id desc) as titles
     from public.article_release_events e join public.articles a on a.id=e.article_id
     where e.available_at>=s.digest_since and e.available_at<=timing.due
       and a.published_date<=(now() at time zone 'UTC')::date
       and not exists(select 1 from public.reminder_read_history h where h.subscription_id=s.id and h.article_id=a.id)
       and not exists(select 1 from public.article_notification_batches b
         where b.subscription_id=s.id and b.status='sent' and a.id=any(b.article_ids))
   ) items
   left join lateral (
     select a.id::bigint as aid,a.title::text as atitle
     from public.articles a join public.article_release_events e on e.article_id=a.id
     where items.ids is null and a.published_date<=(now() at time zone 'UTC')::date
       and e.available_at<=timing.due
       and not exists(select 1 from public.reminder_read_history h where h.subscription_id=s.id and h.article_id=a.id)
     -- Random among never-suggested pages first, then rotate least-recently sent unread pages.
     order by (select max(b.created_at) from public.article_notification_batches b
       where b.subscription_id=s.id and b.status='sent' and a.id=any(b.article_ids)) asc nulls first,
       random()
     limit 1
   ) fallback on true
   where s.enabled and s.vapid_public_key=p_vapid_public_key and (items.ids is not null or fallback.aid is not null)
     and now()>=timing.due and now()<timing.due+interval '30 minutes'
     and (s.last_attempt_date is null or s.last_attempt_date<(now() at time zone s.time_zone)::date)
     and (s.last_attempt_at is null or s.last_attempt_at<now()-interval '20 hours')
   order by s.id limit p_limit for update of s skip locked
 loop
   token:=gen_random_uuid();
   update public.quote_reminder_subscriptions s set last_attempt_date=r.day,last_attempt_at=now(),claim_token=token where s.id=r.sid;
   insert into public.article_notification_batches(id,subscription_id,article_ids,is_recommendation) values(token,r.sid,r.ids,r.recommendation);
   id:=r.sid; endpoint:=r.ep; p256dh:=r.pk; auth:=r.ak; claim_token:=token; local_day:=r.day::text;
   digest_id:=token; article_count:=cardinality(r.ids); first_id:=r.ids[1]; first_title:=r.titles[1]; is_recommendation:=r.recommendation;
   return next;
 end loop;
end; $$;

create or replace function public.finish_article_digests(p_results jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)>100 then raise exception 'Invalid results'; end if;
 for item in select * from jsonb_array_elements(p_results) loop
   if item->>'status' not in ('sent','expired','failed') then raise exception 'Invalid status'; end if;
   -- Ledger survives a simultaneous opt-out, which may clear the live claim.
   update public.article_notification_batches b set status=item->>'status'
     where b.id=(item->>'claim_token')::uuid and b.subscription_id=(item->>'id')::bigint and b.status='pending';
 end loop;
 perform public.finish_quote_deliveries(p_results);
end; $$;
revoke all on function public.claim_reading_notifications(text,integer),public.finish_article_digests(jsonb) from public,anon,authenticated;
grant execute on function public.claim_reading_notifications(text,integer),public.finish_article_digests(jsonb) to service_role;
commit;
