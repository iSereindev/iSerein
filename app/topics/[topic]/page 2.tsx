import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPublishedArticleIndex } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { readingText } from "@/lib/reading-text";
import { getTopicName, topicDescriptions } from "@/lib/topics";
import { pageMetadata } from "@/lib/site-metadata";
import { getTopicTheme } from "@/lib/reading-theme";
import { shuffleArticleOrder } from "@/lib/article-shuffle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 6;

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const topic = getTopicName((await params).topic);
  if (!topic) notFound();
  return pageMetadata({ title: topic, description: topicDescriptions[topic], path: `/topics/${topic}` });
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{
    page?: string | string[];
    shuffle?: string | string[];
  }>;
}) {
  const { topic } = await params;
  const { page, shuffle } = await searchParams;
  const today = getPublicationDate();
  const topicName = getTopicName(topic);
  if (!topicName) notFound();

  const style = getTopicTheme(topicName);
  const seed =
    typeof shuffle === "string" && /^[0-9a-f]{32}$/i.test(shuffle)
      ? shuffle
      : randomUUID().replaceAll("-", "");

  const publishedIds = await getPublishedArticleIndex(today, topicName);

  const totalArticles = publishedIds.length;
  const totalPages = Math.ceil(totalArticles / PAGE_SIZE);
  const requestedPage = typeof page === "string" ? Number(page) : 1;
  const currentPage = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    Math.max(1, totalPages)
  );
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageIds = shuffleArticleOrder(publishedIds, `${topicName}:${seed}`)
    .slice(from, from + PAGE_SIZE)
    .map(({ id }) => id);

  const { data: pageArticles, error: pageError } = pageIds.length
    ? await supabase
        .from("articles")
        .select("id, title, subtitle, content, topic, reading_time, published_date")
        .eq("topic", topicName)
        .lte("published_date", today)
        .in("id", pageIds)
    : { data: [], error: null };

  if (pageError) throw new Error(pageError.message);

  // An IN query does not preserve the input order; restore the selected mix.
  const byId = new Map((pageArticles ?? []).map((article) => [article.id, article]));
  const articles = pageIds.flatMap((id) => {
    const article = byId.get(id);
    return article ? [article] : [];
  });

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
      {/* HEADER */}
      <header className="border-b border-[#33241D]/10 bg-[#F6F0E8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link
            href="/"
            className="iserein-brand text-xl"
          >
            iSEREIN
          </Link>

          <nav className="hidden items-center gap-10 text-sm text-[#75665C] md:flex">
            <Link
              href="/"
              className="transition-colors hover:text-[#805334]"
            >
              Today
            </Link>

            <Link
              href="/topics"
              className="transition-colors hover:text-[#805334]"
            >
              Topics
            </Link>

            <Link
              href="/saved"
              className="transition-colors hover:text-[#805334]"
            >
              Saved
            </Link>
          </nav>

          <Link
            href="/"
            className="text-sm text-[#75665C] transition-colors hover:text-[#805334]"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* TOPIC HERO */}
      <section
        className="px-6 py-8 md:py-32"
        style={{ backgroundColor: style.surface }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <Link
              href="/topics"
              className="text-sm text-[#33241D] transition-colors hover:text-[#33241D]"
            >
              ← All topics
            </Link>

            <div className="mt-4 flex items-center gap-4 md:mt-14">
              <span
                className="h-px w-12"
                style={{ backgroundColor: style.accent }}
              />

              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#33241D]">
                iSEREIN topic
              </p>
            </div>

            <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#33241D] md:mt-7 md:text-8xl">
              {topicName}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-[#33241D] md:mt-7 md:text-xl md:leading-8">
              Explore readings created for this part of your life.
            </p>
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="bg-[#F6F0E8] px-6 py-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between md:mb-12">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-[0.28em]"
                style={{ color: style.accent }}
              >
                The collection
              </p>

              <h2 className="mt-3 text-2xl font-light text-[#33241D] md:mt-4 md:text-4xl">
                Take your time.
              </h2>
            </div>

            <p className="hidden text-sm text-[#75665C] md:block">
              One page at a time.
            </p>
          </div>

          {articles && articles.length > 0 ? (
            <>
              <div className="grid gap-7 md:grid-cols-2">
                {articles.map((article, index) => (
                  <article
                    key={article.id}
                    className="group overflow-hidden rounded-[1.8rem] bg-[#FFFDF9] text-[#33241D] shadow-[0_12px_40px_rgba(51,36,29,0.065)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(51,36,29,0.10)]"
                  >
                    {/* Topic colour */}
                    <div
                      className="h-2"
                      style={{ backgroundColor: style.surface }}
                    />

                    <div className="p-8 md:p-10">
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#33241D]"
                          style={{ backgroundColor: style.surface }}
                        >
                          {article.topic}
                        </span>

                        <span className="text-sm text-[#75665C]">
                          {article.reading_time} min
                        </span>
                      </div>

                      <p
                        className="mt-8 text-xs font-medium tracking-[0.2em]"
                        style={{ color: style.accent }}
                      >
                        {String(from + index + 1).padStart(2, "0")}
                      </p>

                      <h3 className="mt-4 max-w-2xl text-3xl font-serif font-medium leading-tight text-[#33241D] md:text-4xl">
                        {article.title}
                      </h3>

                      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#75655C]">
                        {readingText(article.subtitle || "")}
                      </p>

                      <div className="my-8 flex items-center gap-3">
                        <span
                          className="h-px w-14"
                          style={{ backgroundColor: style.surface }}
                        />

                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: style.accent }}
                        />

                        <span className="h-px flex-1 bg-[#33241D]/10" />
                      </div>

                      <p className="max-w-2xl leading-8 text-[#594B42]">
                        {readingText(article.content.split("\n\n")[0])}
                      </p>

                      <div className="mt-9">
                        <Link
                          href={`/reading/${article.id}`}
                          className="inline-flex items-center rounded-full px-7 py-3.5 text-sm font-medium text-[#33241D] transition duration-200 hover:opacity-90"
                          style={{ backgroundColor: style.surface }}
                        >
                          Open reading →
                        </Link>
                      </div>
                    </div>

                    <div
                      className="border-t px-8 py-4 md:px-10"
                      style={{
                        borderColor: `${style.surface}20`,
                        backgroundColor: style.soft,
                      }}
                    >
                      <p
                        className="text-xs font-medium uppercase tracking-[0.2em]"
                        style={{ color: style.accent }}
                      >
                        A page worth keeping
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="mt-14 flex items-center justify-between border-t border-[#33241D]/10 pt-8">
                  <div>
                    {hasPreviousPage ? (
                      <Link
                        href={`/topics/${topic}?page=${currentPage - 1}&shuffle=${seed}`}
                        className="group inline-flex items-center gap-3 text-sm text-[#33241D] transition-colors hover:text-[#805334]"
                      >
                        <span className="transition-transform group-hover:-translate-x-1">
                          ←
                        </span>
                        Previous page
                      </Link>
                    ) : (
                      <span className="text-sm text-[#66574D]">
                        Previous page
                      </span>
                    )}
                  </div>

                  <div className="text-xs uppercase tracking-[0.2em] text-[#75665C]">
                    Page {currentPage} of {totalPages}
                  </div>

                  <div>
                    {hasNextPage ? (
                      <Link
                        href={`/topics/${topic}?page=${currentPage + 1}&shuffle=${seed}`}
                        className="group inline-flex items-center gap-3 text-sm text-[#33241D] transition-colors hover:text-[#805334]"
                      >
                        Next page
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    ) : (
                      <span className="text-sm text-[#66574D]">
                        Next page
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2rem] bg-[#FFFDF9] px-8 py-20 text-center text-[#33241D] shadow-[0_12px_40px_rgba(51,36,29,0.065)]">
              <p
                className="text-xs font-medium uppercase tracking-[0.25em]"
                style={{ color: style.accent }}
              >
                {topicName}
              </p>

              <h2 className="mt-5 font-serif text-3xl font-light md:text-4xl">
                No readings here yet.
              </h2>

              <p className="mx-auto mt-5 max-w-lg leading-7 text-[#75655C]">
                New pages for this topic will appear here as they are
                published.
              </p>

              <Link
                href="/"
                className="iserein-primary mt-8 inline-flex rounded-full px-7 py-3.5 text-sm font-medium text-[#FFF9F0]"
              >
                Back to today
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="iserein-dark-footer border-t border-[#33241D]/10 bg-[#5B3A2D] px-6 py-16 text-center">
        <p className="font-serif text-2xl italic text-[#FFF9F0]">
          Read slowly. Live deeply.
        </p>

        <div className="mx-auto my-6 h-px w-12 bg-[#A7784D]" />

        <p className="iserein-footer-brand">
          iSEREIN
        </p>
      </footer>
    </main>
  );
}
