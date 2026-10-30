import { getPublishedArticle } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { readingDescription } from "@/lib/reading-text";
import { shareImage } from "@/lib/share-image";

export const dynamic = "force-dynamic";
export const alt = "A reading from iSEREIN";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ReadingImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getPublishedArticle(id, getPublicationDate());
  if (!article) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return shareImage({
    title: article.title,
    topic: article.topic,
    description: readingDescription(article.content, article.subtitle),
  });
}
