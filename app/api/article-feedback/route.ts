import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isFeedbackOrigin, MAX_FEEDBACK_BODY_BYTES, parseFeedbackPayload } from "@/lib/article-feedback";

export const runtime = "nodejs";
const COOKIE = "iserein-feedback-reader";

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function boundedJson(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_FEEDBACK_BODY_BYTES) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FEEDBACK_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: NextRequest) {
  // Compare the browser's actual Host; NextURL normalizes loopback hosts to localhost.
  if (!isFeedbackOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) {
    return reply({ error: "Please send feedback from the reading page." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ error: "Please send a valid response." }, 415);
  }

  let input: unknown;
  try {
    input = await boundedJson(request);
  } catch (error) {
    return reply({ error: error instanceof RangeError ? "That message is too long." : "Please send a valid response." }, error instanceof RangeError ? 413 : 400);
  }
  const parsed = parseFeedbackPayload(input);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  const payload = parsed.data;
  if (payload.website) return reply({ accepted: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return reply({ error: "Feedback is unavailable right now. Please try again later." }, 503);

  const previous = request.cookies.get(COOKIE)?.value;
  const token = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  // Each article has its own reader hash; raw addresses and cookie tokens are not stored.
  const visitorHash = hash(`article:${payload.articleId}:reader:${token}`);
  const address = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")
    : null;
  const day = new Date().toISOString().slice(0, 10);
  const requestHash = hash(`network:${day}:${address?.split(",")[0].trim() || token}`);

  try {
    const database = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (resource, options) => fetch(resource, { ...options, signal: AbortSignal.timeout(10000), cache: "no-store" }) },
    });
    const { error } = await database.rpc("record_article_feedback", {
      p_article_id: payload.articleId,
      p_visitor_hash: visitorHash,
      p_request_hash: requestHash,
      p_reaction: payload.reaction,
      p_comment: payload.comment,
    });
    if (error) {
      if (error.code === "PT429") {
        const response = reply({ error: "Please wait a minute before sending more feedback." }, 429);
        response.headers.set("Retry-After", "60");
        return response;
      }
      if (error.code === "P0002") return reply({ error: "This reading is not available for feedback." }, 404);
      // Do not log readers' comments, cookies, addresses or credentials.
      console.error("Article feedback could not be saved:", error.code || "database unavailable");
      return reply({ error: "Your response was not saved. Please try again later." }, 503);
    }
    const response = reply({ accepted: true });
    response.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch {
    return reply({ error: "Your response was not saved. Please try again later." }, 503);
  }
}
