"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { markRead } from "@/lib/reading-history";
import QuoteReminders from "./QuoteReminders";

export default function ReadingEnd({ articleId, isToday }: { articleId: number; isToday: boolean }) {
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
        {!isToday && <Link href="/reading" className="inline-flex min-h-11 items-center text-sm text-[#805334]">Read today&apos;s page →</Link>}
      </div>
      <QuoteReminders kind="reading" />
    </div>
  );
}
