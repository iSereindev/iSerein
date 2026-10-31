import test from "node:test";
import assert from "node:assert/strict";
import { isFeedbackOrigin, MAX_FEEDBACK_LENGTH, parseFeedbackPayload, readStoredFeedback } from "../lib/article-feedback.ts";

test("feedback origin checks use the real host on production, previews and loopback", () => {
  for (const origin of ["https://iserein.app", "https://preview.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
    assert.equal(isFeedbackOrigin(origin, new URL(origin).host, "same-origin"), true);
  }
  for (const origin of ["null", "https://another-site.example", "https://iserein.app.attacker.example", "https://iserein.app/extra", "javascript:alert(1)"]) {
    assert.equal(isFeedbackOrigin(origin, "iserein.app", "same-origin"), false);
  }
  assert.equal(isFeedbackOrigin("https://iserein.app", "iserein.app", "cross-site"), false);
  assert.equal(isFeedbackOrigin("https://iserein.app", null, "same-origin"), false);
  assert.equal(isFeedbackOrigin(null, "iserein.app", "same-origin"), true);
  assert.equal(isFeedbackOrigin(null, "iserein.app", "same-site"), false);
  assert.equal(isFeedbackOrigin(null, "iserein.app", null), false);
});

test("feedback only accepts real positive numeric reading IDs and known reactions", () => {
  assert.equal(parseFeedbackPayload({ articleId: 12, type: "reaction", reaction: "up" }).ok, true);
  assert.equal(parseFeedbackPayload({ articleId: 12, type: "reaction", reaction: "down" }).ok, true);
  for (const articleId of ["12", 0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseFeedbackPayload({ articleId, type: "reaction", reaction: "up" }).ok, false);
  }
  for (const reaction of [null, "love", true, 1]) assert.equal(parseFeedbackPayload({ articleId: 12, type: "reaction", reaction }).ok, false);
});

test("private messages can be sent without a vote and preserve meaningful line breaks", () => {
  const result = parseFeedbackPayload({ articleId: 12, type: "comment", comment: "  This helped.\nThank you.  ", reaction: "down" });
  assert.equal(result.ok, true);
  assert.equal(result.data.comment, "This helped.\nThank you.");
  assert.equal(result.data.reaction, null);
});

test("empty, oversized and control-character messages are rejected", () => {
  for (const comment of ["", " \n ", "a".repeat(MAX_FEEDBACK_LENGTH + 1), "hello\u0000world", "hello\u0007world"]) {
    assert.equal(parseFeedbackPayload({ articleId: 12, type: "comment", comment }).ok, false);
  }
  assert.equal(parseFeedbackPayload({ articleId: 12, type: "comment", comment: "a".repeat(MAX_FEEDBACK_LENGTH) }).ok, true);
});

test("a reaction never includes a private message or caller-provided ownership fields", () => {
  const result = parseFeedbackPayload({ articleId: 12, type: "reaction", reaction: "up", comment: "Do not overwrite my message", visitor_hash: "forged", website: " example.com " });
  assert.deepEqual(result.data, { articleId: 12, type: "reaction", reaction: "up", comment: null, website: "example.com" });
});

test("corrupt or manipulated browser preferences do not crash the reader", () => {
  for (const value of [null, "nope", "null", "[]", '{"reaction":"admin","commented":"yes"}']) {
    assert.deepEqual(readStoredFeedback(value), { reaction: null, commented: false });
  }
  assert.deepEqual(readStoredFeedback('{"reaction":"down","commented":true}'), { reaction: "down", commented: true });
});
