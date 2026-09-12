import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 6;

const topicStyles = {
  Self: {
    background: "#6B2636",
    lightBackground: "#F1E4E7",
    accent: "#C8A96B",
  },
  Life: {
    background: "#173A70",
    lightBackground: "#E5EBF4",
    accent: "#C8A96B",
  },
  Growth: {
    background: "#0D3B33",
    lightBackground: "#E3ECE8",
    accent: "#C8A96B",
  },
};

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { topic } = await params;
  const { page } = await searchParams;

  const topicName =
    topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase();

  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const style =
    topicStyles[topicName as keyof typeof topicStyles] ?? {
      background: "#142132",
      lightBackground: "#E8EBEF",
      accent: "#C8A96B",
    };

  const { data: articles, error, count } = await supabase
    .from("articles")
    .select(
      "id, title, subtitle, content, topic, reading_time, published_date",
      { count: "exact" }
    )
    .eq("topic", topicName)
    .order("published_date", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalArticles = count ?? 0;
  const totalPages = Math.ceil(totalArticles / PAGE_SIZE);

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <main className="min-h-screen bg-[#0D1117] text-[#F4EFE3]">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#0D1117]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <a
            href="/"
            className="text-2xl font-semibold tracking-[0.22em] text-[#F4EFE3]"
          >
            iSEREIN
          </a>

          <nav className="hidden items-center gap-10 text-sm text-[#AEB8C5] md:flex">
            <a
              href="/"
              className="transition-colors hover:text-[#C8A96B]"
            >
              Today
            </a>

            <a
              href="/topics"
              className="transition-colors hover:text-[#C8A96B]"
            >
              Topics
            </a>

            <a
              href="/saved"
              className="transition-colors hover:text-[#C8A96B]"
            >
              Saved
            </a>
          </nav>

          <a
            href="/"
            className="text-sm text-[#AEB8C5] transition-colors hover:text-[#C8A96B]"
          >
            ← Home
          </a>
        </div>
      </header>

      {/* TOPIC HERO */}
      <section
        className="px-6 py-24 md:py-32"
        style={{ backgroundColor: style.background }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <a
              href="/topics"
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              ← All topics
            </a>

            <div className="mt-14 flex items-center gap-4">
              <span
                className="h-px w-12"
                style={{ backgroundColor: style.accent }}
              />

              <p className="text-xs font-medium uppercase tracking-[0.3em] text-white">
                iSEREIN topic
              </p>
            </div>

            <h1 className="mt-7 font-serif text-6xl font-medium tracking-tight text-white md:text-8xl">
              {topicName}
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/80 md:text-xl">
              Explore readings created for this part of your life.
            </p>
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="bg-[#0D1117] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-[0.28em]"
                style={{ color: style.accent }}
              >
                The collection
              </p>

              <h2 className="mt-4 text-3xl font-light text-[#F4EFE3] md:text-4xl">
                Take your time.
              </h2>
            </div>

            <p className="hidden text-sm text-[#8894A1] md:block">
              One page at a time.
            </p>
          </div>

          {articles && articles.length > 0 ? (
            <>
              <div className="grid gap-7 md:grid-cols-2">
                {articles.map((article, index) => (
                  <article
                    key={article.id}
                    className="group overflow-hidden rounded-[1.8rem] bg-[#F4EFE3] text-[#142132] shadow-[0_25px_70px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,0.32)]"
                  >
                    {/* Topic colour */}
                    <div
                      className="h-2"
                      style={{ backgroundColor: style.background }}
                    />

                    <div className="p-8 md:p-10">
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white"
                          style={{ backgroundColor: style.background }}
                        >
                          {article.topic}
                        </span>

                        <span className="text-sm text-[#7A8490]">
                          {article.reading_time} min
                        </span>
                      </div>

                      <p
                        className="mt-8 text-xs font-medium tracking-[0.2em]"
                        style={{ color: style.background }}
                      >
                        {String(from + index + 1).padStart(2, "0")}
                      </p>

                      <h3 className="mt-4 max-w-2xl text-3xl font-serif font-medium leading-tight text-[#142132] md:text-4xl">
                        {article.title}
                      </h3>

                      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#596675]">
                        {article.subtitle}
                      </p>

                      <div className="my-8 flex items-center gap-3">
                        <span
                          className="h-px w-14"
                          style={{ backgroundColor: style.background }}
                        />

                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: style.accent }}
                        />

                        <span className="h-px flex-1 bg-[#142132]/10" />
                      </div>

                      <p className="max-w-2xl leading-8 text-[#43505D]">
                        {article.content.split("\n\n")[0]}
                      </p>

                      <div className="mt-9">
                        <a
                          href={`/reading/${article.id}`}
                          className="inline-flex items-center rounded-full px-7 py-3.5 text-sm font-medium text-white transition duration-200 hover:opacity-90"
                          style={{ backgroundColor: style.background }}
                        >
                          Open reading →
                        </a>
                      </div>
                    </div>

                    <div
                      className="border-t px-8 py-4 md:px-10"
                      style={{
                        borderColor: `${style.background}20`,
                        backgroundColor: style.lightBackground,
                      }}
                    >
                      <p
                        className="text-xs font-medium uppercase tracking-[0.2em]"
                        style={{ color: style.background }}
                      >
                        A page worth keeping
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="mt-14 flex items-center justify-between border-t border-white/10 pt-8">
                  <div>
                    {hasPreviousPage ? (
                      <a
                        href={`/topics/${topic}?page=${currentPage - 1}`}
                        className="group inline-flex items-center gap-3 text-sm text-[#F4EFE3] transition-colors hover:text-[#C8A96B]"
                      >
                        <span className="transition-transform group-hover:-translate-x-1">
                          ←
                        </span>
                        Newer readings
                      </a>
                    ) : (
                      <span className="text-sm text-[#4F5965]">
                        Newer readings
                      </span>
                    )}
                  </div>

                  <div className="text-xs uppercase tracking-[0.2em] text-[#7E8996]">
                    Page {currentPage} of {totalPages}
                  </div>

                  <div>
                    {hasNextPage ? (
                      <a
                        href={`/topics/${topic}?page=${currentPage + 1}`}
                        className="group inline-flex items-center gap-3 text-sm text-[#F4EFE3] transition-colors hover:text-[#C8A96B]"
                      >
                        Older readings
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </a>
                    ) : (
                      <span className="text-sm text-[#4F5965]">
                        Older readings
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2rem] bg-[#F4EFE3] px-8 py-20 text-center text-[#142132] shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
              <p
                className="text-xs font-medium uppercase tracking-[0.25em]"
                style={{ color: style.background }}
              >
                {topicName}
              </p>

              <h2 className="mt-5 font-serif text-3xl font-light md:text-4xl">
                No readings here yet.
              </h2>

              <p className="mx-auto mt-5 max-w-lg leading-7 text-[#596675]">
                New pages for this topic will appear here as they are
                published.
              </p>

              <a
                href="/"
                className="mt-8 inline-flex rounded-full bg-[#142132] px-7 py-3.5 text-sm font-medium text-[#F4EFE3]"
              >
                Back to today
              </a>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#0D1117] px-6 py-16 text-center">
        <p className="font-serif text-2xl italic text-[#F4EFE3]">
          Read slowly. Live deeply.
        </p>

        <div className="mx-auto my-6 h-px w-12 bg-[#C8A96B]" />

        <p className="text-xs tracking-[0.25em] text-[#F4EFE3]">
          iSEREIN
        </p>
      </footer>
    </main>
  );
}