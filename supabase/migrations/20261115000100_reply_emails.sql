begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(716842002);
-- Additive migration: never seed or replace articles, users, or discussions.
create table community_private.email_preferences (
 user_id uuid references community_private.members(user_id) on delete cascade,
 article_id bigint references public.articles(id) on delete cascade,
 enabled boolean not null default false,
 token uuid not null default gen_random_uuid() unique,
 primary key(user_id,article_id)
);
create table community_private.email_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references community_private.members(user_id) on delete cascade,
 article_id bigint references public.articles(id) on delete cascade,
 bucket timestamptz not null,
 comment_ids bigint[] not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','uncertain','cancelled')),
 due_at timestamptz not null default now()+interval '5 minutes',
 created_at timestamptz not null default now(),
 attempted_at timestamptz,
 attempts integer not null default 0,
 unique(user_id,article_id,bucket)
);
create index on community_private.email_deliveries(status,due_at);
alter table community_private.email_preferences enable row level security;
alter table community_private.email_deliveries enable row level security;
revoke all on community_private.email_preferences,community_private.email_deliveries from public,anon,authenticated;

create function public.community_email_preference(p_article bigint,p_enabled boolean default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare u uuid:=community_private.member(); begin
 if not community_private.published(p_article) then raise exception 'Reading not available.'; end if;
 if p_enabled is not null then
  perform community_private.rate_limit(u);
  insert into community_private.email_preferences(user_id,article_id,enabled) values(u,p_article,p_enabled)
  on conflict(user_id,article_id) do update set enabled=excluded.enabled;
  if not p_enabled then
   update community_private.email_deliveries set status='cancelled' where user_id=u and article_id=p_article and status in ('pending','sending');
  end if;
 end if;
 return coalesce((select enabled from community_private.email_preferences where user_id=u and article_id=p_article),false);
end $$;
create function public.community_email_disable_all() returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin
 if u is null then raise exception 'Sign in first.'; end if;
 update community_private.email_preferences set enabled=false where user_id=u;
 update community_private.email_deliveries set status='cancelled' where user_id=u and status in ('pending','sending');
end $$;
-- Token permits only opting out of this discussion; no sign-in or account access.
create function public.community_email_unsubscribe(p_token uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p community_private.email_preferences; begin
 select * into p from community_private.email_preferences where token=p_token for update;
 if not found then return; end if;
 update community_private.email_preferences set enabled=false where token=p_token;
 update community_private.email_deliveries set status='cancelled' where user_id=p.user_id and article_id=p.article_id and status in ('pending','sending');
end $$;

create function community_private.queue_reply_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Only actual replies; never edits, reactions, or new top-level comments.
 if new.parent_id is null then return new; end if;
 insert into community_private.email_deliveries(user_id,article_id,bucket,comment_ids)
 select p.user_id,new.article_id,date_trunc('hour',now()),array[new.id]
 from community_private.email_preferences p join community_private.members m on m.user_id=p.user_id
 where p.article_id=new.article_id and p.enabled and not m.blocked and p.user_id<>new.user_id
 on conflict(user_id,article_id,bucket) do update
 set comment_ids=community_private.email_deliveries.comment_ids || excluded.comment_ids
 where community_private.email_deliveries.status='pending';
 return new;
end $$;
create trigger queue_reply_email after insert on community_private.comments
for each row execute function community_private.queue_reply_email();

-- Only the server's service-role credential can claim delivery or obtain an email.
create function public.community_email_claim() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j community_private.email_deliveries; address text; title text; token uuid; latest bigint; n integer; begin
 -- Short transaction lock serializes claims and makes the daily cap concurrent-safe.
 perform pg_advisory_xact_lock(716842003);
 -- An interrupted send is NOT retried automatically: it may already have been accepted.
 update community_private.email_deliveries set status='uncertain'
 where status='sending' and attempted_at<now()-interval '10 minutes';
 delete from community_private.email_deliveries where created_at<now()-interval '30 days';
 update community_private.email_deliveries set status='cancelled'
 where status='pending' and (created_at<now()-interval '24 hours' or attempts>=3);
 for j in select * from community_private.email_deliveries where status='pending' and due_at<=now()
 order by due_at,id limit 100 for update skip locked loop
  select a.title,u.email,p.token into title,address,token
  from public.articles a join community_private.email_preferences p on p.article_id=a.id
  join community_private.members m on m.user_id=p.user_id join auth.users u on u.id=m.user_id
  where a.id=j.article_id and p.user_id=j.user_id and p.enabled and not m.blocked
  and u.email_confirmed_at is not null and u.email is not null and community_private.published(a.id)
  and not exists(select 1 from community_private.threads t where t.article_id=a.id and t.closed);
  select count(*),max(c.id) into n,latest from community_private.comments c
  join community_private.comments parent on parent.id=c.parent_id
  join community_private.members writer on writer.user_id=c.user_id
  where c.id=any(j.comment_ids) and not c.hidden and not c.deleted and not writer.blocked
  and not parent.hidden and not parent.deleted and c.user_id<>j.user_id;
  if address is null or n=0 then
   update community_private.email_deliveries set status='cancelled' where id=j.id;
  elsif (select count(*) from community_private.email_deliveries where user_id=j.user_id
      and status in ('sending','sent','uncertain') and attempted_at>now()-interval '24 hours')>=4
    or exists(select 1 from community_private.email_deliveries where user_id=j.user_id and article_id=j.article_id
      and status in ('sending','sent','uncertain') and attempted_at>now()-interval '1 hour') then
   update community_private.email_deliveries set due_at=now()+interval '1 hour' where id=j.id;
  else
   update community_private.email_deliveries set status='sending',attempted_at=now(),attempts=attempts+1 where id=j.id;
   return jsonb_build_object('id',j.id,'email',address,'article_id',j.article_id,'title',title,'token',token,'comment_id',latest,'count',n);
  end if;
 end loop;
 return null;
end $$;
create function public.community_email_finish(p_id uuid,p_result text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_result not in ('sent','failed','uncertain','retry') then raise exception 'Invalid result'; end if;
 update community_private.email_deliveries
 set status=case when p_result='retry' then 'pending' else p_result end,
 due_at=case when p_result='retry' then now()+interval '15 minutes' else due_at end
 where id=p_id and status='sending';
end $$;
-- Recheck opt-out and moderation just before the external request.
create function public.community_email_allowed(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from community_private.email_deliveries d
 join community_private.email_preferences p using(user_id,article_id)
 join community_private.members m using(user_id)
 where d.id=p_id and d.status='sending' and p.enabled and not m.blocked
 and community_private.published(d.article_id)
 and not exists(select 1 from community_private.threads t where t.article_id=d.article_id and t.closed)
 and exists(select 1 from community_private.comments c join community_private.comments parent on parent.id=c.parent_id
 join community_private.members writer on writer.user_id=c.user_id
 where c.id=any(d.comment_ids) and not c.hidden and not c.deleted and not parent.hidden and not parent.deleted and not writer.blocked));
$$;
revoke all on function public.community_email_preference(bigint,boolean),public.community_email_disable_all(),public.community_email_unsubscribe(uuid),public.community_email_claim(),public.community_email_finish(uuid,text),public.community_email_allowed(uuid),community_private.queue_reply_email() from public,anon,authenticated;
grant execute on function public.community_email_preference(bigint,boolean),public.community_email_disable_all() to authenticated;
grant execute on function public.community_email_unsubscribe(uuid),public.community_email_claim(),public.community_email_finish(uuid,text),public.community_email_allowed(uuid) to service_role;
notify pgrst,'reload schema';
commit;
