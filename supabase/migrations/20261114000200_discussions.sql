-- Public functions expose only the fields needed by the UI. Tables are private.
create schema community_private;
revoke all on schema community_private from public, anon, authenticated;
create table community_private.members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 40),
 moderator boolean not null default false,
 blocked boolean not null default false
);
create table community_private.threads (
 article_id bigint primary key references public.articles(id) on delete cascade,
 closed boolean not null default false
);
create table community_private.comments (
 id bigint generated always as identity primary key,
 article_id bigint not null references public.articles(id) on delete cascade,
 user_id uuid references community_private.members(user_id) on delete set null,
 parent_id bigint references community_private.comments(id),
 body text not null check(char_length(body) <= 2000),
 hidden boolean not null default false,
 deleted boolean not null default false,
 created_at timestamptz not null default now(),
 edited_at timestamptz
);
create index on community_private.comments(article_id,id);
create index on community_private.comments(user_id,created_at);
create table community_private.reactions (
 comment_id bigint references community_private.comments(id) on delete cascade,
 user_id uuid references community_private.members(user_id) on delete cascade,
 emoji text not null check(emoji in ('❤️','💡','🤔')),
 primary key(comment_id,user_id)
);
create table community_private.reports (
 id bigint generated always as identity primary key,
 comment_id bigint references community_private.comments(id) on delete cascade,
 user_id uuid references community_private.members(user_id) on delete cascade,
 reason text not null check(char_length(reason) between 3 and 500),
 resolved boolean not null default false,
 created_at timestamptz not null default now(),
 unique(comment_id,user_id)
);
create table community_private.follows (
 article_id bigint references public.articles(id) on delete cascade,
 user_id uuid references community_private.members(user_id) on delete cascade,
 primary key(article_id,user_id)
);
create table community_private.notifications (
 id bigint generated always as identity primary key,
 user_id uuid references community_private.members(user_id) on delete cascade,
 comment_id bigint references community_private.comments(id) on delete cascade,
 seen boolean not null default false,
 created_at timestamptz not null default now()
);
create index on community_private.notifications(user_id,id desc);
create table community_private.limits (
 user_id uuid references community_private.members(user_id) on delete cascade,
 bucket timestamptz not null,
 hits integer not null,
 primary key(user_id,bucket)
);
-- Defence in depth even if a future grant is accidentally added.
do $$ declare r record; begin
 for r in select tablename from pg_tables where schemaname='community_private' loop
 execute format('alter table community_private.%I enable row level security',r.tablename);
 end loop;
end $$;

create function community_private.published(p_article bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.articles where id=p_article and published_date <= (now() at time zone 'UTC')::date);
$$;
create function community_private.member() returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid(); begin
 if u is null then raise exception 'Sign in to join the conversation.'; end if;
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirm your email first.'; end if;
 if not exists(select 1 from community_private.members where user_id=u) then raise exception 'Choose a display name in Profile first.'; end if;
 if exists(select 1 from community_private.members where user_id=u and blocked) then raise exception 'Posting is unavailable for this account.'; end if;
 return u;
end $$;
create function community_private.rate_limit(u uuid) returns void
language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into community_private.limits values(u,date_trunc('hour',now()),1)
 on conflict(user_id,bucket) do update set hits=community_private.limits.hits+1 returning hits into n;
 if n>60 then raise exception 'Please take a break and try again later.'; end if;
end $$;
create function public.community_profile(p_name text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb; begin
 if u is null then return null; end if;
 if p_name is not null then
   if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirm your email first.'; end if;
   if char_length(trim(p_name)) not between 2 and 40 or p_name ~ '[[:cntrl:]]' then raise exception 'Use a display name of 2–40 characters.'; end if;
   insert into community_private.members(user_id,display_name) values(u,trim(p_name))
   on conflict(user_id) do update set display_name=excluded.display_name;
 end if;
 select jsonb_build_object('id',user_id,'name',display_name,'moderator',moderator,'blocked',blocked)
 into result from community_private.members where user_id=u;
 return result;
end $$;

create function public.community_thread(p_article bigint, p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if not community_private.published(p_article) then raise exception 'Reading not available.'; end if;
 select jsonb_build_object(
 'count',(select count(*) from community_private.comments where article_id=p_article and not hidden and not deleted),
 'closed',coalesce((select closed from community_private.threads where article_id=p_article),false),
 'following',exists(select 1 from community_private.follows where article_id=p_article and user_id=auth.uid()),
 'comments',coalesce(jsonb_agg(to_jsonb(c) order by c.id desc),'[]'::jsonb))
 into result from (
 select c.id,c.body,c.parent_id,c.created_at,c.edited_at,
 c.user_id=auth.uid() as mine,coalesce(m.display_name,'Former reader') as name,
 coalesce(m.moderator,false) as author,
 case when p.hidden or p.deleted then 'Comment removed' else left(p.body,140) end as parent_body,
 (select jsonb_object_agg(e.emoji,e.n) from (select emoji,count(*) as n from community_private.reactions where comment_id=c.id group by emoji) e) as reactions,
 (select emoji from community_private.reactions where comment_id=c.id and user_id=auth.uid()) as my_reaction
 from community_private.comments c left join community_private.members m on m.user_id=c.user_id
 left join community_private.comments p on p.id=c.parent_id
 where c.article_id=p_article and not c.hidden and not c.deleted and (p_before is null or c.id<p_before)
 order by c.id desc limit 20
 ) c;
 return result;
end $$;

create function public.community_comment(p_article bigint,p_body text,p_parent bigint default null,p_edit bigint default null) returns bigint
language plpgsql security definer set search_path='' as $$
declare u uuid:=community_private.member(); result bigint; root bigint; begin
 perform community_private.rate_limit(u);
 if not community_private.published(p_article) then raise exception 'Reading not available.'; end if;
 -- Serialize with moderator closing this thread.
 insert into community_private.threads(article_id) values(p_article) on conflict do nothing;
 perform 1 from community_private.threads where article_id=p_article for update;
 if exists(select 1 from community_private.threads where article_id=p_article and closed) then raise exception 'This conversation is closed.'; end if;
 if p_body is null or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Write 1–2,000 characters.'; end if;
 if p_body ~* '(https?://|www\.)' then raise exception 'Please share your thought without web links for now.'; end if;
 if p_edit is not null then
 update community_private.comments set body=trim(p_body),edited_at=now()
 where id=p_edit and article_id=p_article and user_id=u and not hidden and not deleted returning id into result;
 if result is null then raise exception 'You can edit only your own visible comments.'; end if;
 return result;
 end if;
 if (select count(*) from community_private.comments where user_id=u and created_at>now()-interval '10 minutes')>=10 then raise exception 'Please wait a little before posting again.'; end if;
 if p_parent is not null then
 select coalesce(parent_id,id) into root from community_private.comments where id=p_parent and article_id=p_article and not hidden and not deleted;
 if root is null then raise exception 'That comment is no longer available.'; end if;
 end if;
 insert into community_private.comments(article_id,user_id,parent_id,body) values(p_article,u,root,trim(p_body)) returning id into result;
 insert into community_private.notifications(user_id,comment_id)
 select f.user_id,result from community_private.follows f join community_private.members m on m.user_id=f.user_id
 where f.article_id=p_article and f.user_id<>u and not m.blocked;
 return result;
end $$;

create function public.community_action(p_action text,p_id bigint,p_value text default null) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=community_private.member(); aid bigint; begin
 perform community_private.rate_limit(u);
 if p_action in ('follow','unfollow') then
 if not community_private.published(p_id) then raise exception 'Reading not available.'; end if;
 if p_action='follow' then insert into community_private.follows values(p_id,u) on conflict do nothing;
 else delete from community_private.follows where article_id=p_id and user_id=u;
 delete from community_private.notifications n using community_private.comments c where n.comment_id=c.id and c.article_id=p_id and n.user_id=u; end if;
 return;
 end if;
 select article_id into aid from community_private.comments where id=p_id;
 if aid is null or not community_private.published(aid) then raise exception 'Comment not available.'; end if;
 if p_action='delete' then
 update community_private.comments set body='',deleted=true where id=p_id and user_id=u;
 if not found then raise exception 'You can delete only your own comments.'; end if;
 delete from community_private.reactions where comment_id=p_id;
 return;
 end if;
 if not exists(select 1 from community_private.comments where id=p_id and not hidden and not deleted) then raise exception 'Comment not available.'; end if;
 if p_action='react' then
 if p_value is null then delete from community_private.reactions where comment_id=p_id and user_id=u;
 elsif p_value in ('❤️','💡','🤔') then
 insert into community_private.reactions values(p_id,u,p_value) on conflict(comment_id,user_id) do update set emoji=excluded.emoji;
 else raise exception 'Choose an available reaction.'; end if;
 elsif p_action='report' then
 if char_length(trim(p_value)) not between 3 and 500 or p_value is null then raise exception 'Please explain the report in 3–500 characters.'; end if;
 insert into community_private.reports(comment_id,user_id,reason) values(p_id,u,trim(p_value)) on conflict(comment_id,user_id) do update set reason=excluded.reason,resolved=false;
 else raise exception 'Unknown action.'; end if;
end $$;

create function public.community_directory(p_topic text default null,p_mine boolean default false,p_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.latest desc,t.id desc),'[]'::jsonb) from (
 select a.id,a.title,a.topic,count(*) as count,max(c.created_at) as latest
 from public.articles a join community_private.comments c on c.article_id=a.id and not c.hidden and not c.deleted
 where community_private.published(a.id) and (p_topic is null or a.topic=p_topic)
 and (not p_mine or exists(select 1 from community_private.comments mine where mine.article_id=a.id and mine.user_id=auth.uid() and not mine.hidden and not mine.deleted))
 group by a.id order by latest desc,a.id desc limit 10 offset least(greatest(p_offset,0),10000)
 ) t;
$$;

create function public.community_inbox(p_mark boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb; begin
 if u is null then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.id desc),'[]'::jsonb) into result from (
 select n.id,c.article_id,c.id as comment_id,a.title,n.seen,n.created_at from community_private.notifications n
 join community_private.comments c on c.id=n.comment_id join public.articles a on a.id=c.article_id
 where n.user_id=u and not c.hidden and not c.deleted and community_private.published(a.id)
 order by n.id desc limit 30
 ) t;
 if p_mark then update community_private.notifications set seen=true where user_id=u; end if;
 return result;
end $$;

create function public.community_moderate(p_action text default 'list',p_id bigint default null,p_user uuid default null,p_flag boolean default true) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=community_private.member(); result jsonb; begin
 if not exists(select 1 from community_private.members where user_id=u and moderator) then raise exception 'Moderator access required.'; end if;
 if p_action='list' then
 select coalesce(jsonb_agg(to_jsonb(t) order by t.id desc),'[]'::jsonb) into result from (
 select r.id,r.reason,r.comment_id,c.body,c.article_id,c.user_id as reported_user,c.hidden,m.display_name as name
 from community_private.reports r join community_private.comments c on c.id=r.comment_id
 left join community_private.members m on m.user_id=c.user_id where not r.resolved order by r.id desc limit 50) t;
 return result;
 elsif p_action='hide' then update community_private.comments set hidden=p_flag where id=p_id;
 elsif p_action='resolve' then update community_private.reports set resolved=true where id=p_id;
 elsif p_action='block' then
 if p_user=u then raise exception 'You cannot restrict your own account.'; end if;
 update community_private.members set blocked=p_flag where user_id=p_user and not moderator;
 elsif p_action='close' then
 insert into community_private.threads(article_id,closed) values(p_id,p_flag) on conflict(article_id) do update set closed=excluded.closed;
 else raise exception 'Unknown action.'; end if;
 return '{}'::jsonb;
end $$;

create function public.community_delete_account() returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin
 if u is null then raise exception 'Sign in first.'; end if;
 update community_private.comments set body='',deleted=true where user_id=u;
 delete from auth.users where id=u;
end $$;
-- Explicit grants: never inherit PUBLIC execution for definer functions.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='community_private' or (n.nspname='public' and p.proname like 'community_%') loop
 execute format('revoke all on function %s from public, anon, authenticated',f.sig);
 end loop;
end $$;
grant execute on function public.community_thread(bigint,bigint),public.community_directory(text,boolean,integer) to anon,authenticated;
grant execute on function public.community_profile(text),public.community_comment(bigint,text,bigint,bigint),public.community_action(text,bigint,text),public.community_inbox(boolean),public.community_moderate(text,bigint,uuid,boolean),public.community_delete_account() to authenticated;
