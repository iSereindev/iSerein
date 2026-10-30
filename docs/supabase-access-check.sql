-- READ-ONLY CHECK. Run in Supabase > SQL Editor; these queries change nothing.
-- A write grant alone does not mean a visitor can write: RLS policies also apply.
-- Review both results together. No private article text or API keys are selected.

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  has_table_privilege('anon', c.oid, 'select') as visitor_has_select_grant,
  has_table_privilege('anon', c.oid, 'insert') as visitor_has_insert_grant,
  has_table_privilege('anon', c.oid, 'update') as visitor_has_update_grant,
  has_table_privilege('anon', c.oid, 'delete') as visitor_has_delete_grant
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('articles', 'home_quotes', 'books')
  and c.relkind in ('r', 'p')
order by c.relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('articles', 'home_quotes', 'books')
order by tablename, policyname;
