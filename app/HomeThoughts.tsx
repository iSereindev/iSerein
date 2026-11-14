import { getActiveQuotes, type HomeQuote } from "@/lib/catalog";
import HomeQuoteCarousel from "./HomeQuoteCarousel";
import { Suspense } from "react";

async function Thoughts({ thoughtId }: { thoughtId: number | null }) {
  let quotes: HomeQuote[] = [];
  try {
    quotes = await getActiveQuotes();
  } catch {
    // Quote availability must not hide the reminder settings.
  }
  if (!quotes.length) return <p className="mt-4 text-sm text-[#75665C]">Quotes aren’t available right now.</p>;
  return <HomeQuoteCarousel key={thoughtId ?? "thoughts"} quotes={quotes} initialQuoteId={thoughtId} />;
}

export default function HomeThoughts({ thoughtId = null }: { thoughtId?: number | null }) {
  return (
    <section id="thoughts" className="iserein-home-thoughts iserein-home-container" aria-labelledby="home-thoughts-heading">
      <h2 id="home-thoughts-heading" className="iserein-home-eyebrow">
        A thought to take with you
      </h2>
      <Suspense fallback={<p className="mt-4 text-sm text-[#75665C]">Loading thoughts…</p>}>
        <Thoughts thoughtId={thoughtId} />
      </Suspense>
    </section>
  );
}
