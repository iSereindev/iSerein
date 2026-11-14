import test from "node:test";
import assert from "node:assert/strict";
import { validReadSyncIds } from "../lib/reminder-read-sync.ts";

test("read sync accepts bounded positive IDs, not malformed or unsafe values", () => {
  assert.equal(validReadSyncIds([1,2,3]),true);
  assert.equal(validReadSyncIds(Array(250).fill(1)),true);
  for (const value of [null,{},[0],[-1],["1"],[1.5],[Number.MAX_SAFE_INTEGER+1],Array(251).fill(1)])
    assert.equal(validReadSyncIds(value),false);
});
