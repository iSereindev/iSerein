import { supabase } from "@/lib/supabase";
import SaveButton from "./reading/[id]/SaveButton";
import HomeQuoteCarousel from "./HomeQuoteCarousel";
import HomeIntro from "./HomeIntro";

export default async function Home() {
  const today = new Date().toISOString().split("T")[0];

  const { data: homeQuotes, error: quotesError } = await supabase
    .from("home_quotes")
    .select("id, sentence, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (quotesError) {
    throw new Error(quotesError.message);
  }

  const { data: article, error } = await supabase
    .from("articles")
    .select(
      "id, title, subtitle, content, topic, reading_time, published_date"
    )
    .lte("published_date", today)
    .order("published_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <HomeIntro>
      <main className="min-h-screen bg-[#E8EEF4] text-[#44313D]">

        {/* HEADER */}
        <header className="border-b border-[#44313D]/10 bg-[#E8EEF4]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">

            <a
              href="/"
              className="iserein-brand text-xl"
            >
              iSEREIN
            </a>

            <nav className="hidden items-center gap-10 text-sm text-[#5F6975] md:flex">
              <a
                href="/"
                className="transition-colors duration-200 hover:text-[#C6A96B]"
              >
                Today
              </a>

              <a
                href="/topics"
                className="transition-colors duration-200 hover:text-[#C6A96B]"
              >
                Topics
              </a>

              <a
                href="/saved"
                className="transition-colors duration-200 hover:text-[#C6A96B]"
              >
                Saved
              </a>
            </nav>

            {article ? (
              <div className="iserein-save-gold">
                <SaveButton articleId={article.id} />
              </div>
            ) : (
              <span className="iserein-gold-pill">
                ♡
              </span>
            )}

          </div>
        </header>

        {/* HERO */}
        <section className="bg-[#E8EEF4] px-6 pb-16 pt-20 md:px-10 md:pb-20 md:pt-28">
          <div className="mx-auto max-w-7xl">

            <div className="max-w-4xl">

              <div className="flex items-center gap-4">
                <span className="h-px w-12 bg-[#C6A96B]" />

                <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#7F6A39]">
                  A daily page for your life
                </p>
              </div>

              <h1 className="mt-7 w-fit font-serif text-5xl font-normal leading-[0.95] tracking-[-0.035em] text-[#44313D] md:text-7xl lg:text-[5.75rem]">

                <span className="block">
                  Empower Yourself
                </span>

                <span className="mt-3 block text-center italic text-[#7F6A39]">
                  Daily.
                </span>

              </h1>

              <p className="mt-8 max-w-2xl font-serif text-lg leading-8 text-[#5F6975] md:text-xl md:leading-9">
                Five quiet minutes. One meaningful page. Something small to
                carry with you throughout the day.
              </p>

            </div>
          </div>
        </section>

        {/* TODAY · GROWTH */}
        <section className="bg-[#E8EEF4] px-6 pb-12 pt-4 md:px-10 md:pb-20 md:pt-6">
          <div className="mx-auto max-w-7xl">

            <div className="mb-7 flex items-center gap-4 border-t border-[#44313D]/10 pt-7">

              <span className="h-px w-10 bg-[#A892D0]" />

              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#77649B]">
                Today · Growth
              </p>

            </div>

            {/* VIOLET STAR QUOTE */}
            <div className="iserein-quote-star-wrap">

              <div className="iserein-quote-star iserein-violet-star">

                <div className="iserein-splash iserein-splash-one" />
                <div className="iserein-splash iserein-splash-two" />
                <div className="iserein-splash iserein-splash-three" />

                <div className="iserein-bubble iserein-bubble-one" />
                <div className="iserein-bubble iserein-bubble-two" />
                <div className="iserein-bubble iserein-bubble-three" />
                <div className="iserein-bubble iserein-bubble-four" />
                <div className="iserein-bubble iserein-bubble-five" />

                <div className="relative z-10 flex min-h-[280px] w-full flex-col items-center justify-center px-8 py-16 text-center md:min-h-[360px] md:px-14">

                  <div className="iserein-quote-core w-full max-w-2xl">

                    <div className="font-serif text-xl leading-9 text-white md:text-2xl md:leading-10">
                      <HomeQuoteCarousel
                        quotes={homeQuotes ?? []}
                      />
                    </div>

                  </div>

                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">

                    <div className="flex items-center gap-3">

                      <span className="h-px w-9 bg-[#D7C28A]" />

                      <span className="iserein-star-brand">
                        iSEREIN
                      </span>

                      <span className="h-px w-9 bg-[#D7C28A]" />

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* TODAY'S READING */}
        <section className="bg-[#E8EEF4] px-6 pb-20 pt-4 md:px-10 md:pb-28 md:pt-8">
          <div className="mx-auto max-w-7xl">

            <div className="mb-7 border-t border-[#44313D]/10 pt-7">

              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#7F6A39]">
                Today&apos;s page
              </p>

            </div>

            {article ? (
              <article className="overflow-hidden rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] shadow-[0_20px_60px_rgba(68,49,61,0.10)] md:rounded-[2rem]">

                <div className="grid md:grid-cols-[0.85fr_1.15fr]">

                  {/* READING PANEL */}
                  <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden bg-[#D8DDE3] p-7 md:min-h-[400px] md:p-14">

                    <div className="pointer-events-none absolute inset-4 rounded-[1.35rem] border border-[#C6A96B]/25 md:inset-5" />

                    <div className="relative z-10 text-center">

                      <p className="iserein-small-brand">
                        iSEREIN
                      </p>

                      <div className="mx-auto my-5 h-px w-10 bg-[#C6A96B]" />

                      <p className="font-serif text-2xl leading-9 text-[#44313D] md:text-3xl md:leading-10">
                        A page worth
                        <br />
                        keeping close.
                      </p>

                    </div>

                  </div>

                  {/* ARTICLE */}
                  <div className="bg-[#F7F8F9] p-8 md:p-14 lg:p-16">

                    <h2 className="font-serif text-3xl font-normal leading-[1.1] text-[#44313D] md:text-5xl">
                      {article.title}
                    </h2>

                    <p className="mt-5 font-serif text-lg leading-8 text-[#5F6975]">
                      {article.subtitle}
                    </p>

                    <div className="my-7 flex items-center gap-3">

                      <span className="h-px w-12 bg-[#C6A96B]" />

                      <span className="h-1.5 w-1.5 rounded-full bg-[#A892D0]" />

                      <span className="h-px flex-1 bg-[#44313D]/10" />

                    </div>

                    <p className="leading-8 text-[#4F5965]">
                      {article.content.split("\n\n")[0]}
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">

                      <a
                        href="/reading"
                        className="rounded-full bg-[#44313D] px-7 py-3.5 text-sm font-medium text-[#FFF7F0] transition-colors duration-200 hover:bg-[#6F5A32]"
                      >
                        Read today&apos;s page
                      </a>

                      <SaveButton articleId={article.id} />

                    </div>

                  </div>

                </div>

              </article>
            ) : (
              <article className="rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] p-12 text-center">

                <h2 className="font-serif text-3xl font-normal text-[#44313D]">
                  No reading is published yet.
                </h2>

              </article>
            )}

          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#44313D]/10 bg-[#D8DDE3] px-6 py-16 text-center">

          <p className="font-serif text-2xl italic text-[#44313D]">
            Read slowly. Live deeply.
          </p>

          <div className="mx-auto my-6 h-px w-12 bg-[#C6A96B]" />

          <p className="text-sm text-[#65707B]">
            A quiet place to read, reflect, and grow.
          </p>

          <p className="mt-5 iserein-footer-brand">
            iSEREIN
          </p>

        </footer>

      </main>
    </HomeIntro>
  );
}