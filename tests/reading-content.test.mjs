import assert from "node:assert/strict";
import test from "node:test";
import { getPublicationDate } from "../lib/publication.ts";
import { readingDescription, readingText } from "../lib/reading-text.ts";

test("publication dates change at the existing UTC midnight", () => {
  assert.equal(getPublicationDate(new Date("2026-10-28T23:59:59.999Z")), "2026-10-28");
  assert.equal(getPublicationDate(new Date("2026-10-29T00:00:00.000Z")), "2026-10-29");
  assert.equal(getPublicationDate(new Date("2026-10-29T00:30:00+08:00")), "2026-10-28");
});

test("previews preserve words across headings, paragraphs, lists, and links", () => {
  const input = "## A new perspective\n\nKeep **your voice**.\n\n---\n\n1. Notice one thing.\n2. [Read more](https://iserein.app/).";
  assert.equal(readingText(input), "A new perspective Keep your voice. Notice one thing. Read more.");
});

test("escaped punctuation and inline code keep their actual text", () => {
  assert.equal(readingText("Keep \\*literal\\* stars and `your_name`."), "Keep *literal* stars and your_name.");
});

test("raw HTML is absent from previews", () => {
  assert.equal(readingText("Before.\n\n<script>alert('x')</script>\n\nAfter."), "Before. After.");
});

test("descriptions prefer the subtitle and otherwise use readable content", () => {
  assert.equal(readingDescription("Article body", "A **clearer** subtitle"), "A clearer subtitle");
  assert.equal(readingDescription("### Today's Practice\n\nTry one small thing."), "Today's Practice Try one small thing.");
});

test("long descriptions stay within a compact sharing preview", () => {
  const description = readingDescription("An idea worth returning to. ".repeat(30));
  assert(description.length <= 160);
  assert(description.endsWith("…"));
});
