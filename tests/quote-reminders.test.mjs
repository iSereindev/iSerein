import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allowedPushEndpoint, dailyQuote, decodePushKey, isQuoteOrigin, quoteDay, quotePayload, quoteTimeWindow, readQuoteSubscription } from '../lib/quote-reminders.ts';
import { dispatchQuoteBatch } from '../lib/quote-delivery.ts';
import { ensureQuoteKeys, readQuoteKeys } from '../scripts/quote-reminder-keys.mjs';

const curve=createECDH('prime256v1');curve.generateKeys();
const keys={p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')};

test('only trusted HTTPS push providers and valid subscription key sizes are accepted',()=>{
  for(const host of ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','wns2.notify.windows.com'])assert.equal(allowedPushEndpoint(`https://${host}/push/test`),true);
  for(const url of ['http://fcm.googleapis.com/a','https://127.0.0.1/private','https://169.254.169.254/a','https://fcm.googleapis.com.attacker.example/a','https://attacker.example/push.apple.com/a','https://user:pass@web.push.apple.com/a','https://web.push.apple.com:8443/a','https://web.push.apple.com/a#fragment','file:///etc/passwd'])assert.equal(allowedPushEndpoint(url),false,url);
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys};
  assert.deepEqual(readQuoteSubscription(subscription),subscription);
  assert.equal(readQuoteSubscription({...subscription,keys:{...keys,auth:'bad'}}),null);
  assert.equal(readQuoteSubscription({...subscription,keys:{...keys,p256dh:randomBytes(65).toString('base64url')}}),null);
  assert.equal(decodePushKey(keys.p256dh).length,65);
});

test('the daily quote is stable across ordering and changes on the next UTC day',()=>{
  const quotes=[{id:3,sentence:'Three',display_order:2},{id:1,sentence:'One',display_order:1},{id:2,sentence:'Two',display_order:1}];
  assert.deepEqual(dailyQuote(quotes,'2026-10-31'),dailyQuote([...quotes].reverse(),'2026-10-31'));
  assert.notEqual(dailyQuote(quotes,'2026-10-31').id,dailyQuote(quotes,'2026-11-01').id);
  assert.equal(quoteDay(new Date('2026-10-31T23:59:59Z')),'2026-10-31');
  assert.equal(dailyQuote([],'2026-10-31'),null);assert.equal(dailyQuote(quotes,'2026-02-30'),null);
  assert.equal(dailyQuote([{id:0,sentence:'invalid',display_order:0}],'2026-10-31'),null);
});

test('notification payloads fit push limits and link to the chosen quote without splitting Unicode',()=>{
  const payload=quotePayload({id:12,sentence:'😀'.repeat(500),display_order:1},'2026-10-31');
  assert.equal(payload.url,'/?thought=12#thoughts');assert.ok(!payload.body.includes('\ufffd'));
  assert.ok(Buffer.byteLength(JSON.stringify(payload))<2000);assert.ok(payload.body.endsWith('…'));
  assert.equal(quotePayload({id:1,sentence:'A thought.',display_order:1},'2026-10-31',true).test,true);
});

test('the shown send window is converted to the reader timezone and origin checks remain strict',()=>{
  const now=new Date('2026-10-31T00:00:00Z');
  assert.match(quoteTimeWindow(now,'en-GB','Asia/Kuala_Lumpur'),/0?9:00.*10:00/);
  assert.match(quoteTimeWindow(now,'en-GB','America/New_York'),/21:00.*22:00/);
  assert.equal(isQuoteOrigin('https://iserein.app','iserein.app','same-origin'),true);
  assert.equal(isQuoteOrigin(null,'iserein.app','same-origin'),true);
  assert.equal(isQuoteOrigin(null,'iserein.app',null),false);
  assert.equal(isQuoteOrigin('https://attacker.example','iserein.app','same-origin'),false);
  assert.equal(isQuoteOrigin('https://iserein.app','iserein.app','cross-site'),false);
});

test('batch delivery records sent, expired and failed attempts without stopping other recipients',async()=>{
  const rows=Array.from({length:5},(_,i)=>({id:i+1,claim_token:`claim-${i}`}));let round=0;let recorded=[];
  const summary=await dispatchQuoteBatch({day:'2026-10-31',publicKey:'key',claim:async()=>round++===0?rows:[],send:async row=>{if(row.id===3)throw new Error();return row.id===2?'expired':'sent';},finish:async values=>{recorded=values;},continueLater:async()=>assert.fail('No continuation needed')});
  assert.equal(summary.sent,3);assert.equal(summary.expired,1);assert.equal(summary.failed,1);assert.equal(recorded.length,5);
});

test('larger delivery batches continue with bounded concurrency and retain claim tokens',async()=>{
  const rows=Array.from({length:12},(_,i)=>({id:i,claim_token:`token-${i}`}));let calls=0,active=0,peak=0,continued=0;
  await dispatchQuoteBatch({day:'2026-10-31',publicKey:'key',claim:async()=>rows,send:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;return 'sent';},finish:async values=>assert.equal(values[11].claim_token,'token-11'),continueLater:async()=>continued++,now:()=>calls++===0?0:100,budgetMs:1});
  assert.ok(peak<=6);assert.equal(continued,1);
});

test('key setup preserves existing environment values and never rotates a working key pair',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'iserein-quote-key-test-'));const file=join(folder,'.env.local');
  try{
    await writeFile(file,'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\nOTHER_SETTING=keep-me\n');
    const first=await ensureQuoteKeys(file);assert.equal(first.added.length,3);
    const before=await readFile(file,'utf8');const second=await ensureQuoteKeys(file);
    assert.deepEqual(second.added,[]);assert.equal(await readFile(file,'utf8'),before);assert.ok(before.includes('OTHER_SETTING=keep-me'));
    const {values}=await readQuoteKeys(file);assert.equal(values.CRON_SECRET.length,64);assert.equal(decodePushKey(values.VAPID_PUBLIC_KEY).length,65);
    await writeFile(file,'VAPID_PUBLIC_KEY=partial\n');
    await assert.rejects(()=>ensureQuoteKeys(file),/Only one VAPID key/);assert.equal(await readFile(file,'utf8'),'VAPID_PUBLIC_KEY=partial\n');
  }finally{await rm(folder,{recursive:true,force:true});}
});
