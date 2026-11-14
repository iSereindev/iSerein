"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markRead } from "@/lib/reading-history";
import { useInstallState } from "./InstallApp";
import QuoteReminders from "./QuoteReminders";

export default function ReadingEnd({ articleId, isToday }: { articleId: number; isToday: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  const { installed } = useInstallState();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!end.current || !("IntersectionObserver" in window)) return;
    // Only record completion when the ending is visible, never on page opening.
    let visible = false;
    const record = () => {
      if (visible && document.visibilityState === "visible") setSaved(markRead(articleId));
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; record(); }, { threshold: 0.5 });
    observer.observe(end.current);
    document.addEventListener("visibilitychange", record);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", record); };
  }, [articleId]);
  return (
    <div className="mx-auto mt-10 max-w-2xl border-t border-[#33241D]/15 pt-8">
      <div ref={end}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#75665C]">{isToday ? "End of today’s reading" : "End of reading"}</p>
        {saved && <p className="mt-2 text-xs text-[#75665C]">✓ Read · Remembered on this browser</p>}
      </div>
      {!isToday && <Link href="/reading" className="mt-5 inline-block text-sm text-[#805334] underline underline-offset-4">Read today&apos;s page →</Link>}
      <h3 className="mt-6 font-serif text-2xl text-[#33241D]">A new page tomorrow.</h3>
      <p className="mt-2 text-sm leading-6 text-[#75665C]">Take a little time for yourself again.</p>
      <QuoteReminders label="Remind me" />
      {!installed && <Link href="/install" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#805334] underline underline-offset-4">Add to home screen</Link>}
    </div>
  );
}
