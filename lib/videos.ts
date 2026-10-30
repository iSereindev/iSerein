import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { youtubeVideoId } from "./youtube";

export const VIDEOS_PER_PAGE = 6;

export type WatchVideo = {
  id: number;
  title: string;
  caption: string | null;
  youtubeId: string;
};

export const getPublishedVideos = unstable_cache(
  async (today: string, page: number): Promise<{ videos: WatchVideo[]; total: number }> => {
    const from = (page - 1) * VIDEOS_PER_PAGE;
    const { data, count, error } = await supabase
      .from("videos")
      .select("id, title, caption, youtube_url", { count: "exact" })
      .eq("active", true)
      .lte("published_date", today)
      .order("published_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + VIDEOS_PER_PAGE - 1);

    if (error) throw new Error(`Unable to load videos: ${error.message}`);
    const videos = (data ?? []).flatMap((video) => {
      const youtubeId = youtubeVideoId(video.youtube_url);
      if (!youtubeId) {
        console.warn(`Skipping video ${video.id}: use a valid YouTube video link.`);
        return [];
      }
      return [{ id: video.id, title: video.title, caption: video.caption, youtubeId }];
    });
    return { videos, total: count ?? 0 };
  },
  ["published-videos-v1"],
  { revalidate: 60, tags: ["videos"] }
);
