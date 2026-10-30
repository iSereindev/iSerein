import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";

export type Book = {
  id: string;
  title: string;
  author: string;
  edition: string | null;
  topic: string;
  description: string;
  affiliate_url: string;
  cover_url: string | null;
};

export type HomeQuote = { id: number; sentence: string; display_order: number };

export const getActiveBooks = unstable_cache(async (): Promise<Book[]> => {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, edition, topic, description, affiliate_url, cover_url")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`Unable to load the bookshelf: ${error.message}`);
  return data ?? [];
}, ["active-books-v1"], { revalidate: 60, tags: ["books"] });

export const getActiveQuotes = unstable_cache(async (): Promise<HomeQuote[]> => {
  const { data, error } = await supabase
    .from("home_quotes")
    .select("id, sentence, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}, ["active-home-quotes-v1"], { revalidate: 60, tags: ["home-quotes"] });
