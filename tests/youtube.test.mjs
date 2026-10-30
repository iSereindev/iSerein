import assert from "node:assert/strict";
import test from "node:test";
import { youtubeVideoId } from "../lib/youtube.ts";

const id = "M7lc1UVf-VE";

test("video links accept YouTube Shorts, watch URLs and shared links", () => {
  for (const url of [
    `https://www.youtube.com/shorts/${id}?feature=share`,
    `https://youtube.com/shorts/${id}/`,
    `https://www.youtube.com/watch?si=sharing&v=${id}&t=30`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=sharing`,
    ` https://youtu.be/${id} `,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ]) assert.equal(youtubeVideoId(url), id, url);
});

test("video links reject unrelated hosts, credentials, markup and unsafe schemes", () => {
  for (const url of [
    `https://youtube.com.example.org/watch?v=${id}`,
    `https://notyoutube.com/watch?v=${id}`,
    `https://youtube.com@evil.example/shorts/${id}`,
    `https://someone@www.youtube.com/shorts/${id}`,
    `https://www.youtube.com:444/shorts/${id}`,
    `http://youtu.be/${id}`,
    `javascript:alert(1)`,
    `<iframe src="https://www.youtube.com/embed/${id}"></iframe>`,
    `https://www.youtube.com/redirect?q=https://example.org&v=${id}`,
  ]) assert.equal(youtubeVideoId(url), null, url);
});

test("only complete individual video IDs are accepted", () => {
  for (const url of [
    "", "not a URL", "https://www.youtube.com/@iserein", "https://www.youtube.com/playlist?list=PLexample",
    "https://www.youtube.com/watch", "https://youtu.be/too-short", `https://youtu.be/${id}extra`,
    `https://youtu.be/${id}/other`, `https://www.youtube.com/watch?v=${id}%3Cscript%3E`,
    `https://www.youtube.com/watch?v=${id}%0A`,
  ]) assert.equal(youtubeVideoId(url), null, url);
});
