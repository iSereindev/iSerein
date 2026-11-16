import { timingSafeEqual } from "node:crypto";
import { sendDiscussionEmails } from "@/lib/discussion-email";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return reply({ error: "CRON_SECRET is not configured." }, 503);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply({ error: "Unauthorized." }, 401);
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return reply({ error: "Delivery is disabled on preview deployments." }, 403);
  try { return reply(await sendDiscussionEmails()); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : "Reply email delivery unavailable." }, 503); }
}
