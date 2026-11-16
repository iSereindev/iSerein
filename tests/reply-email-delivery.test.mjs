import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/discussion-email.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
 .replace('import "server-only";','').replace('import { createClient } from "@supabase/supabase-js";','const createClient = (...args) => globalThis.__replyDb(...args);');
const {sendDiscussionEmails,escapeEmail}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
process.env.DISCUSSION_EMAIL_ENABLED='true';process.env.BREVO_API_KEY='test-key';process.env.DISCUSSION_EMAIL_FROM='hello@example.test';process.env.DISCUSSION_EMAIL_REPLY_TO='reply@example.test';process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SECRET_KEY='server-test';
assert.equal(escapeEmail('<script>"&'), '&lt;script&gt;&quot;&amp;');
const job={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',title:'<img src=x>',token:'00000000-0000-4000-8000-000000000002',article_id:7,count:2};
let queue,finish,requests,allowed=true;
globalThis.__replyDb=()=>({rpc:async(name,args)=>{
 if(name==='community_email_claim')return {data:queue.shift()||null};
 if(name==='community_email_allowed')return {data:allowed};
 if(name==='community_email_finish'){finish.push(args);return {};}
 throw new Error('Unexpected RPC');
}});
const reset=()=>{queue=[job];finish=[];requests=[];allowed=true;};
const originalFetch=globalThis.fetch;
try {
 reset();globalThis.fetch=async(url,init)=>{requests.push({url,init});return new Response('{}',{status:201});};
 assert.equal((await sendDiscussionEmails()).accepted,1);
 const body=JSON.parse(requests[0].init.body);assert.equal(body.to[0].email,job.email);assert.equal(body.to.length,1);assert.ok(body.htmlContent.includes('&lt;img src=x&gt;'));assert.ok(body.htmlContent.includes('/reading/7#discussion'));assert.ok(body.htmlContent.includes('/unsubscribe?token='));assert.equal(body.headers.idempotencyKey,job.id);assert.equal(finish[0].p_result,'sent');
 reset();globalThis.fetch=async()=>new Response('{}',{status:429});assert.equal((await sendDiscussionEmails()).deferred,1);assert.equal(finish[0].p_result,'retry');
 reset();globalThis.fetch=async()=>{throw new Error('timeout');};assert.equal((await sendDiscussionEmails()).uncertain,1);assert.equal(finish[0].p_result,'uncertain');
 reset();globalThis.fetch=async()=>new Response('{}',{status:401});assert.equal((await sendDiscussionEmails()).failed,1);
 reset();allowed=false;globalThis.fetch=async()=>{throw new Error('Must not send after opt-out');};await sendDiscussionEmails();assert.equal(finish[0].p_result,'failed');
 process.env.DISCUSSION_EMAIL_ENABLED='false';await assert.rejects(sendDiscussionEmails(),/not enabled/);
} finally {globalThis.fetch=originalFetch;delete globalThis.__replyDb;}
console.log('PASS: provider payload, HTML escaping, private recipient, conversation/unsubscribe links, idempotency, opt-out recheck, provider failure and disabled switch. No real emails sent.');
