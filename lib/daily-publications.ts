import "server-only";
import { supabase } from "./supabase";
import { getPublicationDate } from "./publication";

export type DailyReading = { id: number; title: string; topic: string; published_date: string; is_featured?: boolean };

export async function getDayReadings(day = getPublicationDate()): Promise<DailyReading[]> {
  const { data, error } = await supabase.from("articles").select("id,title,topic,published_date,is_featured")
    .eq("published_date", day).lte("published_date", getPublicationDate())
    .order("is_featured", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTomorrowTitles(): Promise<{ titles: string[]; total: number }> {
  const { data, error } = await supabase.rpc("tomorrow_reading_titles");
  if (error) throw new Error(error.message);
  return data;
}

export async function getBatchReadings(batch: string): Promise<DailyReading[]> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batch)) return [];
  const { data, error } = await supabase.rpc("notification_readings", { p_batch: batch });
  if (error) throw new Error(error.message);
  return data || [];
}
