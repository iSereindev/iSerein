import Link from "next/link";
import { redirect } from "next/navigation";
import { getLatestPublishedArticle } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";

export const dynamic = "force-dynamic";

export default async function ReadingIndexPage() {
  const article = await getLatestPublishedArticle(getPublicationDate());

  if (!article) {
    return (
      <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-[#8C5F42]">
            iSEREIN
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
