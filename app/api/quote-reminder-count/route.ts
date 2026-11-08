import { NextResponse } from "next/server";
import { getReminderSubscriberCount } from "@/lib/reading-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ count: await getReminderSubscriberCount() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Count is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
