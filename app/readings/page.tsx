import Link from "next/link";
import { notFound } from "next/navigation";
import BrandLogo from "@/app/BrandLogo";
import ReadingDirectory from "@/app/ReadingDirectory";
import TopicReadingDirectory from "@/app/TopicReadingDirectory";
import { getBatchReadings, getDayReadings } from "@/lib/daily-publications";
import { getPublishedArticleIndex } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";

export const dynamic = "force-dynamic";
export const metadata = { title: "Readings · iSEREIN", robots: { index: false, follow: true } };

export default async function ReadingsPage({ searchParams }: { searchParams: Promise<{ batch?: string | string[]; day?: string | string[] }> }) {
  const { batch, day } = await searchParams;
  const today = getPublicationDate();
  if (day !== undefined && (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day || day > today)) notFound();
  const readings = typeof batch === "string" ? await getBatchReadings(batch)
    : typeof day === "string" ? await getDayReadings(day) : await getPublishedArticleIndex(today);
  if (batch !== undefined && (typeof batch !== "string" || !readings.length)) notFound();
  return <main className="min-h-screen bg-[#F6F0E8] px-6 py-8 text-[#33241D]">
    <header className="mx-auto flex max-w-4xl items-center justify-between">
      <Link href="/" aria-label="iSEREIN home"><BrandLogo /></Link><Link href="/topics" className="text-sm">All topics →</Link>
    </header>
    <section className="mx-auto max-w-4xl py-12">
      <h1 className="mb-8 font-serif text-4xl">{batch ? "Your new readings" : day === today ? "Today’s readings" : "Readings"}</h1>
      {batch ? <ReadingDirectory articles={readings} topic="readings" directLinks /> : <TopicReadingDirectory key={typeof day === "string" ? day : "all"} articles={readings} topic="All topics" directLinks />}
    </section>
  </main>;
}
