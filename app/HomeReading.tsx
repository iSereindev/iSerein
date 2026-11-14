import { getDayReadings, getTomorrowTitles, type DailyReading } from "@/lib/daily-publications";
import QuoteReminders from "./QuoteReminders";
import Link from "next/link";
import { getLatestPublishedArticle, getPublishedArticle, type Article } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import { readingText } from "@/lib/reading-text";
import { getTopicTheme } from "@/lib/reading-theme";
import SaveButton from "./reading/[id]/SaveButton";

function ReadingUnavailable({ failed = false }: { failed?: boolean }) {
  return (
    <article className="iserein-home-reading iserein-home-reading-empty">
      <p className="iserein-home-eyebrow">Today&apos;s reading</p>
      <h2>{failed ? "A little pause, not a dead end." : "A new page is on its way."}</h2>
      <p>
        {failed
          ? "We couldn’t open today’s page. You can try again or explore a topic."
          : "In the meantime, explore a topic and find a page that speaks to you."}
      </p>
      <div className="iserein-home-actions">
        <Link href="/topics" className="iserein-primary iserein-home-button">
          Explore topics <span aria-hidden="true">→</span>
        </Link>
        {failed && (
          <Link href="/reading" className="iserein-home-text-link">
            Try today&apos;s page
          </Link>
        )}
      </div>
    </article>
  );
}

export function HomeReadingSkeleton() {
  return (
    <div className="iserein-home-reading iserein-home-reading-loading" role="status" aria-busy="true">
      <p className="iserein-home-eyebrow">Today&apos;s reading</p>
      <div className="iserein-home-skeleton-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="iserein-home-reading-note">Opening today&apos;s page…</p>
    </div>
  );
}

export default async function HomeReading() {
  let article: Article | null = null;
  let failed = false;
  const today = getPublicationDate();
  let readings: DailyReading[] = [];
  let tomorrow = { titles: [] as string[], total: 0 };

  try {
    readings = await getDayReadings(today);
    article = readings.length ? await getPublishedArticle(String(readings[0].id), today) : await getLatestPublishedArticle(today);
  } catch {
    failed = true;
  }
  try { tomorrow = await getTomorrowTitles(); } catch { /* A missing preview must not hide published readings. */ }
  const preview = tomorrow.total > 0 && <aside className="mt-6 border-t border-[#33241D]/15 pt-5" aria-label="Coming tomorrow">
    <h3 className="text-xs uppercase tracking-[0.15em] text-[#75665C]">Coming tomorrow</h3>
    <ul className="mt-3 space-y-2 font-serif text-lg">{tomorrow.titles.map((title, index) => <li key={index}>{title}</li>)}</ul>
    {tomorrow.total > 3 && <p className="mt-2 text-xs text-[#75665C]">+{tomorrow.total - 3} more</p>}
  </aside>;
  if (!article) return <div><ReadingUnavailable failed={failed} />{preview}<QuoteReminders /></div>;

  const theme = getTopicTheme(article.topic);
  const excerpt =
    typeof article.content === "string"
      ? readingText(article.content.split("\n\n")[0])
      : "";

  return (
      <div><article className="iserein-home-reading" aria-labelledby="today-reading-title">
        <div className="iserein-home-reading-meta">
          <p className="iserein-home-eyebrow">{article.published_date !== today ? "Latest reading" : readings.length > 1 ? "Today’s readings" : "Today’s reading"}</p>
          {(article.reading_time ?? 0) > 0 && (
            <span>{article.reading_time} min read</span>
          )}
        </div>

        <span
          className="iserein-home-reading-topic"
          style={{ color: theme.accent, backgroundColor: theme.soft }}
        >
          {article.topic}
        </span>

        <h2 id="today-reading-title">
          <Link href={"/reading/" + article.id}>{article.title}</Link>
        </h2>

        {article.subtitle && (
          <p className="iserein-home-reading-subtitle">{readingText(article.subtitle)}</p>
        )}

        {excerpt && <p className="iserein-home-reading-excerpt">{excerpt}</p>}

        <div className="iserein-home-reading-actions">
          <Link
            href={"/reading/" + article.id}
            className="iserein-home-text-link"
            aria-label={"Open reading: " + article.title}
          >
            Open reading <span aria-hidden="true">→</span>
          </Link>
          <SaveButton articleId={article.id} />
        </div>
      </article>
      {readings.length > 1 && <Link href="/readings" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#805334]">See all {readings.length} readings →</Link>}
      {preview}
      <QuoteReminders />
      </div>
  );
}
