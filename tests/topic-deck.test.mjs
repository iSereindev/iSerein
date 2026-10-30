import assert from "node:assert/strict";
import test from "node:test";
import { shuffleArticleOrder } from "../lib/article-shuffle.ts";
import { topicDeckPosition, topicReadingHref } from "../lib/topic-deck.ts";

test("a topic mix keeps every older and newer reading exactly once and stays stable", () => {
  const ids = Array.from({ length: 21 }, (_, index) => index + 1);
  const mixed = shuffleArticleOrder(ids, "Self:0123456789abcdef0123456789abcdef");
  assert.deepEqual(mixed, shuffleArticleOrder(ids, "Self:0123456789abcdef0123456789abcdef"));
  assert.deepEqual([...mixed].sort((a, b) => a - b), ids);
  for (let index = 0; index < 20; index += 2) {
    assert.equal(mixed.slice(index, index + 2).filter((id) => id <= 11).length, 1);
  }
});

test("selected reading links and legacy pagination resolve to the same mixed order", () => {
  const ids = [4, 8, 2, 7, 3, 6, 1, 5];
  assert.equal(topicDeckPosition(ids, "7"), 3);
  assert.equal(topicDeckPosition(ids, "7", "2"), 3);
  assert.equal(topicDeckPosition(ids, undefined, "2"), 6);
  assert.equal(topicDeckPosition(ids, undefined, "999"), 6);
  for (const value of ["-1", "0", "1.5", "x", ["2", "3"]]) assert.equal(topicDeckPosition(ids, undefined, value), 0);
  assert.equal(topicDeckPosition(ids, "999"), 0);
  assert.equal(topicDeckPosition(ids, ["7", "8"]), 0);
  assert.equal(topicDeckPosition([], undefined, "2"), 0);
  assert.equal(topicDeckPosition([42], "42"), 0);
});

test("card links retain their selected article and shuffle seed", () => {
  const seed = "0123456789abcdef0123456789abcdef";
  const url = new URL(topicReadingHref("Growth", 12, seed), "https://iserein.app");
  assert.equal(url.pathname, "/topics/Growth");
  assert.equal(url.searchParams.get("reading"), "12");
  assert.equal(url.searchParams.get("shuffle"), seed);
});
