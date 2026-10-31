export const QUOTE_UTC_HOUR = 1;
export const QUOTE_BODY_LIMIT = 220;

export type QuoteSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export type ReminderQuote = { id: number; sentence: string; display_order: number };

export function decodePushKey(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function validKey(value: unknown, length: number): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  try { const bytes = decodePushKey(value); return bytes.length === length && (length !== 65 || bytes[0] === 4); } catch { return false; }
}

export function allowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash && url.pathname.length > 1 && (
      host === "fcm.googleapis.com" || host === "android.googleapis.com" || host === "updates.push.services.mozilla.com"
      || host === "push.apple.com" || host.endsWith(".push.apple.com")
      || host === "notify.windows.com" || host.endsWith(".notify.windows.com")
    );
  } catch { return false; }
}

export function readQuoteSubscription(value: unknown): QuoteSubscription | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!input.keys || typeof input.keys !== "object") return null;
  const keys = input.keys as Record<string, unknown>;
  return allowedPushEndpoint(input.endpoint) && validKey(keys.p256dh, 65) && validKey(keys.auth, 16)
    ? { endpoint: input.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } } : null;
}

export function isQuoteOrigin(origin: string | null, host: string | null, site: string | null): boolean {
  if (!host || site === "cross-site") return false;
  if (!origin) return site === "same-origin";
  try {
    const source = new URL(origin), target = new URL(`${source.protocol}//${host}`);
    return ["http:", "https:"].includes(source.protocol) && source.origin === origin && source.origin === target.origin
      && !target.username && !target.password && target.pathname === "/";
  } catch { return false; }
}

export function quoteDay(now = new Date()): string { return now.toISOString().slice(0, 10); }

export function dailyQuote(quotes: readonly ReminderQuote[], day: string): ReminderQuote | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const stamp = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) return null;
  const ordered = quotes.filter(q => Number.isSafeInteger(q.id) && q.id > 0 && q.sentence.trim()).slice()
    .sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  return ordered.length ? ordered[Math.floor(stamp / 86400000) % ordered.length] : null;
}

export function quotePayload(quote: ReminderQuote, day: string, test = false) {
  const text = Array.from(quote.sentence.trim());
  return {
    type: "iserein-quote", title: test ? "iSEREIN · Test quote" : "iSEREIN · A thought for today",
    body: text.length > QUOTE_BODY_LIMIT ? text.slice(0, QUOTE_BODY_LIMIT - 1).join("") + "…" : text.join(""),
    url: `/?thought=${quote.id}#thoughts`, date: day, test,
  };
}

export function quoteTimeWindow(now = new Date(), locale?: string, timeZone?: string): string {
  const start = new Date(now); start.setUTCHours(QUOTE_UTC_HOUR, 0, 0, 0);
  if (start <= now) start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start.getTime() + 3600000);
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone });
  const zone = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone }).formatToParts(start).find(part => part.type === "timeZoneName")?.value || "";
  return `${formatter.format(start)}–${formatter.format(end)} ${zone}`.trim();
}
