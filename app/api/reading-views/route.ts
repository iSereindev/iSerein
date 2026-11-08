import { NextRequest, NextResponse } from "next/server";
import { isFeedbackOrigin } from "@/lib/article-feedback";
import { countDay, knownCountCrawler, MAX_VIEW_BODY_BYTES, publicCount, readingCountId, secondsUntilCountReset, viewPayload } from "@/lib/reading-counts";
import { newViewCookie, readViewToken, VIEW_COOKIE, viewNetworkHash, viewReaderHash } from "@/lib/reading-count-cookie";
import { countSettings, countsDatabase, getReadingViewCount, invalidateReadingCount, ReadingCountError } from "@/lib/reading-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
}

async function boundedViewBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_VIEW_BODY_BYTES || !request.body) throw new RangeError();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_VIEW_BODY_BYTES) { await reader.cancel(); throw new RangeError(); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function GET(request: NextRequest) {
  const articleId = readingCountId(request.nextUrl.searchParams.get("articleId"));
  if (articleId === null) return reply({ error: "Invalid reading." }, 400);
  const settings = countSettings();
  if (!settings) return reply({ error: "Counts are unavailable." }, 503);
  try {
    const count = await getReadingViewCount(articleId);
    const response = reply({ count });
    const now = new Date();
    if (!knownCountCrawler(request.headers.get("user-agent")) && !readViewToken(request.cookies.get(VIEW_COOKIE)?.value, settings.secret, countDay(now))) {
      response.cookies.set(VIEW_COOKIE, newViewCookie(settings.secret, countDay(now)), {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: secondsUntilCountReset(now),
      });
    }
    return response;
  } catch (error) {
    return reply({ error: "Counts are unavailable." }, error instanceof ReadingCountError ? error.status : 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isFeedbackOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) return reply({ error: "Open this reading on iSEREIN." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "Invalid request." }, 415);
  let input: unknown;
  try { input = await boundedViewBody(request); }
  catch (error) { return reply({ error: "Invalid request." }, error instanceof RangeError ? 413 : 400); }
  const payload = viewPayload(input);
  if (!payload) return reply({ error: "Invalid reading." }, 400);
  if (knownCountCrawler(request.headers.get("user-agent"))) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const settings = countSettings();
  if (!settings) return reply({ error: "Counts are unavailable." }, 503);
  const day = countDay();
  const token = readViewToken(request.cookies.get(VIEW_COOKIE)?.value, settings.secret, day);
  if (!token) return reply({ error: "Reopen this reading to count a view." }, 400);
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") : null;
  try {
    const { data, error } = await countsDatabase().rpc("record_article_view", {
      p_article_id: payload.articleId,
      p_view_day: day,
      p_reader_hash: viewReaderHash(settings.secret, day, payload.articleId, token),
      p_network_hash: viewNetworkHash(settings.secret, day, address?.split(",")[0].trim() || token),
    });
    if (error) {
      const status = error.code === "PT429" ? 429 : error.code === "P0002" ? 404 : 503;
      const response = reply({ error: "View could not be counted." }, status);
      if (status === 429) response.headers.set("Retry-After", "60");
      return response;
    }
    const row = Array.isArray(data) ? data[0] : null;
    const count = publicCount(row?.views);
    if (count === null || typeof row?.counted !== "boolean") return reply({ error: "Counts are unavailable." }, 503);
    if (row.counted) invalidateReadingCount(payload.articleId);
    return reply({ count, accepted: true, day });
  } catch { return reply({ error: "Counts are unavailable." }, 503); }
}
