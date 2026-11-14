import test from "node:test";
import assert from "node:assert/strict";
import { readReminderKind, readingPayload } from "../lib/daily-reminders.ts";

test("reminder content choice rejects unknown values", () => {
  assert.equal(readReminderKind("reading"), "reading");
  assert.equal(readReminderKind("quote"), "quote");
  for (const value of ["email", "both", null, {}, ["reading"]]) assert.equal(readReminderKind(value), null);
});
test("reading notifications link to the exact article with bounded copy", () => {
  const payload = readingPayload({id:12,title:"A".repeat(300)}, "2026-11-14");
  assert.equal(payload.url, "/reading/12");
  assert.equal(payload.body.length, 220);
  assert.equal(payload.test, false);
  assert.equal(readingPayload({id:12,title:"Hello"}, "2026-11-14", true).test, true);
});
