import Link from "next/link";
import { notFound } from "next/navigation";
import BrandLogo from "@/app/BrandLogo";
import ReadingDirectory from "@/app/ReadingDirectory";
import { getBatchReadings, getDayReadings } from "@/lib/daily-publications";
import { getLatestPublishedArticle } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";

export const dynamic = "force-dynamic";
export const metadata = { title: "New readings · iSEREIN", robots: { index: false, follow: true } };

export default async function ReadingsPage({ searchParams }: { searchParams: Promise<{ batch?: string | string[] }> }) {
  const { batch } = await searchParams;
  const today = getPublicationDate();
  let readings = typeof batch === "string" ? await getBatchReadings(batch) : await getDayReadings(today);
  if (batch !== undefined && (typeof batch !== "string" || !readings.length)) notFound();
  let latest = false;
  if (!batch && !readings.length) {
    const article = await getLatestPublishedArticle(today);
    readings = article ? await getDayReadings(article.published_date) : [];
    latest = true;
  }
  return <main className="min-h-screen bg-[#F6F0E8] px-6 py-8 text-[#33241D]">
    <header className="mx-auto flex max-w-4xl items-center justify-between">
      <Link href="/" aria-label="iSEREIN home"><BrandLogo /></Link><Link href="/topics" className="text-sm">All topics →</Link>
    </header>
    <section className="mx-auto max-w-4xl py-12">
      <h1 className="mb-8 font-serif text-4xl">{batch ? "Your new readings" : latest ? "Latest readings" : "Today’s readings"}</h1>
      <ReadingDirectory articles={readings} topic="readings" directLinks />
    </section>
  </main>;
}
