import test from "node:test";
import assert from "node:assert/strict";
import { parseReadIds } from "../lib/reading-history.ts";
import { moodSuggestions, readingMatchesMood } from "../lib/reading-moods.ts";
import { bounded, checkOperation } from "../lib/reminder-operation.ts";
import { readReminderSchedule } from "../lib/reminder-schedule.ts";

test("read history tolerates corrupt storage and does not confuse strings with IDs", () => {
  assert.deepEqual(parseReadIds("{broken"), []);
  assert.deepEqual(parseReadIds('{"id":1}'), []);
  assert.deepEqual(parseReadIds('[1,1,2,"3",null,-1,0,1.5]'), [1,2]);
});
test("mood matching honours editorial overrides and ranks unread first", () => {
  const readings = [
    {id:1,title:"A quieter mind",subtitle:"Find calm",published_date:"2026-11-14"},
    {id:2,title:"Inner peace",subtitle:null,published_date:"2026-11-13"},
    {id:3,title:"A quiet mind",moods:[],published_date:"2026-11-12"},
    {id:4,title:"A new beginning",moods:["calm"],published_date:"2026-11-11"},
  ];
  assert.deepEqual(moodSuggestions(readings,"calm",[1]).map(a=>a.id),[2,4,1]);
  assert.equal(readingMatchesMood(readings[2],"calm"),false);
  assert.deepEqual(moodSuggestions(readings,"connection",[]),[]);
});
test("reminder schedules reject malformed time and unsupported time zones", () => {
  assert.deepEqual(readReminderSchedule({localTime:"08:00",timeZone:"Europe/Prague"}),{localTime:"08:00",timeZone:"Europe/Prague"});
  for (const time of ["24:00","8:00","08:60","00:00:00",""]) assert.equal(readReminderSchedule({localTime:time,timeZone:"UTC"}),null);
  assert.equal(readReminderSchedule({localTime:"08:00",timeZone:"Mars/Base"}),null);
});
test("a stalled browser operation times out and cannot continue into a network write", async () => {
  const abort = new AbortController();
  let release, written = false;
  const permission = new Promise(resolve => { release = resolve; });
  const action = (async () => {
    await bounded(permission, abort.signal);
    checkOperation(abort.signal);
    written = true;
  })();
  abort.abort(new Error("timeout"));
  await assert.rejects(action,/timeout/);
  release("granted");
  await Promise.resolve();
  assert.equal(written,false);
  assert.equal(await bounded(Promise.resolve("retry"),new AbortController().signal),"retry");
});
test("an already-cancelled operation handles a late browser rejection", async () => {
  const abort = new AbortController(); abort.abort(new Error("cancelled"));
  await assert.rejects(bounded(Promise.reject(new Error("late browser error")),abort.signal),/cancelled/);
});
