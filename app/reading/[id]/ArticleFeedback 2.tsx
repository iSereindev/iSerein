"use client";

import { useCallback, useId, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { MAX_FEEDBACK_LENGTH, readStoredFeedback } from "@/lib/article-feedback";
import type { ArticleReaction } from "@/lib/article-feedback";

const CHANGE = "iserein-feedback-changed";
const serverSnapshot = () => null;

function Thumb({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={down ? { transform: "rotate(180deg)" } : undefined}>
    <path d="M7 10v11H3V10h4Z M7 10l4-8c2 0 3 1 3 3v4h5a2 2 0 0 1 2 2l-1 8a2 2 0 0 1-2 2H7" />
  </svg>;
}

export default function ArticleFeedback({ articleId }: { articleId: number }) {
  const id = useId();
  const storageKey = `iserein-article-feedback:${articleId}`;
  const snapshot = useCallback(() => {
    try { return window.localStorage.getItem(storageKey); } catch { return null; }
  }, [storageKey]);
  const subscribe = useCallback((changed: () => void) => {
    window.addEventListener("storage", changed);
    window.addEventListener(CHANGE, changed);
    return () => { window.removeEventListener("storage", changed); window.removeEventListener(CHANGE, changed); };
  }, []);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const stored = readStoredFeedback(raw);
  const [fallback, setFallback] = useState<{ reaction: ArticleReaction | null; commented: boolean } | null>(null);
  const current = fallback || stored;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function remember(reaction: ArticleReaction | null, commented: boolean) {
    const value = { reaction, commented };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      window.dispatchEvent(new Event(CHANGE));
      setFallback(null);
    } catch { setFallback(value); }
  }

  async function send(type: "reaction" | "comment", reaction?: ArticleReaction) {
    if (busy) return;
    setBusy(true); setError(""); setStatus("Sending…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/article-feedback", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, type, reaction, comment: type === "comment" ? message : undefined, website }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.accepted !== true) throw new Error(typeof result?.error === "string" ? result.error : "Your response was not saved. Please try again.");
      remember(reaction || current.reaction, type === "comment" || current.commented);
      setStatus(type === "comment" ? "Thank you. Your message has been sent privately." : "Thank you for sharing your thoughts.");
      if (type === "comment") { setMessage(""); setOpen(false); }
    } catch (cause) {
      setStatus("");
      setError(cause instanceof Error && !(cause instanceof TypeError) && cause.name !== "TimeoutError" && cause.name !== "AbortError" ? cause.message : "We couldn’t confirm your response. Please try again.");
    } finally { window.clearTimeout(timeout); setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim()) void send("comment");
  }

  const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D] disabled:cursor-wait disabled:opacity-60";
  return (
    <section aria-labelledby={`${id}-heading`} className="mx-auto mt-12 max-w-2xl border-t border-[#33241D]/10 pt-8 text-center md:mt-16">
      <h2 id={`${id}-heading`} className="font-serif text-2xl font-normal leading-8 text-[#33241D]">Did this speak to you?</h2>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3" role="group" aria-label="Your reaction to this reading">
        <button type="button" aria-pressed={current.reaction === "up"} aria-label="Thumbs up: this reading spoke to me" disabled={busy} className={`${button} ${current.reaction === "up" ? "border-[#5B3A2D] bg-[#5B3A2D] text-[#FFF9F0]" : "border-[#5B3A2D]/25 bg-transparent text-[#5B3A2D] hover:bg-[#F6EFE7]"}`} onClick={() => { if (current.reaction !== "up") void send("reaction", "up"); }}><Thumb />Yes</button>
        <button type="button" aria-pressed={current.reaction === "down"} aria-label="Thumbs down: this reading did not quite speak to me" disabled={busy} className={`${button} ${current.reaction === "down" ? "border-[#5B3A2D] bg-[#5B3A2D] text-[#FFF9F0]" : "border-[#5B3A2D]/25 bg-transparent text-[#5B3A2D] hover:bg-[#F6EFE7]"}`} onClick={() => { if (current.reaction !== "down") void send("reaction", "down"); }}><Thumb down />Not quite</button>
      </div>
      <button type="button" aria-expanded={open} aria-controls={`${id}-form`} className="mt-5 min-h-11 text-sm text-[#5B3A2D] underline decoration-[#5B3A2D]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D]" onClick={() => setOpen(value => !value)}>{open ? "Close message" : current.commented ? "Update your feedback" : "Share a thought"}</button>
      {open && <form id={`${id}-form`} onSubmit={submit} className="mt-4 text-left">
        <label htmlFor={`${id}-message`} className="text-sm text-[#5B3A2D]">What stayed with you, or what could be better?</label>
        <textarea id={`${id}-message`} value={message} onChange={event => setMessage(event.target.value)} maxLength={MAX_FEEDBACK_LENGTH} required rows={4} aria-describedby={`${id}-privacy`} className="mt-2 block w-full resize-y rounded-2xl border border-[#5B3A2D]/25 bg-[#FFFCF8] p-4 text-base leading-7 text-[#33241D] placeholder:text-[#75665C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3A2D]" />
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor={`${id}-website`}>Leave this empty</label><input id={`${id}-website`} name="website" type="text" value={website} onChange={event => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} /></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p id={`${id}-privacy`} className="text-xs leading-5 text-[#75665C]">{current.commented ? "Sending again replaces your previous message." : "Private feedback. No name or email needed."}</p>
          <button type="submit" disabled={busy || !message.trim()} className={`${button} border-[#5B3A2D] bg-[#5B3A2D] text-[#FFF9F0] disabled:cursor-default`}>{busy ? "Sending…" : "Send privately"}</button>
        </div>
      </form>}
      <p role="status" aria-live="polite" className="mt-2 text-sm leading-6 text-[#75665C]">{status}</p>
      {error && <p role="alert" className="mt-2 text-sm leading-6 text-[#8C3D2B]">{error}</p>}
    </section>
  );
}
