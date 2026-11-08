import "server-only";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import { publicCount, countDay } from "@/lib/reading-counts";

const REMINDER_COUNT_TAG = "iserein-active-quote-subscriptions";

export class ReadingCountError extends Error {
  constructor(public status = 503) { super("Reading count unavailable"); }
}

export function countSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && secret ? { url, secret } : null;
}

export function countsDatabase() {
  const settings = countSettings();
  if (!settings) throw new ReadingCountError();
  return createClient(settings.url, settings.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (resource, options) => fetch(resource, { ...options, cache: "no-store", signal: AbortSignal.timeout(5000) }) },
  });
}

export function invalidateReadingCount(articleId: number) {
  try { revalidateTag(`reading-views:${articleId}`, { expire: 0 }); }
  catch { /* An optional count must not turn a successful view into an error. */ }
}

export function invalidateReminderCount() {
  try { revalidateTag(REMINDER_COUNT_TAG, { expire: 0 }); }
  catch { /* Subscription changes still succeed; the cache expires in 60 seconds. */ }
}

export async function getReadingViewCount(articleId: number): Promise<number> {
  const settings = countSettings();
  if (!settings) throw new ReadingCountError();
  return unstable_cache(async () => {
    const { data, error } = await countsDatabase().rpc("get_article_view_count", { p_article_id: articleId });
    if (error) throw new ReadingCountError(error.code === "P0002" ? 404 : 503);
    const count = publicCount(data);
    if (count === null) throw new ReadingCountError();
    return count;
  }, ["article-view-count-v1", settings.url, String(articleId), countDay()], {
    revalidate: 15, tags: [`reading-views:${articleId}`],
  })();
}

const cachedReminderCount = unstable_cache(async (url: string, publicKey: string) => {
  // Only an aggregate is requested; push endpoints, keys and browser hashes stay private.
  const settings = countSettings();
  if (!settings || settings.url !== url) throw new ReadingCountError();
  const { count, error } = await countsDatabase().from("quote_reminder_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true).eq("vapid_public_key", publicKey);
  if (error || publicCount(count) === null) throw new ReadingCountError();
  return count as number;
}, ["active-quote-subscriptions-v1"], { revalidate: 60, tags: [REMINDER_COUNT_TAG] });

export async function getReminderSubscriberCount(): Promise<number> {
  const settings = countSettings();
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!settings || !publicKey) throw new ReadingCountError();
  return cachedReminderCount(settings.url, publicKey);
}
