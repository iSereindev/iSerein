"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { decodePushKey, quoteTimeWindow } from "@/lib/quote-reminders";

type Phase = "loading" | "ready" | "on" | "blocked" | "install" | "unsupported" | "unavailable" | "error";
type Config = { ready: boolean; publicKey?: string; enabled?: boolean | null };

class ReminderError extends Error { reenable = false; }

function appleDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function waitForWorker() {
  let timer: number | undefined;
  try {
    return await Promise.race([
      (async () => { await navigator.serviceWorker.register("/quote-reminders-sw.js", { scope: "/", updateViaCache: "none" }); return navigator.serviceWorker.ready; })(),
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error("Please reopen reminders and try again.")), 12000); }),
    ]);
  } finally { window.clearTimeout(timer); }
}

function matchesKey(subscription: PushSubscription, key: string) {
  const bytes = subscription.options.applicationServerKey;
  if (!bytes) return false;
  const expected = decodePushKey(key), actual = new Uint8Array(bytes);
  return actual.length === expected.length && actual.every((byte, i) => byte === expected[i]);
}

export default function QuoteReminders({ label = "Daily quote reminder" }: { label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<Config>({ ready: false });
  const [busy, setBusy] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const [windowLabel, setWindowLabel] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);

  async function request(action: string, subscription?: PushSubscription | null) {
    const abort = new AbortController(); const timeout = window.setTimeout(() => abort.abort(), 20000);
    try {
      const response = await fetch("/api/quote-reminders", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, subscription: subscription?.toJSON() }), signal: abort.signal });
      const value = await response.json().catch(() => null);
      if (!response.ok || value?.accepted !== true) {
        const cause = new ReminderError(typeof value?.error === "string" ? value.error : "We couldn’t confirm your reminder settings. Please try again.");
        cause.reenable = value?.reenable === true; throw cause;
      }
    } finally { window.clearTimeout(timeout); }
  }

  async function prepare() {
    const current = ++generation.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setPhase("loading"); setMessage(""); setError(""); setWindowLabel(quoteTimeWindow());
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (appleDevice() && !installed) { setPhase("install"); return; }
    if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setPhase("unsupported"); return; }
    if (Notification.permission === "denied") { setPhase("blocked"); return; }
    const timeout = window.setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch("/api/quote-reminders", { credentials: "same-origin", cache: "no-store", signal: abort.signal });
      const value: Config = await response.json();
      if (!response.ok) throw new Error("Reminders are unavailable right now. Please try again later.");
      if (current !== generation.current) return;
      if (!value.ready || !value.publicKey) { setPhase("unavailable"); return; }
      setConfig(value);
      const worker = await waitForWorker();
      const subscription = await worker.pushManager.getSubscription();
      if (current !== generation.current) return;
      registration.current = worker; setHasLocal(!!subscription);
      const active = value.enabled === true && Notification.permission === "granted" && subscription && matchesKey(subscription, value.publicKey);
      setPhase(active ? "on" : "ready");
      if (!active && (subscription || value.enabled)) setMessage("Reconnect reminders to keep receiving quotes on this device.");
    } catch {
      if (current === generation.current) { setPhase("error"); setError("Reminders could not be prepared. Please try again."); }
    } finally { window.clearTimeout(timeout); }
  }

  async function enable() {
    const worker = registration.current;
    if (busy || !worker || !config.publicKey) return;
    setBusy(true); setError(""); setMessage("");
    let created: PushSubscription | null = null;
    try {
      // Ask directly from the button gesture; preparing the worker never asks permission.
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setPhase(permission === "denied" ? "blocked" : "ready");
        setMessage("Reminders were not enabled. You can choose again when you’re ready."); return;
      }
      let subscription = await worker.pushManager.getSubscription();
      if (subscription && (config.enabled !== true || !matchesKey(subscription, config.publicKey))) { await subscription.unsubscribe(); subscription = null; }
      if (!subscription) { subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePushKey(config.publicKey) }); created = subscription; }
      await request("subscribe", subscription);
      setConfig({ ...config, enabled: true }); setHasLocal(true); setPhase("on"); setMessage("Daily quote reminders are on for this device.");
    } catch (cause) {
      if (created) { try { await created.unsubscribe(); } catch { /* The next attempt can reconnect it. */ } }
      setPhase("ready"); setError(cause instanceof ReminderError ? cause.message : "Your reminder could not be enabled. Please try again.");
    } finally { setBusy(false); }
  }

  async function disable() {
    if (busy) return;
    setBusy(true); setMessage(""); setError("");
    const subscription = await registration.current?.pushManager.getSubscription().catch(() => null);
    let serverOff = false, deviceOff = !subscription;
    try { await request("disable", subscription); serverOff = true; } catch { /* Also try to stop delivery on the device. */ }
    try { if (subscription) deviceOff = await subscription.unsubscribe() || !(await registration.current?.pushManager.getSubscription()); } catch { /* The server may already have confirmed the stop. */ }
    if (serverOff || deviceOff) {
      setConfig({ ...config, enabled: false }); setHasLocal(false); setPhase("ready"); setMessage("Daily reminders are off on this device.");
    } else setError("We couldn’t turn reminders off. Please try again, or block iSEREIN notifications in your device settings.");
    setBusy(false);
  }

  async function test() {
    if (busy) return;
    setBusy(true); setMessage(""); setError("");
    try { await request("test"); setMessage("Test quote sent. Your device may delay showing the notification."); }
    catch (cause) {
      if (cause instanceof ReminderError && cause.reenable) { setConfig({ ...config, enabled: false }); setPhase("ready"); }
      setError(cause instanceof ReminderError ? cause.message : "The test could not be sent. Please try again.");
    } finally { setBusy(false); }
  }

  const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-[#5B3A2D]/25 px-5 py-2.5 text-sm text-[#5B3A2D] transition-colors hover:bg-[#F6EFE7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D] disabled:opacity-50";
  return <div className="mt-6">
    <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#5B3A2D] underline decoration-[#5B3A2D]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D]" onClick={() => { if (open) { generation.current++; controller.current?.abort(); setOpen(false); } else { setOpen(true); void prepare(); } }}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{label}
    </button>
    {open && <section id={`${id}-panel`} aria-labelledby={`${id}-heading`} className="mt-3 max-w-xl rounded-2xl border border-[#5B3A2D]/15 bg-[#FFFCF8] p-5 text-left sm:p-6">
      <h3 id={`${id}-heading`} className="font-serif text-2xl font-normal leading-8 text-[#33241D]">A thought for your day.</h3>
      <p className="mt-2 text-sm leading-6 text-[#75665C]">One quote each day. No account or email needed.</p>
      <p className="mt-2 text-xs leading-5 text-[#75665C]">Sent around {windowLabel}. Your device may show it later.</p>
      {phase === "loading" && <p className="mt-4 text-sm text-[#75665C]" role="status">Preparing reminders…</p>}
      {phase === "install" && <p className="mt-4 text-sm leading-6 text-[#5B3A2D]">Add iSEREIN to your Home Screen, then open it from its icon to enable reminders. <Link href="/install" className="underline underline-offset-4">Installation steps</Link></p>}
      {phase === "unsupported" && <p className="mt-4 text-sm leading-6 text-[#5B3A2D]">This browser does not support quote notifications here. Try a supported browser, or open the installed iSEREIN app.</p>}
      {phase === "unavailable" && <p className="mt-4 text-sm leading-6 text-[#75665C]">Daily reminders aren’t available yet. Please try again later.</p>}
      {phase === "blocked" && <p className="mt-4 text-sm leading-6 text-[#5B3A2D]">Notifications are blocked. Allow iSEREIN notifications in your device or browser settings, then check again.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {phase === "ready" && <button type="button" disabled={busy} onClick={() => void enable()} className={`${button} bg-[#5B3A2D] text-[#FFF9F0] hover:bg-[#6B4937]`}>{busy ? "Working…" : "Enable daily reminders"}</button>}
        {phase === "on" && <button type="button" disabled={busy} onClick={() => void test()} className={button}>{busy ? "Working…" : "Send a test quote"}</button>}
        {(phase === "on" || phase === "ready" && (hasLocal || config.enabled)) && <button type="button" disabled={busy} onClick={() => void disable()} className={button}>Turn reminders off</button>}
        {["blocked", "error", "unavailable"].includes(phase) && <button type="button" onClick={() => void prepare()} className={button}>Check again</button>}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-[#75665C]">{message}</p>
      {error && <p role="alert" className="mt-2 text-sm leading-6 text-[#8C3D2B]">{error}</p>}
    </section>}
  </div>;
}
