import "server-only";
import { createECDH, createHash, createHmac, randomBytes, timingSafeEqual, ECDH } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { NextRequest, NextResponse } from "next/server";
import { getActiveQuotes } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site-metadata";
import { dailyQuote, quoteDay, quotePayload, readQuoteSubscription } from "@/lib/quote-reminders";
import { dispatchQuoteBatch } from "@/lib/quote-delivery";
import type { QuoteDeliveryResult, QuoteDeliveryRow } from "@/lib/quote-delivery";
import type { QuoteSubscription } from "@/lib/quote-reminders";

export const QUOTE_COOKIE = "iserein-quote-reader";
export type PushSettings = { publicKey: string; privateKey: string; cronSecret: string; databaseUrl: string; databaseKey: string };

export function getPushSettings(): PushSettings | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const databaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicKey || !privateKey || !cronSecret || cronSecret.length < 16 || !databaseUrl || !databaseKey) return null;
  try {
    const curve = createECDH("prime256v1"); curve.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (curve.getPublicKey().toString("base64url") !== publicKey) return null;
  } catch { return null; }
  return { publicKey, privateKey, cronSecret, databaseUrl, databaseKey };
}

export function quoteDatabase(settings: PushSettings) {
  return createClient(settings.databaseUrl, settings.databaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (resource, options) => fetch(resource, { ...options, signal: AbortSignal.timeout(5000), cache: "no-store" }) },
  });
}

export function quoteReply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
}

export function quoteReader(request: NextRequest, settings: PushSettings) {
  const previous = request.cookies.get(QUOTE_COOKIE)?.value;
  const token = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  const hash = (text: string) => createHmac("sha256", settings.databaseKey).update(text).digest("hex");
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") : null;
  return { token, hash: hash(`quote-reader:${token}`), network: hash(`quote-network:${quoteDay()}:${address?.split(",")[0].trim() || token}`), existing: !!previous && token === previous };
}

export function rememberQuoteReader(response: NextResponse, token: string) {
  response.cookies.set(QUOTE_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export function endpointHash(endpoint: string) { return createHash("sha256").update(endpoint).digest("hex"); }

export function validCurveSubscription(value: unknown): QuoteSubscription | null {
  const subscription = readQuoteSubscription(value);
  if (!subscription) return null;
  try { ECDH.convertKey(Buffer.from(subscription.keys.p256dh, "base64url"), "prime256v1"); return subscription; } catch { return null; }
}

export async function quoteJson(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > 8192 || !request.body) throw new RangeError();
  const reader = request.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const item = await reader.read(); if (item.done) break;
      size += item.value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new RangeError(); }
      parts.push(item.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

export function validCronHeader(header: string | null, secret: string) {
  const actual = Buffer.from(header || ""); const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function sendEncryptedQuote(subscription: QuoteSubscription, payload: ReturnType<typeof quotePayload>, settings: PushSettings): Promise<QuoteDeliveryResult["status"]> {
  if (!validCurveSubscription(subscription)) return "failed";
  try {
    const details = webpush.generateRequestDetails(subscription, JSON.stringify(payload), {
      vapidDetails: { subject: `${SITE_URL}/about`, publicKey: settings.publicKey, privateKey: settings.privateKey },
      contentEncoding: "aes128gcm", TTL: payload.test ? 300 : 43200, urgency: "normal", topic: payload.test ? "iserein-quote-test" : "iserein-daily-quote",
    });
    const headers = Object.fromEntries(Object.entries(details.headers).map(([key, value]) => [key, String(value)]));
    const response = await fetch(details.endpoint, { method: "POST", headers, body: Uint8Array.from(details.body), redirect: "error", signal: AbortSignal.timeout(4500), cache: "no-store" });
    await response.body?.cancel();
    return response.ok ? "sent" : response.status === 404 || response.status === 410 ? "expired" : "failed";
  } catch { return "failed"; }
}

export async function runDailyQuotes(settings: PushSettings, day: string, hop = 0) {
  if (day !== quoteDay()) return;
  const quote = dailyQuote(await getActiveQuotes(), day);
  if (!quote) { console.info("Daily quotes: no active quote; skipped."); return; }
  const payload = quotePayload(quote, day);
  const database = quoteDatabase(settings);
  const summary = await dispatchQuoteBatch({
    day, publicKey: settings.publicKey, budgetMs: 20000,
    claim: async (date, key, limit) => {
      const { data, error } = await database.rpc("claim_quote_deliveries", { p_day: date, p_vapid_public_key: key, p_limit: limit });
      if (error) throw new Error("Could not claim daily quote deliveries");
      return (data || []) as QuoteDeliveryRow[];
    },
    send: row => sendEncryptedQuote({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, settings),
    finish: async results => {
      const { error } = await database.rpc("finish_quote_deliveries", { p_results: results });
      if (error) throw new Error("Could not record daily quote delivery results");
    },
    continueLater: async () => {
      if (hop >= 99) throw new Error("Daily quote continuation limit reached; check remaining subscribers");
      if (process.env.VERCEL_ENV !== "production") throw new Error("Remaining quote deliveries need another local invocation");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await fetch(`${SITE_URL}/api/cron/daily-quote?day=${day}&hop=${hop + 1}`, { method: "POST", headers: { Authorization: `Bearer ${settings.cronSecret}` }, redirect: "error", signal: AbortSignal.timeout(5000), cache: "no-store" });
          await result.body?.cancel();
          if (result.ok) return;
        } catch { /* A lost acknowledgment is safe: daily claims prevent another send. */ }
      }
      throw new Error("Daily quote continuation could not be scheduled");
    },
  });
  // Only aggregate counts are logged, never push endpoints, keys or reader tokens.
  console.info("Daily quote delivery", JSON.stringify({ day, ...summary }));
}
