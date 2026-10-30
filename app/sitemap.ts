import type { MetadataRoute } from "next";
import { getPublishedArticleIndex } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { SITE_URL } from "@/lib/site-metadata";
import { topicNames } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticleIndex(getPublicationDate());
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...["/topics", "/explore", "/about", "/install"].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...topicNames.map((topic) => ({ url: `${SITE_URL}/topics/${topic}`, changeFrequency: "daily" as const })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/reading/${article.id}`,
      lastModified: article.published_date,
      changeFrequency: "monthly" as const,
    })),
  ];
}
