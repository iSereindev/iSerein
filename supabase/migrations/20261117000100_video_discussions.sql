-- Add video discussions without changing articles, videos, users or saved items.
-- Internal discussion IDs: article ID for articles; negative video ID for videos.
-- Existing RPC parameter/column names remain compatible with the installed app.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(716842004);
do $$ begin
 if exists(select 1 from public.articles where id<=0) or exists(select 1 from public.videos where id<=0) then
  raise exception 'Expected positive catalogue IDs. No changes made.';
 end if;
end $$;
create table community_private.subjects (
 id bigint primary key,
 article_id bigint unique references public.articles(id) on delete cascade,
 video_id bigint unique references public.videos(id) on delete cascade,
 constraint subject_identity check (
  (article_id is not null and video_id is null and article_id>0 and id=article_id) or
  (article_id is null and video_id is not null and video_id>0 and id=-video_id)
 )
);
alter table community_private.subjects enable row level security;
revoke all on community_private.subjects from public,anon,authenticated;
insert into community_private.subjects(id,article_id) select id,id from public.articles;
insert into community_private.subjects(id,video_id) select -id,id from public.videos;
create function community_private.register_subject() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.id<=0 then raise exception 'Catalogue IDs must be positive.'; end if;
 if tg_table_name='articles' then
  insert into community_private.subjects(id,article_id) values(new.id,new.id);
 else
  insert into community_private.subjects(id,video_id) values(-new.id,new.id);
 end if;
 return new;
end $$;
revoke all on function community_private.register_subject() from public,anon,authenticated;
create trigger discussion_article_subject after insert on public.articles
 for each row execute function community_private.register_subject();
create trigger discussion_video_subject after insert on public.videos
 for each row execute function community_private.register_subject();
-- Redirect only the five known discussion foreign keys. No content is copied or seeded.
do $$ declare t text; fk record; begin
 foreach t in array array['threads','comments','follows','email_preferences','email_deliveries'] loop
  for fk in select c.conname from pg_constraint c
   join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
   where n.nspname='community_private' and r.relname=t and c.contype='f'
   and c.confrelid='public.articles'::regclass loop
   execute format('alter table community_private.%I drop constraint %I',t,fk.conname);
  end loop;
  execute format('alter table community_private.%I add constraint discussion_subject_fk foreign key(article_id) references community_private.subjects(id) on delete cascade',t);
 end loop;
end $$;
create view community_private.content as
 select s.id,a.title,a.topic,a.published_date,'article'::text as kind,true as active
 from community_private.subjects s join public.articles a on a.id=s.article_id
 union all
 select s.id,v.title,'Video'::text,v.published_date,'video'::text,v.active
 from community_private.subjects s join public.videos v on v.id=s.video_id;
revoke all on community_private.content from public,anon,authenticated;
create or replace function community_private.published(p_article bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from community_private.content where id=p_article and active and published_date <= (now() at time zone 'UTC')::date);
$$;

create or replace function public.community_directory(p_topic text default null,p_mine boolean default false,p_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.latest desc,t.id desc),'[]'::jsonb) from (
 select a.id,a.title,a.topic,a.kind,count(*) as count,max(c.created_at) as latest
 from community_private.content a join community_private.comments c on c.article_id=a.id and not c.hidden and not c.deleted
 where community_private.published(a.id) and (p_topic is null or a.topic=p_topic)
 and (not p_mine or exists(select 1 from community_private.comments mine where mine.article_id=a.id and mine.user_id=auth.uid() and not mine.hidden and not mine.deleted))
 group by a.id,a.title,a.topic,a.kind order by latest desc,a.id desc limit 10 offset least(greatest(p_offset,0),10000)
 ) t;
$$;

create or replace function public.community_inbox(p_mark boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb; begin
 if u is null then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.id desc),'[]'::jsonb) into result from (
 select n.id,c.article_id,c.id as comment_id,a.title,n.seen,n.created_at from community_private.notifications n
 join community_private.comments c on c.id=n.comment_id join community_private.content a on a.id=c.article_id
 where n.user_id=u and not c.hidden and not c.deleted and community_private.published(a.id)
 order by n.id desc limit 30
 ) t;
 if p_mark then update community_private.notifications set seen=true where user_id=u; end if;
 return result;
end $$;

create or replace function public.community_email_claim() returns jsonb
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
  from community_private.content a join community_private.email_preferences p on p.article_id=a.id
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

-- CREATE OR REPLACE preserves existing grants; explicitly reaffirm restricted access.
revoke all on function community_private.published(bigint),public.community_email_claim() from public,anon,authenticated;
grant execute on function public.community_email_claim() to service_role;
notify pgrst,'reload schema';
commit;
