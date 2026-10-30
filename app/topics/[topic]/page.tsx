import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedArticle, getPublishedArticleIndex } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { readingText } from "@/lib/reading-text";
import { getTopicName, topicDescriptions } from "@/lib/topics";
import { pageMetadata, SITE_URL } from "@/lib/site-metadata";
import { getTopicTheme } from "@/lib/reading-theme";
import { shuffleArticleOrder } from "@/lib/article-shuffle";
import { topicDeckPosition, topicReadingHref } from "@/lib/topic-deck";
import ReadingContent from "@/app/reading/[id]/ReadingContent";
import SaveButton from "@/app/reading/[id]/SaveButton";
import ShareButton from "@/app/reading/[id]/ShareButton";
import ReadingStack from "./ReadingStack";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const topic = getTopicName((await params).topic);
  if (!topic) notFound();
  return pageMetadata({ title: topic, description: topicDescriptions[topic], path: `/topics/${topic}` });
}

export default async function TopicPage({ params, searchParams }: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ reading?: string | string[]; page?: string | string[]; shuffle?: string | string[] }>;
}) {
  const topic = getTopicName((await params).topic);
  if (!topic) notFound();
  const { reading, page, shuffle } = await searchParams;
  const today = getPublicationDate();
  const theme = getTopicTheme(topic);
  const seed = typeof shuffle === "string" && /^[0-9a-f]{32}$/i.test(shuffle)
    ? shuffle : randomUUID().replaceAll("-", "");
  const published = await getPublishedArticleIndex(today, topic);
  const ids = shuffleArticleOrder(published, `${topic}:${seed}`).map(({ id }) => id);
  const position = topicDeckPosition(ids, reading, page);
  const selected = ids[position] ? await getPublishedArticle(String(ids[position]), today) : null;
  // Never display a reading that moved to another topic while the index was cached.
  const article = selected?.topic === topic ? selected : null;
  const href = (index: number) => topicReadingHref(topic, ids[index], seed);

  return (
    <main className="iserein-topic-page min-h-screen bg-[#F6F0E8] text-[#33241D]" style={{
      "--topic-surface": theme.surface, "--topic-soft": theme.soft, "--topic-accent": theme.accent,
    } as CSSProperties}>
      <header className="border-b border-[#33241D]/10 bg-[#F6F0E8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="iserein-brand text-xl">iSEREIN</Link>
          <nav aria-label="Topic navigation" className="hidden items-center gap-10 text-sm text-[#75665C] md:flex">
            <Link href="/" className="transition-colors hover:text-[#805334]">Today</Link>
            <Link href="/topics" className="transition-colors hover:text-[#805334]">Topics</Link>
            <Link href="/saved" className="transition-colors hover:text-[#805334]">Saved</Link>
          </nav>
          <Link href="/" className="text-sm text-[#75665C] transition-colors hover:text-[#805334]">← Home</Link>
        </div>
      </header>

      <section className="px-6 py-6 md:py-10" style={{ backgroundColor: theme.surface }}>
        <div className="mx-auto max-w-4xl">
          <Link href="/topics" className="text-sm text-[#33241D]">← All topics</Link>
          <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight md:text-6xl">{topic}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 md:text-base">Explore readings created for this part of your life.</p>
        </div>
      </section>

      <section className="px-6 pb-16 pt-5 md:pb-24 md:pt-8" aria-label={`${topic} reading collection`}>
        <div className="mx-auto max-w-4xl">
          {article ? (
            <ReadingStack
              articleId={article.id}
              title={article.title}
              topic={topic}
              currentHref={href(position)}
              previousHref={ids.length > 1 ? href((position - 1 + ids.length) % ids.length) : null}
              nextHref={ids.length > 1 ? href((position + 1) % ids.length) : null}
              underneath={Math.min(2, ids.length - 1)}
            >
              <article className="iserein-stack-article" aria-labelledby={`reading-title-${article.id}`}>
                <div className="iserein-stack-meta">
                  <span>{topic}</span>
                  {article.reading_time && <span>{article.reading_time} min</span>}
                </div>
                <header>
                  <h2 id={`reading-title-${article.id}`} className="iserein-stack-title">{article.title}</h2>
                  {article.subtitle && <p className="iserein-stack-subtitle">{readingText(article.subtitle)}</p>}
                </header>
                <div className="iserein-stack-actions">
                  <SaveButton key={`save-${article.id}`} articleId={article.id} />
                  <ShareButton key={`share-${article.id}`} title={article.title} url={`${SITE_URL}/reading/${article.id}`} />
                </div>
                <section className="iserein-reading-copy iserein-stack-copy" aria-label="Reading text">
                  <ReadingContent content={article.content || ""} />
                </section>
                <div className="iserein-stack-ending">
                  <p>Read slowly. Stay awhile.</p>
                  <Link href={`/reading/${article.id}`} className="text-sm text-[#805334] underline underline-offset-4">Open this reading <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            </ReadingStack>
          ) : (
            <div className="rounded-[2rem] bg-[#FFFDF9] px-6 py-16 text-center shadow-[0_12px_40px_rgba(51,36,29,0.065)]">
              <h2 className="font-serif text-3xl font-normal">No readings here yet.</h2>
              <p className="mx-auto mt-5 max-w-lg leading-7 text-[#75665C]">New pages for this topic will appear here as they are published.</p>
              <Link href="/" className="iserein-primary mt-8 rounded-full px-7 py-3.5 text-sm">Back to today</Link>
            </div>
          )}
        </div>
      </section>

      <footer className="iserein-dark-footer border-t border-[#33241D]/10 bg-[#5B3A2D] px-6 py-12 text-center">
        <p className="font-serif text-xl italic text-[#FFF9F0]">Read slowly. Live deeply.</p>
        <p className="iserein-footer-brand">iSEREIN</p>
      </footer>
    </main>
  );
}
