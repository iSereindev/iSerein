import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url), db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
for(const name of ['20261114000100_local_catalog.sql','20261114000200_discussions.sql','20261115000100_reply_emails.sql','20261117000100_video_discussions.sql']) await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users values($1,now(),$2),($3,now(),$4)',[alice,'alice@example.test',bob,'bob@example.test']);
const as=async(u,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u||'']);await db.exec('set role '+role);};
const call=async(fn,args=[]) => (await db.query('select public.'+fn+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as v',args)).rows[0].v;
const admin=async(sql,args=[])=>{await db.exec('reset role');return db.query(sql,args);};
const count=async()=>Number((await admin('select count(*) as n from community_private.email_deliveries')).rows[0].n);
await as(alice);await call('community_profile',['Alice']);const parent=Number(await call('community_comment',[1,'Opening question']));
assert.equal(await call('community_email_preference',[1]),false);
await as(bob);await call('community_profile',['Bob']);await call('community_comment',[1,'Before opt-in',parent]);assert.equal(await count(),0);
await as(alice);await call('community_email_preference',[1,true]);
await call('community_comment',[1,'Self reply',parent]);assert.equal(await count(),0);
await as(bob);const reply=Number(await call('community_comment',[1,'A reply',parent]));await call('community_comment',[1,'Another reply',parent]);assert.equal(await count(),1);
await as(bob);await call('community_comment',[1,'Edited',null,reply]);await call('community_action',['react',parent,'❤️']);assert.equal(await count(),1);
await as(bob);await assert.rejects(call('community_email_claim'));await assert.rejects(call('community_email_finish',['00000000-0000-4000-8000-000000000099','sent']));await assert.rejects(db.query('select * from community_private.email_preferences'));
await as(null,'anon');await assert.rejects(call('community_email_preference',[1]));await assert.rejects(call('community_email_unsubscribe',[alice]));
await as(alice);await assert.rejects(call('community_email_preference',[3,true]));
await as(null,'service_role');assert.equal(await call('community_email_claim'),null); // batching delay
await admin("update community_private.email_deliveries set due_at=now()-interval '1 minute'");
await as(null,'service_role');let job=await call('community_email_claim');assert.equal(job.email,'alice@example.test');assert.equal(job.count,2);assert.equal(await call('community_email_claim'),null);assert.equal(await call('community_email_allowed',[job.id]),true);
await as(alice);await call('community_email_preference',[1,false]);await as(null,'service_role');assert.equal(await call('community_email_allowed',[job.id]),false);
await call('community_email_finish',[job.id,'sent']); // cancellation cannot be overwritten
assert.equal((await admin('select status from community_private.email_deliveries')).rows[0].status,'cancelled');
// Unsubscribe token belongs only to its recipient/article.
await as(alice);await call('community_email_preference',[1,true]);await as(bob);await call('community_email_preference',[1,true]);
await as(null,'service_role');await call('community_email_unsubscribe',[job.token]);await as(alice);assert.equal(await call('community_email_preference',[1]),false);await as(bob);assert.equal(await call('community_email_preference',[1]),true);
// Hidden replies cannot produce email; then show that deleting the parent also suppresses.
await admin('delete from community_private.email_deliveries');await as(alice);await call('community_email_preference',[1,true]);
await as(bob);const hidden=Number(await call('community_comment',[1,'Moderation test',parent]));
await admin('update community_private.comments set hidden=true where id=$1',[hidden]);await admin("update community_private.email_deliveries set due_at=now()-interval '1 minute'");await as(null,'service_role');assert.equal(await call('community_email_claim'),null);
await admin('delete from community_private.email_deliveries');await as(bob);await call('community_comment',[1,'Parent test',parent]);await admin('update community_private.comments set hidden=true where id=$1',[parent]);await admin("update community_private.email_deliveries set due_at=now()-interval '1 minute'");await as(null,'service_role');assert.equal(await call('community_email_claim'),null);
await admin('update community_private.comments set hidden=false where id=$1',[parent]);
// Four accepted or ambiguous sends in a rolling day defer the next job.
await admin('delete from community_private.email_deliveries');await admin(`insert into community_private.email_deliveries(user_id,article_id,bucket,comment_ids,status,attempted_at)
select $1,1,now()-make_interval(hours=>n),array[$2::bigint],'sent',now()-make_interval(hours=>n) from generate_series(2,5) n`,[alice,reply]);
await admin(`insert into community_private.email_deliveries(user_id,article_id,bucket,comment_ids,due_at) values($1,1,now(),array[$2::bigint],now()-interval '1 minute')`,[alice,reply]);await as(null,'service_role');assert.equal(await call('community_email_claim'),null);
await admin("delete from community_private.email_deliveries where status='sent'");await admin("update community_private.email_deliveries set due_at=now()-interval '1 minute'");await as(null,'service_role');job=await call('community_email_claim');assert.ok(job);
// Uncertain sends are held, never automatically sent again.
await admin("update community_private.email_deliveries set attempted_at=now()-interval '11 minutes' where id=$1",[job.id]);await as(null,'service_role');assert.equal(await call('community_email_claim'),null);assert.equal((await admin('select status from community_private.email_deliveries where id=$1',[job.id])).rows[0].status,'uncertain');
await as(alice);await call('community_email_disable_all');assert.equal(await call('community_email_preference',[1]),false);
await as(bob);assert.equal(await call('community_email_preference',[1]),true);
await call('community_delete_account');assert.equal(Number((await admin('select count(*) as n from community_private.email_preferences where user_id=$1',[bob])).rows[0].n),0);
const tables=(await admin("select relname,relrowsecurity from pg_class where relname in ('email_preferences','email_deliveries')")).rows;assert.equal(tables.length,2);assert.ok(tables.every(t=>t.relrowsecurity));
await db.close();console.log('PASS reply email consent, self exclusion, batching, permissions, unsubscribe, moderation, daily cap, uncertain sends, global opt-out, deletion and RLS.');
