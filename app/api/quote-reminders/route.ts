import { validReadSyncIds } from "@/lib/reminder-read-sync";
import { getDayReadings } from "@/lib/daily-publications";
import { digestPayload } from "@/lib/article-digest";
import { readingPayload } from "@/lib/daily-reminders";
import { getLatestPublishedArticle } from "@/lib/articles";
import { readReminderSchedule } from "@/lib/reminder-schedule";
import { NextRequest } from "next/server";
import { isQuoteOrigin, quoteDay } from "@/lib/quote-reminders";
import { endpointHash, getPushSettings, quoteDatabase, quoteJson, quoteReader, quoteReply, rememberQuoteReader, sendEncryptedQuote, validCurveSubscription } from "@/lib/quote-reminder-server";
import { invalidateReminderCount } from "@/lib/reading-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const settings = getPushSettings();
  if (!settings) return quoteReply({ ready: false });
  const reader = quoteReader(request, settings);
  let enabled: boolean | null = null;
  let localTime: string | undefined, timeZone: string | undefined;
  let kind: string | undefined;
  if (reader.existing) {
    const { data, error } = await quoteDatabase(settings).from("quote_reminder_subscriptions").select("enabled, vapid_public_key, reminder_time, time_zone, reminder_kind").eq("browser_hash", reader.hash).maybeSingle();
    if (error) return quoteReply({ error: "Reminders are unavailable right now. Please try again later." }, 503);
    localTime = data?.reminder_time?.slice(0, 5); timeZone = data?.time_zone; kind = data?.reminder_kind;
    enabled = data ? data.enabled && data.vapid_public_key === settings.publicKey : false;
  }
  const status = await quoteDatabase(settings).rpc("reminder_scheduler_status");
  if (status.error) return quoteReply({ ready: false });
  return rememberQuoteReader(quoteReply({ ready: true, publicKey: settings.publicKey, enabled, localTime, timeZone, kind, scheduleReady: status.data === true }), reader.token);
}

export async function POST(request: NextRequest) {
  if (!isQuoteOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) return quoteReply({ error: "Please manage reminders from iSEREIN." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return quoteReply({ error: "Invalid request." }, 415);
  let input: unknown;
  try { input = await quoteJson(request); } catch (error) { return quoteReply({ error: "Please send a valid reminder request." }, error instanceof RangeError ? 413 : 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return quoteReply({ error: "Invalid request." }, 400);
  const body = input as Record<string, unknown>;
  if (typeof body.action !== "string" || !["subscribe", "disable", "test", "sync-timezone", "sync-read-history"].includes(body.action)) return quoteReply({ error: "Invalid request." }, 400);
  if (body.action === "sync-read-history" && !validReadSyncIds(body.readIds)) return quoteReply({ error: "Invalid reading history." }, 400);
  const schedule = readReminderSchedule({ ...body, localTime: "09:00" });
  if ((body.action === "subscribe" || body.action === "sync-timezone") && !schedule) return quoteReply({ error: "Your device time zone could not be confirmed. Please try again." }, 400);
  const kind = "reading";
  const subscription = body.subscription ? validCurveSubscription(body.subscription) : null;
  if (body.action === "subscribe" && !subscription) return quoteReply({ error: "This browser’s push service could not be registered. Please try a supported browser." }, 400);
  const settings = getPushSettings();
  if (!settings) return quoteReply({ error: "Reminders are unavailable right now. Please try again later." }, 503);
  const reader = quoteReader(request, settings);
  if (!reader.existing) return quoteReply({ error: "Please reopen reminder settings and try again. Cookies must be allowed for this site." }, 400);
  const database = quoteDatabase(settings);
  try {
    const rate = body.action === "sync-read-history"
      ? await database.rpc("limit_read_history_sync", { p_browser_hash: reader.hash, p_network_hash: reader.network })
      : await database.rpc("limit_quote_requests", { p_browser_hash: reader.hash, p_network_hash: reader.network, p_action: body.action === "sync-timezone" ? "subscribe" : body.action });
    if (rate.error) return quoteReply({ error: rate.error.code === "PT429" ? "Please wait a while before trying again." : "Reminders are unavailable right now." }, rate.error.code === "PT429" ? 429 : 503);
    if (body.action === "subscribe" && subscription) {
      const { error } = await database.rpc("save_daily_reminder", { p_browser_hash: reader.hash, p_endpoint_hash: endpointHash(subscription.endpoint), p_endpoint: subscription.endpoint, p_p256dh: subscription.keys.p256dh, p_auth: subscription.keys.auth, p_vapid_public_key: settings.publicKey, p_time_zone: schedule!.timeZone, p_reminder_kind: kind });
      if (error) return quoteReply({ error: "Your reminder could not be enabled. Please try again." }, 503);
    } else if (body.action === "sync-read-history") {
      const { error } = await database.rpc("sync_reminder_reads", { p_browser_hash: reader.hash, p_ids: body.readIds });
      if (error) return quoteReply({ error: "Reading history could not be synced." }, 503);
    } else if (body.action === "sync-timezone") {
      // Ownership is cookie-bound. This update cannot enable a disabled subscription,
      // replace its content preference, or clear a delivery claim.
      const { error } = await database.from("quote_reminder_subscriptions")
        .update({ reminder_time: "09:00", time_zone: schedule!.timeZone })
        .eq("browser_hash", reader.hash).eq("enabled", true);
      if (error) return quoteReply({ error: "Your time zone could not be updated." }, 503);
    } else if (body.action === "disable") {
      const { error } = await database.rpc("disable_reading_reminder", { p_browser_hash: reader.hash, p_endpoint_hash: subscription ? endpointHash(subscription.endpoint) : null, p_p256dh: subscription?.keys.p256dh || null, p_auth: subscription?.keys.auth || null });
      if (error) return quoteReply({ error: "We couldn’t confirm reminders are off. Please try again." }, 503);
    } else if (body.action === "test") {
      const { data, error } = await database.from("quote_reminder_subscriptions").select("endpoint,p256dh,auth,enabled,vapid_public_key,reminder_kind").eq("browser_hash", reader.hash).maybeSingle();
      if (error) return quoteReply({ error: "The test could not be sent. Please try again later." }, 503);
      const target = data?.enabled && data.vapid_public_key === settings.publicKey ? validCurveSubscription({ endpoint: data.endpoint, keys: { p256dh: data.p256dh, auth: data.auth } }) : null;
      if (!target) return quoteReply({ error: "Please re-enable reminders on this device.", reenable: true }, 409);
      const day = quoteDay();
      const readings = await getDayReadings(day);
      const article = readings[0] || await getLatestPublishedArticle(day);
      const payload = readings.length > 1
        ? { ...digestPayload({ digest_id: "", article_count: readings.length, first_id: readings[0].id, first_title: readings[0].title }, day, true), url: "/readings" }
        : article ? readingPayload(article, day, true) : null;
      if (!payload) return quoteReply({ error: "No content is available right now. Please try again later." }, 503);
      const status = await sendEncryptedQuote(target, payload, settings);
      if (status === "expired") {
        await database.rpc("disable_reading_reminder", { p_browser_hash: reader.hash });
        invalidateReminderCount();
        return quoteReply({ error: "Please re-enable reminders on this device.", reenable: true }, 409);
      }
      if (status !== "sent") return quoteReply({ error: "The test could not be sent. Please try again later." }, 503);
    }
    if (body.action === "subscribe" || body.action === "disable") invalidateReminderCount();
    return rememberQuoteReader(quoteReply({ accepted: true }), reader.token);
  } catch { return quoteReply({ error: "We couldn’t confirm your reminder settings. Please try again." }, 503); }
}
