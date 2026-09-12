import { supabase } from "@/lib/supabase";
import SaveButton from "./SaveButton";
import PageTurnLink from "./PageTurnLink";

const topicStyles = {
  Self: {
    accent: "#C9787F",
    soft: "#F4E2E0",
  },
  Life: {
    accent: "#7E91B5",
    soft: "#E4EAF2",
  },
  Growth: {
    accent: "#8FA58A",
    soft: "#E5ECE2",
  },
};

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: article, error } = await supabase
    .from("articles")
    .select(
      "id, title, subtitle, content, topic, reading_time, published_date"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-[#FFF7F0] px-6 py-24 text-center text-[#44313D]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#D9828B]">
          iSEREIN
        </p>

        <h1 className="mt-6 font-serif text-3xl font-normal">
          This reading could not be found.
        </h1>

        <a
          href="/"
          className="mt-8 inline-block text-sm text-[#D9828B] transition hover:opacity-70"
        >
          Return home
        </a>
      </main>
    );
  }

  const topic =
    topicStyles[article.topic as keyof typeof topicStyles] ??
    topicStyles.Life;

  const paragraphs = article.content
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const { data: previousArticle } = await supabase
    .from("articles")
    .select("id, title")
    .lt("published_date", article.published_date)
    .order("published_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: nextArticle } = await supabase
    .from("articles")
    .select("id, title")
    .gt("published_date", article.published_date)
    .order("published_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#FFF7F0] text-[#44313D]">

      {/* Top navigation */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <a
          href="/"
          className="font-serif text-lg text-[#44313D] transition hover:text-[#D9828B]"
        >
          iSEREIN
        </a>

        <SaveButton articleId={article.id} />
      </div>

      {/* Reading area */}
      <article className="mx-auto max-w-5xl px-5 pb-16 md:px-8 md:pb-24">

        {/* Book page */}
        <div className="relative overflow-hidden rounded-[2rem] bg-[#FFFCF8] shadow-[0_25px_80px_rgba(68,49,61,0.10)]">

          {/* Soft decorative colour */}
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full blur-3xl"
            style={{
              backgroundColor: `${topic.accent}18`,
            }}
          />

          <div
            className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full blur-3xl"
            style={{
              backgroundColor: `${topic.soft}80`,
            }}
          />

          {/* Subtle book border */}
          <div className="pointer-events-none absolute inset-4 rounded-[1.5rem] border border-[#44313D]/[0.07] md:inset-7" />

          <div className="relative px-7 py-12 md:px-16 md:py-16 lg:px-24 lg:py-20">

            {/* Top metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: topic.accent }}
                />

                <span
                  className="text-xs font-medium uppercase tracking-[0.28em]"
                  style={{ color: topic.accent }}
                >
                  {article.topic}
                </span>
              </div>

              <span className="text-xs uppercase tracking-[0.18em] text-[#9B8D87]">
                {article.reading_time} min
              </span>
            </div>

            {/* Opening */}
            <header className="mx-auto max-w-4xl pt-20 text-center md:pt-28">

              <div
                className="mx-auto mb-8 flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: topic.soft,
                  color: topic.accent,
                }}
              >
                <span className="font-serif text-lg">✦</span>
              </div>

              <h1 className="font-serif text-4xl font-normal leading-[1.12] tracking-[-0.025em] text-[#44313D] md:text-6xl lg:text-7xl">
                {article.title}
              </h1>

              <p className="mx-auto mt-7 max-w-2xl font-serif text-lg leading-8 text-[#75686F] md:text-xl md:leading-9">
                {article.subtitle}
              </p>

              <div className="mx-auto mt-10 flex items-center justify-center gap-3">
                <span
                  className="h-px w-10"
                  style={{ backgroundColor: `${topic.accent}70` }}
                />

                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: topic.accent }}
                />

                <span
                  className="h-px w-10"
                  style={{ backgroundColor: `${topic.accent}70` }}
                />
              </div>
            </header>

            {/* Article */}
            <section className="mx-auto mt-20 max-w-2xl md:mt-28">

              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={`font-serif text-[1.08rem] leading-[2] text-[#4E444A] md:text-[1.17rem] md:leading-[2.05] ${
                    index === 0
                      ? "first-letter:float-left first-letter:mr-3 first-letter:mt-2 first-letter:font-serif first-letter:text-7xl first-letter:font-normal first-letter:leading-[0.75] first-letter:text-[#D9828B]"
                      : ""
                  } ${
                    index < paragraphs.length - 1
                      ? "mb-9 md:mb-10"
                      : ""
                  }`}
                >
                  {paragraph}
                </p>
              ))}

            </section>

            {/* Closing */}
            <div className="mx-auto mt-20 max-w-2xl border-t border-[#44313D]/10 pt-10 md:mt-24">

              <div className="flex flex-col items-center text-center">

                <div className="flex items-center gap-4">
                  <span
                    className="h-px w-12"
                    style={{ backgroundColor: `${topic.accent}70` }}
                  />

                  <span
                    className="text-lg"
                    style={{ color: topic.accent }}
                  >
                    ✦
                  </span>

                  <span
                    className="h-px w-12"
                    style={{ backgroundColor: `${topic.accent}70` }}
                  />
                </div>

                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#8B7A70]">
                  End of today&apos;s reading
                </p>

              </div>

            </div>

            {/* Previous / Next */}
            <div className="mx-auto mt-16 grid max-w-3xl gap-4 border-t border-[#44313D]/10 pt-8 md:grid-cols-2">

              {previousArticle ? (
                <PageTurnLink
                  href={`/reading/${previousArticle.id}`}
                  className="group rounded-2xl bg-[#F7F0E9] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#9B8D87]">
                    Previous
                  </span>

                  <p className="mt-3 font-serif text-lg leading-7 text-[#44313D]">
                    {previousArticle.title}
                  </p>

                  <span
                    className="mt-5 inline-block text-sm transition group-hover:-translate-x-1"
                    style={{ color: topic.accent }}
                  >
                    ← Previous page
                  </span>
                </PageTurnLink>
              ) : (
                <div />
              )}

              {nextArticle ? (
                <PageTurnLink
                  href={`/reading/${nextArticle.id}`}
                  className="group rounded-2xl bg-[#F7F0E9] p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-md md:text-right"
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#9B8D87]">
                    Next
                  </span>

                  <p className="mt-3 font-serif text-lg leading-7 text-[#44313D]">
                    {nextArticle.title}
                  </p>

                  <span
                    className="mt-5 inline-block text-sm transition group-hover:translate-x-1"
                    style={{ color: topic.accent }}
                  >
                    Next page →
                  </span>
                </PageTurnLink>
              ) : (
                <div />
              )}

            </div>

            {/* Back to topic */}
            <div className="mt-10 text-center">
              <a
                href={`/topics/${article.topic}`}
                className="text-sm text-[#8B7A70] transition hover:text-[#D9828B]"
              >
                ← Back to {article.topic}
              </a>
            </div>

          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="px-6 pb-10 text-center">
        <p className="text-xs tracking-[0.22em] text-[#A3938B]">
          READ SLOWLY · LIVE DEEPLY
        </p>
      </footer>
    </main>
  );
}