"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: number;
  sentence: string;
  display_order: number;
};

export default function HomeQuoteCarousel({ quotes, initialQuoteId = null }: { quotes: Quote[]; initialQuoteId?: number | null }) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, quotes.findIndex(quote => quote.id === initialQuoteId)));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (quotes.length < 2 || paused) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % quotes.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [quotes.length, paused]);

  if (quotes.length === 0) return null;

  const index = currentIndex % quotes.length;
  const quote = quotes[index];

  return (
    <div className="iserein-home-quote">
      <blockquote aria-live={paused ? "polite" : "off"} aria-atomic="true">
        <p>{quote.sentence}</p>
      </blockquote>

      {quotes.length > 1 && (
        <div className="iserein-home-quote-controls" aria-label="Thought navigation">
          <button
            type="button"
            aria-label="Previous thought"
            onClick={() => setCurrentIndex((current) => (current - 1 + quotes.length) % quotes.length)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <span>
            <span className="sr-only">Thought </span>
            {String(index + 1).padStart(2, "0")}
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>
            {String(quotes.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="Next thought"
            onClick={() => setCurrentIndex((current) => (current + 1) % quotes.length)}
          >
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            aria-label={paused ? "Resume automatic thoughts" : "Pause automatic thoughts"}
            title={paused ? "Resume automatic thoughts" : "Pause automatic thoughts"}
            onClick={() => setPaused((current) => !current)}
          >
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
