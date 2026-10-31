-- Owner-only report: run in Supabase SQL Editor.
select
  count(*) filter (where enabled) as subscribed_browsers_or_installs,
  count(*) filter (where not enabled) as stopped_or_expired,
  count(*) filter (where last_sent_date=(now() at time zone 'UTC')::date) as accepted_by_push_service_today,
  count(*) filter (where enabled and failure_count>0) as subscriptions_with_recent_failures
from public.quote_reminder_subscriptions;

-- A successful send means the push service accepted it; it does not prove it was read.
select id, enabled, created_at, last_attempt_date, last_sent_date, failure_count
from public.quote_reminder_subscriptions
order by created_at desc;
