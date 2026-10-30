"use client";

import { useEffect, useId, useRef, useState } from "react";

type ShareButtonProps = {
  title: string;
  url: string;
};

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "manual">("idle");
  const busy = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const fallbackId = useId();
  const statusId = useId();

  useEffect(() => {
    if (state === "manual") {
      input.current?.focus();
      input.current?.select();
    }
    if (state === "copied") {
      const timer = window.setTimeout(() => setState("idle"), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [state]);

  function closeLink() {
    setState("idle");
    button.current?.focus();
  }

  async function shareReading() {
    if (busy.current) return;
    busy.current = true;
    setState("busy");

    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `${title} — iSEREIN`, url });
          setState("idle");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setState("idle");
            return;
          }
        }
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          setState("copied");
          return;
        } catch {
          // Keep the link available when clipboard permission is unavailable.
        }
      }
      setState("manual");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="relative shrink-0" onKeyDown={(event) => {
      if (event.key === "Escape" && state === "manual") closeLink();
    }}>
      <button
        ref={button}
        type="button"
        onClick={shareReading}
        aria-disabled={state === "busy"}
        aria-label="Share this reading"
        aria-busy={state === "busy"}
        aria-expanded={state === "manual"}
        aria-controls={state === "manual" ? fallbackId : undefined}
        aria-describedby={statusId}
        className="iserein-save-button w-12 rounded-full px-3 py-3 text-sm font-medium aria-disabled:cursor-wait min-[360px]:w-auto sm:px-5"
      >
        <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {state === "copied" ? <path d="m5 12 4 4L19 6" /> : <>
            <path d="M12 16V3m-4 4 4-4 4 4" />
            <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
          </>}
        </svg>
        <span className="hidden min-[360px]:inline">{state === "copied" ? "Copied" : "Share"}</span>
      </button>

      <span id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {state === "copied" ? "Reading link copied." : state === "manual" ? "Copy the reading link below to share it." : ""}
      </span>

      {state === "manual" && (
        <div id={fallbackId} role="group" aria-label="Copy reading link" className="absolute right-0 top-full z-20 mt-3 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-[#D8CCC0] bg-[#FFFCF8] p-4 text-left shadow-lg">
          <label htmlFor={`${fallbackId}-link`} className="text-sm text-[#33241D]">Copy this link to share:</label>
          <input
            ref={input}
            id={`${fallbackId}-link`}
            type="text"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-lg border border-[#D8CCC0] bg-[#FFF9F0] px-3 py-3 text-sm text-[#33241D]"
          />
          <button type="button" onClick={closeLink} className="mt-2 min-h-11 px-2 text-sm text-[#805334] underline underline-offset-4">Close</button>
        </div>
      )}
    </div>
  );
}
