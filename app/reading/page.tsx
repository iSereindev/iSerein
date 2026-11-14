import { getDayReadings } from "@/lib/daily-publications";
import Link from "next/link";
import BrandLogo from "@/app/BrandLogo";
import { redirect } from "next/navigation";
import { getLatestPublishedArticle } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";

export const dynamic = "force-dynamic";

export default async function ReadingIndexPage() {
  const today = getPublicationDate();
  const readings = await getDayReadings(today);
  if (readings.length) redirect(`/reading/${readings[0].id}`);
  const article = await getLatestPublishedArticle(today);

  if (!article) {
    return (
      <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-[#8C5F42]">
            <BrandLogo />
          </p>

          <h1 className="mt-5 text-3xl font-light">
            No reading is published yet.
          </h1>

          <Link
            href="/"
            className="mt-8 inline-block text-[#6B6157]"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  redirect(`/reading/${article.id}`);
}
