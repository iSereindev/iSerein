"use client";

import { useEffect, useState } from "react";
import { compactCount, publicCount, REMINDER_COUNT_EVENT } from "@/lib/reading-counts";

export default function ReminderSubscriberCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let active: AbortController | null = null;
    let timeout: number | undefined;
    async function refresh() {
      active?.abort();
      window.clearTimeout(timeout);
      const abort = new AbortController();
      active = abort;
      timeout = window.setTimeout(() => abort.abort(), 10000);
      try {
        const response = await fetch("/api/quote-reminder-count", { credentials: "omit", cache: "no-store", signal: abort.signal });
        const data = await response.json().catch(() => null);
        const next = publicCount(data?.count);
        if (response.ok && next !== null && !disposed && active === abort) setCount(next);
      } catch { /* The reminder controls work even if the optional count cannot load. */ }
      finally { if (active === abort) window.clearTimeout(timeout); }
    }
    const changed = () => { void refresh(); };
    window.addEventListener(REMINDER_COUNT_EVENT, changed);
    void refresh();
    return () => {
      disposed = true;
      active?.abort();
      window.clearTimeout(timeout);
      window.removeEventListener(REMINDER_COUNT_EVENT, changed);
    };
  }, []);

  if (count === null) return null;
  return <span className="whitespace-nowrap text-xs font-normal text-[#75665C] tabular-nums"
    title="Active daily quote subscriptions. A reader may subscribe on more than one device."
    aria-label={`${count.toLocaleString("en")} active daily quote subscriptions`}>
    {compactCount(count)} subscribed
  </span>;
}
