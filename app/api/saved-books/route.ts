import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const responseHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get("ids");

  if (!rawIds?.trim()) {
    return NextResponse.json([], {
      headers: responseHeaders,
    });
  }

  const ids = [
    ...new Set(
      rawIds.split(",").map((id) => id.trim().toLowerCase())
    ),
  ];

  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    return NextResponse.json(
      { error: "Invalid book IDs." },
      {
        status: 400,
        headers: responseHeaders,
      }
    );
  }

  try {
    const { data, error } = await supabase
      .from("books")
      .select(
        "id, title, author, edition, topic, description, affiliate_url, cover_url"
      )
      .in("id", ids)
      .eq("active", true);

    if (error) {
      throw error;
    }

    return NextResponse.json(data ?? [], {
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load saved books. Please try again." },
      {
        status: 500,
        headers: responseHeaders,
      }
    );
  }
}