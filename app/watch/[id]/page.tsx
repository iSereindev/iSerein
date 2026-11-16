import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BrandLogo from "@/app/BrandLogo";
import ExploreNavigation from "@/app/ExploreNavigation";
import { getPublishedVideo } from "@/lib/videos";
import { getPublicationDate } from "@/lib/publication";
import { pageMetadata } from "@/lib/site-metadata";
import VideoGallery from "../VideoGallery";
export const dynamic = "force-dynamic";
async function videoFor(params: Promise<{id:string}>) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const video = await getPublishedVideo(Number(id), getPublicationDate());
  if (!video) notFound();
  return video;
}
export async function generateMetadata({params}: {params:Promise<{id:string}>}): Promise<Metadata> {
  const video = await videoFor(params);
  return pageMetadata({title:video.title, description:video.caption || "Watch and join the conversation on iSEREIN.", path:`/watch/${video.id}`});
}
export default async function VideoPage({params}: {params:Promise<{id:string}>}) {
  const video = await videoFor(params);
  return <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
    <header className="mx-auto max-w-7xl px-6 py-6"><Link href="/" className="iserein-brand text-xl"><BrandLogo /></Link></header>
    <ExploreNavigation watch />
    <section className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/watch" className="mb-6 inline-block text-sm underline">← All videos</Link>
      <h1 className="mb-6 font-serif text-3xl">Watch & discuss</h1>
      <div id="discussion" className="scroll-mt-6"><VideoGallery videos={[video]} /></div>
    </section>
  </main>;
}
