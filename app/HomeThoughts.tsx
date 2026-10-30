import { getActiveQuotes, type HomeQuote } from "@/lib/catalog";
import HomeQuoteCarousel from "./HomeQuoteCarousel";

export default async function HomeThoughts() {
  let quotes: HomeQuote[] = [];
  try {
    quotes = await getActiveQuotes();
  } catch {
    // Optional quotes must never block access to the readings or topics.
    return null;
  }
  if (!quotes.length) return null;

  return (
    <section className="iserein-home-thoughts iserein-home-container" aria-labelledby="home-thoughts-heading">
      <h2 id="home-thoughts-heading" className="iserein-home-eyebrow">
        A thought to take with you
      </h2>
      <HomeQuoteCarousel quotes={quotes} />
    </section>
  );
}
