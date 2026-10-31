import { getActiveQuotes, type HomeQuote } from "@/lib/catalog";
import HomeQuoteCarousel from "./HomeQuoteCarousel";
import QuoteReminders from "./QuoteReminders";

export default async function HomeThoughts({ thoughtId = null }: { thoughtId?: number | null }) {
  let quotes: HomeQuote[] = [];
  try {
    quotes = await getActiveQuotes();
  } catch {
    // Optional quotes must never block access to the readings or topics.
    return null;
  }
  if (!quotes.length) return null;

  return (
    <section id="thoughts" className="iserein-home-thoughts iserein-home-container" aria-labelledby="home-thoughts-heading">
      <h2 id="home-thoughts-heading" className="iserein-home-eyebrow">
        A thought to take with you
      </h2>
      <HomeQuoteCarousel key={thoughtId ?? "thoughts"} quotes={quotes} initialQuoteId={thoughtId} />
      <QuoteReminders />
    </section>
  );
}
