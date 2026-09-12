import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
      <main className="min-h-screen bg-[#eef5f7] text-[#29434c]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-[#78929b]">
            iSEREIN
          </p>

          <h1 className="mt-5 text-3xl font-light">
            No reading is published yet.
          </h1>

          <a
            href="/"
            className="mt-8 inline-block text-[#416d7b]"
          >
            Back to home
          </a>
        </div>
      </main>
    );
  }

  redirect(`/reading/${article.id}`);
}