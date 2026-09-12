import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return Response.json([]);
  }

  const articleIds = ids
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id));

  if (articleIds.length === 0) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, subtitle, topic, reading_time, published_date"
    )
    .in("id", articleIds)
    .order("published_date", { ascending: false });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data);
}