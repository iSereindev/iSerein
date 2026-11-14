"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { markRead } from "@/lib/reading-history";
import QuoteReminders from "./QuoteReminders";

export default function ReadingEnd({ articleId, isToday, todayHref, tomorrow }: {
  articleId: number;
  isToday: boolean;
  todayHref?: string;
  tomorrow?: { titles: string[]; total: number } | null;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!end.current || !("IntersectionObserver" in window)) return;
    // Only record completion when the ending is visible, never on page opening.
    let visible = false;
    const record = () => {
      if (visible && document.visibilityState === "visible") markRead(articleId);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; record(); }, { threshold: 0.5 });
    observer.observe(end.current);
    document.addEventListener("visibilitychange", record);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", record); };
  }, [articleId]);
  return (
    <div className="mx-auto mt-6 max-w-2xl border-t border-[#33241D]/10 pt-5">
      <div ref={end} className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#75665C]">{isToday ? "End of today’s reading" : "End of reading"}</p>
        {!isToday && <Link href={todayHref || "/readings"} className="inline-flex min-h-11 items-center text-sm text-[#805334]">{todayHref ? "Read today’s page →" : "Latest readings →"}</Link>}
      </div>
      {tomorrow && tomorrow.total > 0 && tomorrow.titles.length > 0 && (
        <div className="mt-3 text-sm text-[#75665C]">
          <p>Coming tomorrow: <span className="font-serif text-base text-[#33241D]">{tomorrow.titles[0]}</span></p>
          {tomorrow.total > 1 && <details className="mt-1">
            <summary className="cursor-pointer py-2">+{tomorrow.total - 1} more readings tomorrow</summary>
            <ul className="space-y-2 pb-2 font-serif text-base text-[#33241D]">
              {tomorrow.titles.slice(1, 3).map((title, index) => <li key={index}>{title}</li>)}
            </ul>
            {tomorrow.total > 3 && <p className="pb-2">+{tomorrow.total - 3} more readings</p>}
          </details>}
        </div>
      )}
      <QuoteReminders />
      <Link href="/install" className="mt-2 inline-flex min-h-11 items-center text-xs text-[#75665C] underline underline-offset-4">
        Add to home screen
      </Link>
    </div>
  );
}
