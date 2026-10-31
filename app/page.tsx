import Link from "next/link";
import { Suspense } from "react";
import { getTopicTheme } from "@/lib/reading-theme";
import HomeReading, { HomeReadingSkeleton } from "./HomeReading";
import HomeThoughts from "./HomeThoughts";

export const dynamic = "force-dynamic";

const topics = [
  { name: "Self", description: "Understand your mind, emotions, and identity." },
  { name: "Life", description: "Find perspective in relationships, work, and everyday life." },
  { name: "Growth", description: "Build courage, good habits, and a little momentum." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ thought?: string | string[] }> }) {
  const thought = (await searchParams).thought;
  const thoughtId = typeof thought === "string" && /^[1-9]\d*$/.test(thought) && Number.isSafeInteger(Number(thought)) ? Number(thought) : null;
  return (
    <main id="home-content" className="iserein-home">
      <a className="iserein-skip-link" href="#today-reading">
        Skip to today&apos;s reading
      </a>

      <header className="iserein-home-header">
        <div className="iserein-home-container iserein-home-header-inner">
          <Link href="/" className="iserein-brand" aria-label="iSEREIN home">
            iSEREIN
          </Link>

          <nav className="iserein-home-header-nav" aria-label="Homepage navigation">
            <Link href="/topics">Topics</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/profile" className="iserein-home-collection">
              Saved <span aria-hidden="true">↗</span>
            </Link>
          </nav>

          <Link href="/install" className="iserein-primary iserein-home-install iserein-install-link">
            Install iSEREIN <span aria-hidden="true">↓</span>
          </Link>
        </div>
      </header>

      <section className="iserein-home-hero iserein-home-container" aria-labelledby="home-heading">
        <div className="iserein-home-hero-copy">
          <p className="iserein-home-eyebrow">Less noise. More perspective.</p>

          <h1 id="home-heading">
            Something worth reading.
            <span>Every day.</span>
          </h1>

          <p className="iserein-home-description">
            A few quiet minutes. One meaningful page.
            A little space to understand yourself and the life you&apos;re living.
          </p>

          <div className="iserein-home-actions">
            <Link href="/reading" className="iserein-primary iserein-home-button">
              Read today&apos;s page <span aria-hidden="true">→</span>
            </Link>
            <Link href="/topics" className="iserein-home-secondary iserein-home-button">
              Explore topics
            </Link>
          </div>

          <p className="iserein-home-reassurance">
            Start reading. No account needed.
          </p>
        </div>

        <div id="today-reading" className="iserein-home-feature" tabIndex={-1}>
          <Suspense fallback={<HomeReadingSkeleton />}>
            <HomeReading />
          </Suspense>
        </div>
      </section>

      <section className="iserein-home-topics iserein-home-container" aria-labelledby="home-topics-heading">
        <div className="iserein-home-section-heading">
          <div>
            <p className="iserein-home-eyebrow">Choose your direction</p>
            <h2 id="home-topics-heading">What&apos;s on your mind?</h2>
          </div>
          <Link href="/topics" className="iserein-home-text-link">
            All topics <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="iserein-home-topic-grid">
          {topics.map((topic, index) => {
            const theme = getTopicTheme(topic.name);

            return (
              <Link
                key={topic.name}
                href={"/topics/" + topic.name}
                className="iserein-home-topic"
                style={{ backgroundColor: theme.soft }}
              >
                <div className="iserein-home-topic-top">
                  <span
                    className="iserein-home-topic-number"
                    style={{ color: theme.accent }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="iserein-home-topic-arrow" aria-hidden="true">↗</span>
                </div>
                <h3>{topic.name}</h3>
                <p>{topic.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeThoughts thoughtId={thoughtId} />
      </Suspense>

      <footer className="iserein-home-footer iserein-home-container">
        <p>Read slowly. Live deeply.</p>
        <div className="iserein-home-footer-links">
          <Link href="/about" className="iserein-home-text-link">
            About &amp; Contact
          </Link>
          <Link href="/install#quote-reminders" className="iserein-home-text-link">Quote reminders</Link>
          <span className="iserein-footer-brand">iSEREIN</span>
        </div>
      </footer>
    </main>
  );
}
