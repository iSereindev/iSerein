import test from "node:test";
import assert from "node:assert/strict";
import { digestPayload } from "../lib/article-digest.ts";
test("one new article opens that article; multiple articles open their exact batch", () => {
  const batch={digest_id:"batch-id",article_count:1,first_id:12,first_title:"A quiet day"};
  assert.equal(digestPayload(batch,"2026-11-14").url,"/reading/12");
  const multiple=digestPayload({...batch,article_count:6},"2026-11-14");
  assert.equal(multiple.url,"/readings?batch=batch-id");
  assert.match(multiple.title,/6 new pages/);
  assert.equal(multiple.test,false);
});

test("an older unread recommendation never claims to be a new release", () => {
  const payload=digestPayload({digest_id:"batch-id",article_count:1,first_id:8,first_title:"An older page",is_recommendation:true},"2026-11-14");
  assert.match(payload.title,/haven’t read yet/);
  assert.doesNotMatch(payload.title,/new/i);
  assert.equal(payload.url,"/reading/8");
});
