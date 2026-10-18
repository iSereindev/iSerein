import { supabase } from "@/lib/supabase";
import HomeQuoteCarousel from "./HomeQuoteCarousel";

export default async function HomeThoughts() {
  try {
    const { data: quotes, error } = await supabase
      .from("home_quotes")
      .select("id, sentence, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true });

    if (error || !quotes?.length) return null;

    return (
      <section className="iserein-home-thoughts iserein-home-container" aria-labelledby="home-thoughts-heading">
        <h2 id="home-thoughts-heading" className="iserein-home-eyebrow">
          A thought to take with you
        </h2>
        <HomeQuoteCarousel quotes={quotes} />
      </section>
    );
  } catch {
    // Optional quotes must never block access to the readings or topics.
    return null;
  }
}
