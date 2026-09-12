"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: number;
  sentence: string;
  display_order: number;
};

export default function HomeQuoteCarousel({
  quotes,
}: {
  quotes: Quote[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (quotes.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % quotes.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [quotes.length]);

  if (quotes.length === 0) {
    return (
      <p className="font-serif text-xl leading-9 text-[#44313D] md:text-2xl md:leading-10">
        Take a moment. Let the words meet you where you are.
      </p>
    );
  }

  const quote = quotes[currentIndex];

  return (
    <div className="flex min-h-[230px] items-center justify-center px-4 text-center">
      <div
        key={quote.id}
        className="iserein-quote-fade flex max-w-xl items-center justify-center"
      >
        <span
          aria-hidden="true"
          className="mr-3 self-start pt-1 font-serif text-6xl font-normal leading-none text-[#D9828B] md:text-7xl"
        >
          “
        </span>

        <p className="font-serif text-xl font-normal leading-9 text-[#44313D] md:text-2xl md:leading-10">
          {quote.sentence}
        </p>

        <span
          aria-hidden="true"
          className="ml-3 self-end pb-1 font-serif text-6xl font-normal leading-none text-[#D9828B] md:text-7xl"
        >
          ”
        </span>
      </div>
    </div>
  );
}