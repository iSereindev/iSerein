import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../public/quote-reminders-sw.js',import.meta.url),'utf8');

function worker(){
  const handlers={};const notifications=[];const opened=[];
  const self={location:{origin:'https://iserein.app'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>Promise.resolve(),registration:{showNotification:async(title,options)=>notifications.push({title,options})},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
  vm.runInNewContext(source,{self,URL});return{handlers,notifications,opened};
}

test('the service worker displays a quiet quote and never intercepts page requests',async()=>{
  const w=worker();let pending;
  w.handlers.push({data:{json:()=>({title:'A thought',body:'A short quote.',url:'/?thought=12#thoughts'})},waitUntil:promise=>pending=promise});await pending;
  assert.equal(w.notifications[0].options.body,'A short quote.');assert.equal(w.notifications[0].options.silent,true);assert.equal(w.notifications[0].options.tag,'iserein-daily-quote');assert.equal(w.handlers.fetch,undefined);
});

test('malformed push data still produces a visible notification',async()=>{
  for(const data of [null,[],false]){
    const w=worker();let pending;w.handlers.push({data:{json:()=>data},waitUntil:p=>pending=p});await pending;assert.equal(w.notifications.length,1);
  }
});

test('notification taps open only a safe same-origin destination',async()=>{
  for(const url of ['https://attacker.example/steal','javascript:alert(1)','/?thought=12#thoughts']){
    const w=worker();let pending;let closed=false;
    w.handlers.notificationclick({notification:{data:{url},close:()=>closed=true},waitUntil:p=>pending=p});await pending;
    assert.equal(closed,true);assert.ok(w.opened[0].startsWith('https://iserein.app/'));
    assert.equal(w.opened[0],url.startsWith('/?')?'https://iserein.app/?thought=12#thoughts':'https://iserein.app/#thoughts');
  }
});
