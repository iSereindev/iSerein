export const VIEW_DELAY_MS = 3000;
export const MAX_VIEW_BODY_BYTES = 256;
export const REMINDER_COUNT_EVENT = "iserein-reminder-count-changed";

export function readingCountId(value: unknown): number | null {
  if (typeof value === "string" && !/^[1-9]\d{0,15}$/.test(value)) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function viewPayload(value: unknown): { articleId: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => key !== "articleId")) return null;
  const articleId = readingCountId(input.articleId);
  return articleId === null ? null : { articleId };
}

export function publicCount(value: unknown): number | null {
  if (typeof value === "string" && !/^(0|[1-9]\d{0,15})$/.test(value)) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function compactCount(count: number): string {
  return new Intl.NumberFormat("en", count >= 10000
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 }).format(count);
}

export function knownCountCrawler(agent: string | null): boolean {
  return /bot\b|crawler|spider|slurp|facebookexternalhit|bingpreview|google-inspectiontool|whatsapp/i.test(agent || "");
}

export function countDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function secondsUntilCountReset(now = new Date()): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.floor((midnight - now.getTime()) / 1000));
}
