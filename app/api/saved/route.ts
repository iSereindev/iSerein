import { supabase } from "@/lib/supabase";
import { getPublicationDate } from "@/lib/publication";
import { readingText } from "@/lib/reading-text";

export const dynamic = "force-dynamic";

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

  const today = getPublicationDate();

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, subtitle, topic, reading_time, published_date"
    )
    .in("id", articleIds)
    .lte("published_date", today)
    .order("published_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data?.map((article) => ({
    ...article,
    subtitle: article.subtitle ? readingText(article.subtitle) : article.subtitle,
  })));
}
