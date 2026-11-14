import ReadingEnding from "@/app/ReadingEnding";
import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/app/BrandLogo";
import ReadingViews from "@/app/ReadingViews";
import { notFound } from "next/navigation";
import { getPublishedArticle, getArticleNeighbours } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { pageMetadata, SITE_URL } from "@/lib/site-metadata";
import { readingDescription, readingText } from "@/lib/reading-text";
import { getTopicTheme } from "@/lib/reading-theme";
import SaveButton from "./SaveButton";
import ShareButton from "./ShareButton";
import PageTurnLink from "./PageTurnLink";
import ReadingContent from "./ReadingContent";
import ArticleFeedback from "./ArticleFeedback";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = await getPublishedArticle(id, getPublicationDate());
  if (!article) notFound();
  return pageMetadata({
    title: article.title,
    description: readingDescription(article.content || "", article.subtitle),
    path: `/reading/${article.id}`,
    article: true,
    image: `/reading/${article.id}/opengraph-image`,
  });
}

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const today = getPublicationDate();
  const article = await getPublishedArticle(id, today);
  if (!article) notFound();

  const topic = getTopicTheme(article.topic);

  const content: string =
    typeof article.content === "string" ? article.content : "";

  const { previousArticle, nextArticle } = await getArticleNeighbours(
    article.id, article.published_date, today
  );

  return (
    <main className="min-h-screen bg-[#FFF9F0] text-[#33241D]">
      {/* Top navigation */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="iserein-brand text-lg"
        >
          <BrandLogo />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <SaveButton articleId={article.id} />
          <ShareButton key={article.id} title={article.title} url={`${SITE_URL}/reading/${article.id}`} />
        </div>
      </div>

      {/* Reading area */}
      <article className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        {/* Book page */}
        <div className="relative overflow-hidden rounded-[2rem] bg-[#FFFCF8] shadow-[0_16px_52px_rgba(51,36,29,0.065)]">
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
          <div className="pointer-events-none absolute inset-4 rounded-[1.5rem] border border-[#33241D]/[0.07] md:inset-7" />

          <div className="relative px-6 py-12 sm:px-10 md:px-16 md:py-16 lg:px-24 lg:py-20">
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

              <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-[#75665C]">
                  {article.reading_time} min
                </span>
                <ReadingViews key={article.id} articleId={article.id} separator />
              </div>
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

              <h1 className="font-serif text-4xl font-normal leading-[1.12] tracking-[-0.025em] text-[#33241D] md:text-6xl lg:text-7xl">
                {article.title}
              </h1>

              <p className="mx-auto mt-7 max-w-2xl font-serif text-lg leading-8 text-[#6B5D54] md:text-xl md:leading-9">
                {readingText(article.subtitle || "")}
              </p>

              <div className="mx-auto mt-10 flex items-center justify-center gap-3">
                <span
                  className="h-px w-10"
                  style={{
                    backgroundColor: `${topic.accent}70`,
                  }}
                />

                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: topic.accent,
                  }}
                />

                <span
                  className="h-px w-10"
                  style={{
                    backgroundColor: `${topic.accent}70`,
                  }}
                />
              </div>
            </header>

            {/* Article */}
            <section className="iserein-reading-copy mx-auto mt-20 max-w-2xl md:mt-28">
              <ReadingContent content={content} />
            </section>

            <ArticleFeedback key={article.id} articleId={article.id} />

            <ReadingEnding key={article.id} articleId={article.id} isToday={article.published_date === today} today={today} />

            <nav aria-label="Other readings" className="mx-auto mt-8 flex max-w-2xl justify-between gap-6 border-t border-[#33241D]/10 pt-4 text-sm">
              {previousArticle ? <PageTurnLink href={`/reading/${previousArticle.id}`} className="min-h-11 py-3">← Previous page</PageTurnLink> : <span />}
              {nextArticle && <PageTurnLink href={`/reading/${nextArticle.id}`} className="min-h-11 py-3">Next page →</PageTurnLink>}
            </nav>

            {/* Back to topic */}
            <div className="mt-10 text-center">
              <Link
                href={`/topics/${article.topic}`}
                className="text-sm text-[#806E63] transition hover:text-[#805334]"
              >
                ← Back to {article.topic}
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="px-6 pb-10 text-center">
        <p className="text-xs tracking-[0.22em] text-[#75665C]">
          READ SLOWLY · LIVE DEEPLY
        </p>
      </footer>
    </main>
  );
}
