import Link from "next/link";
import { getPublicationDate } from "@/lib/publication";
import { pageMetadata } from "@/lib/site-metadata";
import { getPublishedVideos, VIDEOS_PER_PAGE } from "@/lib/videos";
import VideoGallery from "./VideoGallery";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Watch",
  description: "Short videos for a different perspective. Watch a little, take a thought with you, and return to your day.",
  path: "/watch",
});

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page } = await searchParams;
  const requested = typeof page === "string" && /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1;
  const { videos, total } = await getPublishedVideos(getPublicationDate(), requested);
  const totalPages = Math.max(1, Math.ceil(total / VIDEOS_PER_PAGE));

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
      <header className="border-b border-[#33241D]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 md:px-10">
          <Link href="/" className="iserein-brand text-xl">iSEREIN</Link>
          <span className="text-xs uppercase tracking-[0.2em] text-[#75665C]">Short films</span>
        </div>
      </header>

      <section className="px-6 pb-8 pt-8 md:px-10 md:pb-12 md:pt-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-serif text-5xl font-normal tracking-tight md:text-7xl">Watch</h1>
          <p className="mt-4 max-w-xl font-serif text-lg leading-8 text-[#75665C] md:text-xl">
            Short videos for a different perspective.
          </p>
        </div>
      </section>

      <section aria-label="Short videos" className="px-6 pb-16 md:px-10 md:pb-24">
        <div className="mx-auto max-w-7xl">
          {videos.length > 0 ? (
            <VideoGallery key={requested} videos={videos} />
          ) : (
            <div className="rounded-[1.75rem] border border-[#33241D]/10 bg-[#FFFDF9] px-6 py-12 text-center">
              <h2 className="font-serif text-3xl font-normal">
                {requested > 1 ? "No videos on this page." : "A new perspective is on its way."}
              </h2>
              <p className="mt-4 leading-7 text-[#75665C]">
                {requested > 1 ? "Return to the latest videos." : "Our first short films will appear here soon."}
              </p>
              <Link href={requested > 1 ? "/watch" : "/topics"} className="iserein-primary mt-6 rounded-full px-6 py-3 text-sm">
                {requested > 1 ? "Latest videos" : "Explore the readings"} <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {totalPages > 1 && requested <= totalPages && (
            <nav aria-label="Video pages" className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#33241D]/10 pt-6 text-sm">
              {requested > 1 ? (
                <Link href={requested === 2 ? "/watch" : `/watch?page=${requested - 1}`} className="iserein-save-button rounded-full px-5 py-3">
                  <span aria-hidden="true">←</span> Newer videos
                </Link>
              ) : <span />}
              <span className="text-[#75665C]">Page {requested} of {totalPages}</span>
              {requested < totalPages ? (
                <Link href={`/watch?page=${requested + 1}`} className="iserein-save-button rounded-full px-5 py-3">
                  Older videos <span aria-hidden="true">→</span>
                </Link>
              ) : <span />}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
