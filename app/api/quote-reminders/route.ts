import { NextRequest } from "next/server";
import { dailyQuote, isQuoteOrigin, QUOTE_UTC_HOUR, quoteDay, quotePayload } from "@/lib/quote-reminders";
import { getActiveQuotes } from "@/lib/catalog";
import { endpointHash, getPushSettings, quoteDatabase, quoteJson, quoteReader, quoteReply, rememberQuoteReader, sendEncryptedQuote, validCurveSubscription } from "@/lib/quote-reminder-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const settings = getPushSettings();
  if (!settings) return quoteReply({ ready: false });
  const reader = quoteReader(request, settings);
  let enabled: boolean | null = null;
  if (reader.existing) {
    const { data, error } = await quoteDatabase(settings).from("quote_reminder_subscriptions").select("enabled, vapid_public_key").eq("browser_hash", reader.hash).maybeSingle();
    if (error) return quoteReply({ error: "Reminders are unavailable right now. Please try again later." }, 503);
    enabled = data ? data.enabled && data.vapid_public_key === settings.publicKey : false;
  }
  return rememberQuoteReader(quoteReply({ ready: true, publicKey: settings.publicKey, utcHour: QUOTE_UTC_HOUR, enabled }), reader.token);
}

export async function POST(request: NextRequest) {
  if (!isQuoteOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) return quoteReply({ error: "Please manage reminders from iSEREIN." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return quoteReply({ error: "Invalid request." }, 415);
  let input: unknown;
  try { input = await quoteJson(request); } catch (error) { return quoteReply({ error: "Please send a valid reminder request." }, error instanceof RangeError ? 413 : 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return quoteReply({ error: "Invalid request." }, 400);
  const body = input as Record<string, unknown>;
  if (typeof body.action !== "string" || !["subscribe", "disable", "test"].includes(body.action)) return quoteReply({ error: "Invalid request." }, 400);
  const subscription = body.subscription ? validCurveSubscription(body.subscription) : null;
  if (body.action === "subscribe" && !subscription) return quoteReply({ error: "This browser’s push service could not be registered. Please try a supported browser." }, 400);
  const settings = getPushSettings();
  if (!settings) return quoteReply({ error: "Reminders are unavailable right now. Please try again later." }, 503);
  const reader = quoteReader(request, settings);
  if (!reader.existing) return quoteReply({ error: "Please reopen reminder settings and try again. Cookies must be allowed for this site." }, 400);
  const database = quoteDatabase(settings);
  try {
    const rate = await database.rpc("limit_quote_requests", { p_browser_hash: reader.hash, p_network_hash: reader.network, p_action: body.action });
    if (rate.error) return quoteReply({ error: rate.error.code === "PT429" ? "Please wait a while before trying again." : "Reminders are unavailable right now." }, rate.error.code === "PT429" ? 429 : 503);
    if (body.action === "subscribe" && subscription) {
      const { error } = await database.rpc("save_quote_subscription", { p_browser_hash: reader.hash, p_endpoint_hash: endpointHash(subscription.endpoint), p_endpoint: subscription.endpoint, p_p256dh: subscription.keys.p256dh, p_auth: subscription.keys.auth, p_vapid_public_key: settings.publicKey });
      if (error) return quoteReply({ error: "Your reminder could not be enabled. Please try again." }, 503);
    } else if (body.action === "disable") {
      const { error } = await database.rpc("disable_quote_subscription", { p_browser_hash: reader.hash, p_endpoint_hash: subscription ? endpointHash(subscription.endpoint) : null, p_p256dh: subscription?.keys.p256dh || null, p_auth: subscription?.keys.auth || null });
      if (error) return quoteReply({ error: "We couldn’t confirm reminders are off. Please try again." }, 503);
    } else if (body.action === "test") {
      const { data, error } = await database.from("quote_reminder_subscriptions").select("endpoint,p256dh,auth,enabled,vapid_public_key").eq("browser_hash", reader.hash).maybeSingle();
      if (error) return quoteReply({ error: "The test could not be sent. Please try again later." }, 503);
      const target = data?.enabled && data.vapid_public_key === settings.publicKey ? validCurveSubscription({ endpoint: data.endpoint, keys: { p256dh: data.p256dh, auth: data.auth } }) : null;
      if (!target) return quoteReply({ error: "Please re-enable reminders on this device.", reenable: true }, 409);
      const quote = dailyQuote(await getActiveQuotes(), quoteDay());
      if (!quote) return quoteReply({ error: "No quote is available right now. Please try again later." }, 503);
      const status = await sendEncryptedQuote(target, quotePayload(quote, quoteDay(), true), settings);
      if (status === "expired") {
        await database.rpc("disable_quote_subscription", { p_browser_hash: reader.hash });
        return quoteReply({ error: "Please re-enable reminders on this device.", reenable: true }, 409);
      }
      if (status !== "sent") return quoteReply({ error: "The test could not be sent. Please try again later." }, 503);
    }
    return rememberQuoteReader(quoteReply({ accepted: true }), reader.token);
  } catch { return quoteReply({ error: "We couldn’t confirm your reminder settings. Please try again." }, 503); }
}
