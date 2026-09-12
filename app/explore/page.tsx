import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SaveBookButton from "./SaveBookButton";

export const dynamic = "force-dynamic";

type Book = {
  id: string;
  title: string;
  author: string;
  edition: string | null;
  topic: string;
  description: string;
  affiliate_url: string;
  cover_url: string | null;
};

const topicStyles: Record<
  string,
  { color: string; background: string }
> = {
  Self: {
    color: "#6B2636",
    background: "#F1E4E7",
  },
  Life: {
    color: "#173A70",
    background: "#E5EBF4",
  },
  Growth: {
    color: "#0D3B33",
    background: "#E3ECE8",
  },
};

export default async function ExplorePage() {
  const { data, error } = await supabase
    .from("books")
    .select(
      "id, title, author, edition, topic, description, affiliate_url, cover_url"
    )
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Unable to load the bookshelf: ${error.message}`);
  }

  const books: Book[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#E8EEF4] text-[#44313D]">
      {/* HEADER */}
      <header className="border-b border-[#44313D]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 md:px-10">
          <Link href="/" className="iserein-brand text-xl">
            iSEREIN
          </Link>

          <span className="text-xs uppercase tracking-[0.2em] text-[#5F6975]">
            The bookshelf
          </span>
        </div>
      </header>

      {/* INTRODUCTION */}
      <section className="px-6 pb-10 pt-14 md:px-10 md:pb-14 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 shrink-0 bg-[#C6A96B]" />

            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#7F6A39]">
              Beyond your daily page
            </p>
          </div>

          <h1 className="mt-7 font-serif text-5xl font-normal tracking-tight md:text-7xl">
            Explore
          </h1>

          <p className="mt-6 max-w-2xl font-serif text-2xl leading-9 text-[#44313D] md:text-3xl md:leading-10">
            Some pages stay with you.
            <br />
            Some become whole books.
          </p>

          <p className="mt-6 max-w-xl text-base leading-8 text-[#5F6975]">
            A small collection of books selected for the iSEREIN
            bookshelf. Discover ideas to deepen your understanding of
            yourself, your life, and who you are becoming.
          </p>

          <div className="mt-8 max-w-2xl rounded-2xl border border-[#7F6A39]/20 bg-[#F7F8F9] px-5 py-4">
            <p className="text-sm leading-6 text-[#5F6975]">
              <span className="font-semibold text-[#44313D]">
                Affiliate disclosure:{" "}
              </span>
              iSEREIN may earn a commission when you purchase through
              the Bookshop.org links below.
            </p>
          </div>
        </div>
      </section>

      {/* BOOK COLLECTION */}
      <section
        aria-labelledby="bookshelf-heading"
        className="px-6 pb-20 md:px-10 md:pb-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 border-t border-[#44313D]/10 pt-7">
            <h2
              id="bookshelf-heading"
              className="text-xs font-medium uppercase tracking-[0.25em] text-[#7F6A39]"
            >
              On our bookshelf
            </h2>
          </div>

          {books.length > 0 ? (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => {
                const style = topicStyles[book.topic] ?? {
                  color: "#222E3B",
                  background: "#E5EBF4",
                };

                return (
                  <article
                    key={book.id}
                    className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] shadow-[0_12px_35px_rgba(68,49,61,0.06)]"
                  >
                    {/* BOOK COVER */}
                    <div
                      className="flex min-h-[340px] items-center justify-center px-8 py-10"
                      style={{
                        backgroundColor: style.background,
                      }}
                    >
                      {book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt={`Cover of ${book.title}`}
                          width={200}
                          height={280}
                          loading="lazy"
                          className="h-[280px] w-[200px] object-contain"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="relative flex min-h-[260px] w-full max-w-[200px] flex-col justify-between overflow-hidden rounded-r-xl border-l-[6px] border-black/20 p-6 shadow-[10px_14px_25px_rgba(20,33,50,0.2)]"
                          style={{
                            backgroundColor: style.color,
                          }}
                        >
                          <div className="pointer-events-none absolute inset-3 border border-[#EAD5A6]/35" />

                          <p className="relative text-[10px] uppercase tracking-[0.22em] text-[#EAD5A6]">
                            {book.topic}
                          </p>

                          <p className="relative my-6 font-serif text-2xl leading-8 text-[#FFF7F0]">
                            {book.title}
                          </p>

                          <p className="relative text-xs tracking-wide text-[#EAD5A6]">
                            {book.author}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* BOOK DETAILS */}
                    <div className="flex flex-1 flex-col p-7 md:p-8">
                      <span
                        className="w-fit rounded-full px-3 py-1.5 text-xs font-medium"
                        style={{
                          color: style.color,
                          backgroundColor: style.background,
                        }}
                      >
                        {book.topic}
                      </span>

                      <h3 className="mt-5 font-serif text-3xl font-normal leading-tight text-[#44313D]">
                        {book.title}
                      </h3>

                      <p className="mt-3 text-sm font-medium text-[#5F6975]">
                        by {book.author}
                      </p>

                      {book.edition && (
                        <p className="mt-2 text-xs leading-5 text-[#5F6975]">
                          {book.edition}
                        </p>
                      )}

                      <div className="my-6 h-px w-12 bg-[#C6A96B]" />

                      <p className="whitespace-pre-line text-base leading-8 text-[#5F6975]">
                        {book.description}
                      </p>

                      {/* SAVE BOOK */}
                      <div className="mt-5">
                        <SaveBookButton bookId={book.id} />
                      </div>

                      {/* AFFILIATE LINK */}
                      <div className="mt-auto pt-8">
                        <a
                          href={book.affiliate_url}
                          target="_blank"
                          rel="sponsored noopener noreferrer"
                          aria-label={`View ${book.title} on Bookshop.org (opens in a new tab)`}
                          className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#222E3B] px-5 py-3.5 text-center text-sm font-medium text-[#FFF7F0] transition-colors hover:bg-[#3B3158] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7F6A39]"
                        >
                          View on Bookshop.org
                          <span aria-hidden="true">↗</span>
                        </a>

                        <p className="mt-3 text-center text-xs leading-5 text-[#5F6975]">
                          Opens Bookshop.org in a new tab.
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] px-8 py-16 text-center">
              <h3 className="font-serif text-3xl text-[#44313D]">
                A new chapter is coming.
              </h3>

              <p className="mt-4 leading-7 text-[#5F6975]">
                Book recommendations will appear here soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#44313D]/10 px-6 py-12 text-center">
        <p className="font-serif text-xl italic text-[#5F6975]">
          Follow your curiosity. Find your next page.
        </p>

        <p className="iserein-footer-brand mt-6">iSEREIN</p>
      </footer>
    </main>
  );
}