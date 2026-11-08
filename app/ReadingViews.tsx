"use client";

import { useEffect, useState } from "react";
import { compactCount, countDay, publicCount, VIEW_DELAY_MS } from "@/lib/reading-counts";

export default function ReadingViews({ articleId, separator = false }: { articleId: number; separator?: boolean }) {
  const [value, setValue] = useState<{ articleId: number; count: number } | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let disposed = false, ready = false, sent = false;
    let timer: number | undefined;
    const marker = `iserein-reading-view:${articleId}`;
    const getTimeout = window.setTimeout(() => abort.abort(), 10000);
    let postTimeout: number | undefined;

    function showCount(count: number) {
      if (!disposed) setValue(previous => ({ articleId, count: previous?.articleId === articleId ? Math.max(previous.count, count) : count }));
    }

    async function record() {
      if (disposed || document.visibilityState !== "visible") return;
      sent = true;
      postTimeout = window.setTimeout(() => abort.abort(), 10000);
      try {
        const response = await fetch("/api/reading-views", {
          method: "POST", credentials: "same-origin", cache: "no-store", signal: abort.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId }),
        });
        const data = await response.json().catch(() => null);
        const count = publicCount(data?.count);
        if (!response.ok || data?.accepted !== true || count === null) return;
        showCount(count);
        try { window.sessionStorage.setItem(marker, typeof data.day === "string" ? data.day : countDay()); }
        catch { /* Server-side daily deduplication still applies when storage is blocked. */ }
      } catch { /* Counts must never interrupt the reading. */ }
      finally { window.clearTimeout(postTimeout); }
    }

    function schedule() {
      window.clearTimeout(timer);
      if (disposed || !ready || sent || document.visibilityState !== "visible") return;
      try { if (window.sessionStorage.getItem(marker) === countDay()) return; }
      catch { /* The signed first-party cookie remains the authoritative daily check. */ }
      timer = window.setTimeout(() => void record(), VIEW_DELAY_MS);
    }

    document.addEventListener("visibilitychange", schedule);
    void (async () => {
      try {
        // Reading a total never increments it. The later POST is only sent for a visible page.
        const response = await fetch(`/api/reading-views?articleId=${articleId}`, { credentials: "same-origin", cache: "no-store", signal: abort.signal });
        const data = await response.json().catch(() => null);
        const count = publicCount(data?.count);
        if (!response.ok || count === null || disposed) return;
        showCount(count);
        ready = true;
        schedule();
      } catch { /* Hide an unavailable total rather than displaying a made-up zero. */ }
      finally { window.clearTimeout(getTimeout); }
    })();

    return () => {
      disposed = true;
      abort.abort();
      window.clearTimeout(timer);
      window.clearTimeout(getTimeout);
      window.clearTimeout(postTimeout);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [articleId]);

  if (value?.articleId !== articleId) return null;
  return (
    <span className="whitespace-nowrap text-[11px] font-normal normal-case tracking-normal text-[#75665C] tabular-nums"
      title="Views since counting began. Repeat visits from the same browser count once per UTC day."
      aria-label={`${value.count.toLocaleString("en")} ${value.count === 1 ? "view" : "views"}`}>
      {separator && <span aria-hidden="true" className="mr-2">·</span>}
      {compactCount(value.count)} {value.count === 1 ? "view" : "views"}
    </span>
  );
}
