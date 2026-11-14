"use client";
import { useEffect, useState } from "react";
import { getReadIds, READ_EVENT, READ_KEY } from "@/lib/reading-history";
import { READ_SYNC_BATCH_SIZE } from "@/lib/reminder-read-sync";

/** Only an enabled, cookie-owned reminder subscription receives completed-reading IDs. */
export default function useReminderReadSync(enabled: boolean) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const sent = new Set<number>();
    let disposed = false, running = false, dirty = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function sync() {
      if (disposed) return;
      if (running) { dirty = true; return; }
      running = true;
      dirty = false;
      try {
        const remaining = getReadIds().filter(id => !sent.has(id));
        for (let start = 0; start < remaining.length; start += READ_SYNC_BATCH_SIZE) {
          if (disposed) return;
          const ids = remaining.slice(start, start + READ_SYNC_BATCH_SIZE);
          controller = new AbortController();
          const timeout = setTimeout(() => controller?.abort(), 10000);
          try {
            const response = await fetch("/api/quote-reminders", {
              method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sync-read-history", readIds: ids }),
              signal: controller.signal,
            });
            const result = await response.json();
            if (!response.ok || result.accepted !== true) throw new Error("History sync pending");
            ids.forEach(id => sent.add(id));
          } finally { clearTimeout(timeout); }
        }
        if (!disposed) setPending(false);
      } catch { if (!disposed) setPending(true); }
      finally {
        running = false;
        if (dirty && !disposed) schedule();
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => void sync(), 150);
    }
    function storage(event: StorageEvent) { if (!event.key || event.key === READ_KEY) schedule(); }
    function leaving() { clearTimeout(timer); void sync(); }
    function visible() { if (document.visibilityState === "visible") schedule(); }
    schedule();
    window.addEventListener(READ_EVENT, schedule);
    window.addEventListener("storage", storage);
    window.addEventListener("online", schedule);
    window.addEventListener("pagehide", leaving);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true; clearTimeout(timer); controller?.abort();
      window.removeEventListener(READ_EVENT, schedule);
      window.removeEventListener("storage", storage);
      window.removeEventListener("online", schedule);
      window.removeEventListener("pagehide", leaving);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled]);
  return enabled && pending;
}
