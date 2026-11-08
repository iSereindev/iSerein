-- Run once in Supabase SQL Editor before deploying the reading-count update.
-- Safe to rerun. Existing articles, feedback and reminder subscriptions are unchanged.
begin;

create table if not exists public.article_view_totals (
  article_id bigint primary key references public.articles(id) on delete cascade,
  views bigint not null default 0 check (views between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);

create table if not exists public.article_view_daily (
  article_id bigint not null references public.articles(id) on delete cascade,
  view_day date not null,
  reader_hash text not null check (reader_hash ~ '^[a-f0-9]{64}$'),
  primary key (article_id, view_day, reader_hash)
);
create index if not exists article_view_daily_day_idx on public.article_view_daily(view_day);

create table if not exists public.article_view_limits (
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null,
  primary key (network_hash, window_start)
);
create index if not exists article_view_limits_window_idx on public.article_view_limits(window_start);

alter table public.article_view_totals enable row level security;
alter table public.article_view_daily enable row level security;
alter table public.article_view_limits enable row level security;
revoke all on public.article_view_totals, public.article_view_daily, public.article_view_limits from public, anon, authenticated;
grant all on public.article_view_totals, public.article_view_daily, public.article_view_limits to service_role;

create or replace function public.get_article_view_count(p_article_id bigint)
returns bigint language plpgsql stable security definer set search_path = '' as $$
declare total bigint;
begin
  if p_article_id is null or p_article_id < 1 then raise exception 'Invalid reading' using errcode='22023'; end if;
  if not exists (select 1 from public.articles where id=p_article_id and published_date <= (pg_catalog.now() at time zone 'UTC')::date)
    then raise exception 'Reading unavailable' using errcode='P0002'; end if;
  select v.views into total from public.article_view_totals v where v.article_id=p_article_id;
  return coalesce(total,0);
end; $$;

create or replace function public.record_article_view(p_article_id bigint, p_view_day date, p_reader_hash text, p_network_hash text)
returns table(views bigint, counted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  today date := (pg_catalog.now() at time zone 'UTC')::date;
  bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.clock_timestamp());
  attempts_now integer;
  inserted integer;
  total bigint;
begin
  if p_article_id is null or p_article_id < 1 or p_view_day is null or p_view_day <> today
    or p_reader_hash is null or p_reader_hash !~ '^[a-f0-9]{64}$'
    or p_network_hash is null or p_network_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid view' using errcode='22023'; end if;
  if not exists (select 1 from public.articles where id=p_article_id and published_date <= today)
    then raise exception 'Reading unavailable' using errcode='P0002'; end if;

  if exists (select 1 from public.article_view_daily d where d.article_id=p_article_id and d.view_day=today and d.reader_hash=p_reader_hash) then
    select v.views into total from public.article_view_totals v where v.article_id=p_article_id;
    return query select coalesce(total,0),false;
    return;
  end if;

  -- Only short-lived hashes are retained, never raw addresses or browser-cookie tokens.
  delete from public.article_view_daily where view_day < today;
  delete from public.article_view_limits where window_start < bucket - interval '10 minutes';
  insert into public.article_view_limits(network_hash,window_start,attempts) values (p_network_hash,bucket,1)
    on conflict(network_hash,window_start) do update set attempts=public.article_view_limits.attempts+1
    returning attempts into attempts_now;
  if attempts_now > 120 then raise exception 'Please wait' using errcode='PT429'; end if;

  insert into public.article_view_daily(article_id,view_day,reader_hash) values (p_article_id,today,p_reader_hash)
    on conflict(article_id,view_day,reader_hash) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    insert into public.article_view_totals as v(article_id,views) values (p_article_id,1)
      on conflict(article_id) do update set views=v.views+1,updated_at=pg_catalog.now()
      returning v.views into total;
  else
    select v.views into total from public.article_view_totals v where v.article_id=p_article_id;
  end if;
  return query select coalesce(total,0),inserted=1;
end; $$;

revoke all on function public.get_article_view_count(bigint), public.record_article_view(bigint,date,text,text) from public, anon, authenticated;
grant execute on function public.get_article_view_count(bigint), public.record_article_view(bigint,date,text,text) to service_role;

notify pgrst, 'reload schema';
commit;
