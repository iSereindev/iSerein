import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ReadingIndexPage() {
  const today = new Date().toISOString().split("T")[0];

  const { data: article, error } = await supabase
    .from("articles")
    .select("id")
    .lte("published_date", today)
    .order("published_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

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
