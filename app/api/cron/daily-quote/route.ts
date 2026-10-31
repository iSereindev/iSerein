import { after, NextRequest } from "next/server";
import { getPushSettings, quoteReply, runDailyQuotes, validCronHeader } from "@/lib/quote-reminder-server";
import { quoteDay } from "@/lib/quote-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function schedule(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return quoteReply({ error: "Not configured." }, 503);
  if (!validCronHeader(request.headers.get("authorization"), secret)) return quoteReply({ error: "Unauthorized." }, 401);
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return quoteReply({ error: "Daily delivery only runs in production." }, 404);
  const settings = getPushSettings();
  if (!settings) return quoteReply({ error: "Not configured." }, 503);
  const day = request.nextUrl.searchParams.get("day") || quoteDay();
  const rawHop = request.nextUrl.searchParams.get("hop") || "0";
  if (day !== quoteDay() || !/^\d{1,2}$/.test(rawHop)) return quoteReply({ error: "Invalid delivery request." }, 400);
  after(async () => {
    try { await runDailyQuotes(settings, day, Number(rawHop)); }
    catch (error) { console.error("Daily quote delivery stopped:", error instanceof Error ? error.message : "delivery unavailable"); }
  });
  return quoteReply({ scheduled: true }, 202);
}

export function GET(request: NextRequest) { return schedule(request); }
export function POST(request: NextRequest) { return schedule(request); }
