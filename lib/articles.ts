import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";

export type Article = {
  id: number;
  title: string;
  subtitle: string | null;
  content: string;
  topic: string;
  reading_time: number | null;
  published_date: string;
};

const articleFields = "id, title, subtitle, content, topic, reading_time, published_date";
const cacheOptions = { revalidate: 60, tags: ["articles"] };

const loadArticle = unstable_cache(
  async (id: number, today: string): Promise<Article | null> => {
    const { data, error } = await supabase
      .from("articles")
      .select(articleFields)
      .eq("id", id)
      .lte("published_date", today)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  ["published-article-v1"],
  cacheOptions
);

// Metadata, the route layout, and the reading share one lookup per request.
export const getPublishedArticle = cache(async (value: string, today: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id)) return null;
  return loadArticle(id, today);
});

export const getLatestPublishedArticle = unstable_cache(
  async (today: string): Promise<Article | null> => {
    const { data, error } = await supabase
      .from("articles")
      .select(articleFields)
      .lte("published_date", today)
      .order("published_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  ["latest-published-article-v1"],
  cacheOptions
);

export const getArticleNeighbours = unstable_cache(
  async (id: number, date: string, today: string) => {
    // Date + ID gives every reading a place, including several on the same day.
    const [previous, next] = await Promise.all([
      supabase
        .from("articles")
        .select("id, title")
        .lte("published_date", today)
        .or(`published_date.lt.${date},and(published_date.eq.${date},id.lt.${id})`)
        .order("published_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("articles")
        .select("id, title")
        .lte("published_date", today)
        .or(`published_date.gt.${date},and(published_date.eq.${date},id.gt.${id})`)
        .order("published_date", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (previous.error) throw new Error(previous.error.message);
    if (next.error) throw new Error(next.error.message);
    return { previousArticle: previous.data, nextArticle: next.data };
  },
  ["published-reading-neighbours-v1"],
  cacheOptions
);

export const getPublishedArticleIndex = unstable_cache(
  async (today: string, topic?: string) => {
    const articles: Pick<Article, "id" | "published_date">[] = [];
    while (true) {
      const offset = articles.length;
      let query = supabase
        .from("articles")
        .select("id, published_date", { count: "exact" })
        .lte("published_date", today)
        .order("published_date", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + 499);
      if (topic) query = query.eq("topic", topic);
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      articles.push(...data);
      if (count !== null ? articles.length >= count : data.length < 500) break;
    }
    return articles;
  },
  ["published-article-index-v1"],
  cacheOptions
);
