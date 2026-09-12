"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SaveButton from "../reading/[id]/SaveButton";
import SaveBookButton from "../explore/SaveBookButton";

type Article = {
  id: number;
  title: string;
  subtitle: string | null;
  topic: string;
  reading_time: number | null;
};

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

type CollectionItem = {
  id: number | string;
};

const READING_KEY = "iserein-saved";
const READING_EVENT = "iserein-saved-changed";
const BOOK_KEY = "iserein-saved-books";
const BOOK_EVENT = "iserein-saved-books-changed";

const topicColors: Record<string, string> = {
  Self: "#6B2636",
  Life: "#173A70",
  Growth: "#0D3B33",
};

function readIds(key: string): string[] {
  const stored = localStorage.getItem(key);

  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid saved collection");
  }

  if (key === READING_KEY) {
    return [
      ...new Set(
        parsed
          .map(Number)
          .filter(Number.isInteger)
          .map(String)
      ),
    ];
  }

  return [
    ...new Set(
      parsed
        .filter(
          (id): id is string =>
            typeof id === "string" && id.trim().length > 0
        )
        .map((id) => id.trim().toLowerCase())
    ),
  ];
}

function useSavedCollection<T extends CollectionItem>(
  storageKey: string,
  changeEvent: string,
  endpoint: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;

    async function load() {
      controller?.abort();

      const request = new AbortController();
      controller = request;

      setLoading(true);
      setError(null);

      try {
        const ids = readIds(storageKey);
        setCount(ids.length);

        if (ids.length === 0) {
          setItems([]);
          return;
        }

        const query = new URLSearchParams({
          ids: ids.join(","),
        });

        const response = await fetch(`${endpoint}?${query}`, {
          signal: request.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load collection");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected response");
        }

        if (disposed || request.signal.aborted) return;

        const byId = new Map(
          (data as T[]).map((item) => [String(item.id), item])
        );

        const ordered: T[] = [];

        for (const id of [...ids].reverse()) {
          const item = byId.get(id);

          if (item) ordered.push(item);
        }

        setItems(ordered);
      } catch {
        if (disposed || request.signal.aborted) return;

        setError(
          "We couldn’t load this collection. Your saved list has not been changed."
        );
      } finally {
        if (!disposed && !request.signal.aborted) {
          setLoading(false);
        }
      }
    }

    function syncCollection() {
      void load();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) {
        syncCollection();
      }
    }

    syncCollection();

    window.addEventListener(changeEvent, syncCollection);
    window.addEventListener("storage", handleStorage);

    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener(changeEvent, syncCollection);
      window.removeEventListener("storage", handleStorage);
    };
  }, [storageKey, changeEvent, endpoint, attempt]);

  return {
    items,
    count,
    loading,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}

export default function ProfilePage() {
  const [selected, setSelected] = useState<"readings" | "books">(
    "readings"
  );

  const readings = useSavedCollection<Article>(
    READING_KEY,
    READING_EVENT,
    "/api/saved"
  );

  const books = useSavedCollection<Book>(
    BOOK_KEY,
    BOOK_EVENT,
    "/api/saved-books"
  );

  const collection = selected === "readings" ? readings : books;

  const tabClass = (active: boolean) =>
    `min-h-[48px] rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7F6A39] ${
      active
        ? "bg-[#222E3B] text-[#EAD5A6]"
        : "border border-[#44313D]/15 bg-[#F7F8F9] text-[#5F6975] hover:bg-white"
    }`;

  return (
    <main className="min-h-screen bg-[#E8EEF4] text-[#44313D]">
      {/* HEADER */}
      <header className="border-b border-[#44313D]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 md:px-10">
          <Link href="/" className="iserein-brand text-xl">
            iSEREIN
          </Link>

          <span className="text-xs uppercase tracking-[0.2em] text-[#5F6975]">
            Your collection
          </span>
        </div>
      </header>

      {/* INTRODUCTION */}
      <section className="px-6 pb-10 pt-14 md:px-10 md:pb-14 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 shrink-0 bg-[#C6A96B]" />

            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#7F6A39]">
              A little space of your own
            </p>
          </div>

          <h1 className="mt-7 font-serif text-5xl font-normal tracking-tight md:text-7xl">
            Profile
          </h1>

          <p className="mt-6 max-w-xl font-serif text-2xl leading-9">
            The pages and books you keep close.
          </p>

          <p className="mt-4 max-w-xl leading-8 text-[#5F6975]">
            Return to a meaningful reading, or find the next book
            you want to spend time with.
          </p>

          <div className="mt-8 max-w-xl rounded-2xl border border-[#44313D]/10 bg-[#F7F8F9] px-5 py-4">
            <p className="text-sm leading-6 text-[#5F6975]">
              Your collection is saved in this browser. No account is
              needed. It won’t sync across devices, and clearing
              browser data removes it.
            </p>
          </div>
        </div>
      </section>

      {/* COLLECTION SWITCH */}
      <section
        aria-labelledby="collection-heading"
        className="px-6 pb-20 md:px-10 md:pb-28"
      >
        <div className="mx-auto max-w-7xl">
          <div
            role="group"
            aria-label="Choose a saved collection"
            className="mb-8 flex flex-wrap gap-3 border-t border-[#44313D]/10 pt-7"
          >
            <button
              type="button"
              aria-pressed={selected === "readings"}
              onClick={() => setSelected("readings")}
              className={tabClass(selected === "readings")}
            >
              Saved readings
              {!readings.loading && !readings.error
                ? ` (${readings.count})`
                : ""}
            </button>

            <button
              type="button"
              aria-pressed={selected === "books"}
              onClick={() => setSelected("books")}
              className={tabClass(selected === "books")}
            >
              Saved books
              {!books.loading && !books.error
                ? ` (${books.count})`
                : ""}
            </button>
          </div>

          <h2
            id="collection-heading"
            className="mb-6 font-serif text-3xl"
          >
            {selected === "readings"
              ? "Your saved readings"
              : "Your saved books"}
          </h2>

          {selected === "books" && (
            <p className="mb-6 max-w-2xl text-sm leading-7 text-[#5F6975]">
              Affiliate disclosure: iSEREIN may earn a commission when
              you purchase through the Bookshop.org links below.
            </p>
          )}

          <div aria-busy={collection.loading}>
            {collection.loading ? (
              <p role="status" className="py-10 text-[#5F6975]">
                Opening your collection…
              </p>
            ) : collection.error ? (
              <div
                role="alert"
                className="rounded-2xl border border-[#44313D]/10 bg-[#F7F8F9] p-8"
              >
                <p className="leading-7 text-[#5F6975]">
                  {collection.error}
                </p>

                <button
                  type="button"
                  onClick={collection.retry}
                  className="mt-5 rounded-full bg-[#222E3B] px-6 py-3 text-sm text-[#FFF7F0]"
                >
                  Try again
                </button>
              </div>
            ) : collection.count === 0 ? (
              <div className="rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] px-8 py-16 text-center">
                <h3 className="font-serif text-3xl">
                  {selected === "readings"
                    ? "No readings saved yet."
                    : "No books saved yet."}
                </h3>

                <p className="mx-auto mt-5 max-w-md leading-8 text-[#5F6975]">
                  {selected === "readings"
                    ? "Tap the heart-shaped Save button on a reading to keep it here."
                    : "Tap Save book in Explore to add a book to your collection."}
                </p>

                <Link
                  href={selected === "readings" ? "/topics" : "/explore"}
                  className="mt-8 inline-flex rounded-full bg-[#222E3B] px-7 py-3.5 text-sm text-[#FFF7F0]"
                >
                  {selected === "readings"
                    ? "Discover a reading →"
                    : "Explore books →"}
                </Link>
              </div>
            ) : (
              <>
                {collection.items.length < collection.count && (
                  <p
                    role="status"
                    className="mb-6 text-sm leading-7 text-[#5F6975]"
                  >
                    Some saved items are currently unavailable. Their
                    saved references are still in your collection.
                  </p>
                )}

                {selected === "readings" ? (
                  <div className="grid gap-7 md:grid-cols-2">
                    {readings.items.map((article) => (
                      <article
                        key={article.id}
                        className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] shadow-[0_12px_35px_rgba(68,49,61,0.06)]"
                      >
                        <div
                          className="h-1.5"
                          style={{
                            backgroundColor:
                              topicColors[article.topic] ?? "#222E3B",
                          }}
                        />

                        <div className="flex flex-1 flex-col p-7 md:p-9">
                          <div className="flex items-center justify-between gap-4">
                            <span
                              className="rounded-full px-4 py-2 text-xs font-medium text-white"
                              style={{
                                backgroundColor:
                                  topicColors[article.topic] ??
                                  "#222E3B",
                              }}
                            >
                              {article.topic}
                            </span>

                            {article.reading_time != null && (
                              <span className="text-sm text-[#5F6975]">
                                {article.reading_time} min
                              </span>
                            )}
                          </div>

                          <h3 className="mt-7 font-serif text-3xl leading-tight">
                            {article.title}
                          </h3>

                          {article.subtitle && (
                            <p className="mt-5 leading-8 text-[#5F6975]">
                              {article.subtitle}
                            </p>
                          )}

                          <div className="my-7 h-px bg-[#44313D]/10" />

                          <div className="mt-auto flex flex-wrap items-center gap-3">
                            <Link
                              href={`/reading/${article.id}`}
                              className="rounded-full bg-[#222E3B] px-6 py-3 text-sm text-[#FFF7F0]"
                            >
                              Open reading →
                            </Link>

                            <SaveButton articleId={article.id} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                    {books.items.map((book) => (
                      <article
                        key={book.id}
                        className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] shadow-[0_12px_35px_rgba(68,49,61,0.06)]"
                      >
                        <div className="flex min-h-[300px] items-center justify-center bg-[#D8DDE3] px-8 py-8">
                          {book.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={book.cover_url}
                              alt={`Cover of ${book.title}`}
                              width={180}
                              height={250}
                              loading="lazy"
                              className="h-[250px] w-[180px] object-contain"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex min-h-[240px] w-[180px] flex-col justify-between rounded-r-xl border-l-4 border-black/20 p-6 shadow-lg"
                              style={{
                                backgroundColor:
                                  topicColors[book.topic] ?? "#222E3B",
                              }}
                            >
                              <p className="text-xs text-[#EAD5A6]">
                                {book.topic}
                              </p>

                              <p className="my-5 font-serif text-2xl text-[#FFF7F0]">
                                {book.title}
                              </p>

                              <p className="text-xs text-[#EAD5A6]">
                                {book.author}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-7">
                          <p
                            className="text-xs font-medium uppercase tracking-[0.15em]"
                            style={{
                              color:
                                topicColors[book.topic] ?? "#222E3B",
                            }}
                          >
                            {book.topic}
                          </p>

                          <h3 className="mt-4 font-serif text-3xl leading-tight">
                            {book.title}
                          </h3>

                          <p className="mt-3 text-sm text-[#5F6975]">
                            by {book.author}
                          </p>

                          {book.edition && (
                            <p className="mt-2 text-xs leading-6 text-[#5F6975]">
                              {book.edition}
                            </p>
                          )}

                          <p className="mt-5 whitespace-pre-line leading-8 text-[#5F6975]">
                            {book.description}
                          </p>

                          <div className="mt-6">
                            <SaveBookButton bookId={book.id} />
                          </div>

                          <div className="mt-auto pt-7">
                            <a
                              href={book.affiliate_url}
                              target="_blank"
                              rel="sponsored noopener noreferrer"
                              aria-label={`View ${book.title} on Bookshop.org (opens in a new tab)`}
                              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#222E3B] px-5 py-3 text-center text-sm text-[#FFF7F0]"
                            >
                              View on Bookshop.org
                              <span aria-hidden="true">↗</span>
                            </a>

                            <p className="mt-3 text-center text-xs text-[#5F6975]">
                              Opens in a new tab.
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#44313D]/10 px-6 py-12 text-center">
        <p className="font-serif text-xl italic text-[#5F6975]">
          Read slowly. Return often.
        </p>

        <p className="iserein-footer-brand mt-6">iSEREIN</p>
      </footer>
    </main>
  );
}