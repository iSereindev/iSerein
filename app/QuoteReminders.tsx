"use client";

import Link from "next/link";
import { bounded, checkOperation } from "@/lib/reminder-operation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { decodePushKey } from "@/lib/quote-reminders";
import { embeddedBrowser, installDevice, reminderPrerequisite } from "@/lib/install-environment";
import InstallHelp from "./InstallHelp";
import ReminderSubscriberCount from "./ReminderSubscriberCount";
import { REMINDER_COUNT_EVENT } from "@/lib/reading-counts";

type Phase = "loading" | "ready" | "on" | "blocked" | "install" | "browser" | "unsupported" | "unavailable" | "error";
type Config = { ready: boolean; publicKey?: string; enabled?: boolean | null; localTime?: string; timeZone?: string; scheduleReady?: boolean };

class ReminderError extends Error { reenable = false; }

async function waitForWorker(signal: AbortSignal) {
  await bounded(navigator.serviceWorker.register("/quote-reminders-sw.js", { scope: "/", updateViaCache: "none" }), signal);
  checkOperation(signal);
  return bounded(navigator.serviceWorker.ready, signal);
}

function matchesKey(subscription: PushSubscription, key: string) {
  const bytes = subscription.options.applicationServerKey;
  if (!bytes) return false;
  const expected = decodePushKey(key), actual = new Uint8Array(bytes);
  return actual.length === expected.length && actual.every((byte, i) => byte === expected[i]);
}

export default function QuoteReminders({ label = "Daily quote reminder", openOnHash, inlineInstallHelp = true }: { label?: string; openOnHash?: string; inlineInstallHelp?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<Config>({ ready: false });
  const [busy, setBusy] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const [localTime, setLocalTime] = useState("08:00");
  const [timeZone, setTimeZone] = useState("UTC");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const localSubscription = useRef<PushSubscription | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); actionController.current?.abort(); }, []);

  async function request(action: string, signal: AbortSignal, subscription?: PushSubscription | null) {
    checkOperation(signal);
    const response = await bounded(fetch("/api/quote-reminders", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, subscription: subscription?.toJSON(), localTime, timeZone }),
      signal,
    }), signal);
    const value = await bounded(response.json(), signal);
    if (!response.ok || value?.accepted !== true) {
      const cause = new ReminderError(typeof value?.error === "string" ? value.error : "We couldn’t confirm your reminder settings. Please try again.");
      cause.reenable = value?.reenable === true; throw cause;
    }
    if (action === "subscribe" || action === "disable") window.dispatchEvent(new Event(REMINDER_COUNT_EVENT));
  }

  async function runAction(work: (signal: AbortSignal) => Promise<void>) {
    if (actionController.current) return;
    const abort = new AbortController();
    actionController.current = abort;
    setBusy(true); setError(""); setMessage("");
    const timer = window.setTimeout(() => abort.abort(new Error("This is taking longer than expected. Check the browser’s notification prompt or site permissions, then try again. Your settings have not been confirmed.")), 10000);
    try { await bounded(work(abort.signal), abort.signal); }
    catch (cause) {
      if (actionController.current === abort) { setMessage(""); setError(cause instanceof Error ? cause.message : "We couldn’t confirm your settings. Please try again."); }
    } finally {
      window.clearTimeout(timer);
      if (actionController.current === abort) { actionController.current = null; setBusy(false); }
    }
  }

  const prepare = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setPhase("loading"); setMessage(""); setError("");
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const prerequisite = reminderPrerequisite({
      device: installDevice(navigator), installed, embedded: embeddedBrowser(navigator.userAgent),
      supported: window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    });
    if (prerequisite) { setPhase(prerequisite); return; }
    if (Notification.permission === "denied") { setPhase("blocked"); return; }
    const timeout = window.setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch("/api/quote-reminders", { credentials: "same-origin", cache: "no-store", signal: abort.signal });
      const value: Config = await bounded(response.json(), abort.signal);
      if (!response.ok) throw new Error("Reminders are unavailable right now. Please try again later.");
      if (current !== generation.current) return;
      if (!value.ready || !value.publicKey) { setPhase("unavailable"); return; }
      setConfig(value);
      setLocalTime(value.localTime || "08:00");
      if (value.timeZone) setTimeZone(value.timeZone);
      // Opening settings never registers a worker or asks for permission.
      const worker = await bounded(navigator.serviceWorker.getRegistration("/"), abort.signal);
      const subscription = worker ? await bounded(worker.pushManager.getSubscription(), abort.signal) : null;
      if (current !== generation.current) return;
      registration.current = worker || null; localSubscription.current = subscription; setHasLocal(!!subscription);
      const active = value.enabled === true && Notification.permission === "granted" && subscription && matchesKey(subscription, value.publicKey);
      setPhase(active ? "on" : "ready");
      if (!active && (subscription || value.enabled)) setMessage("Reconnect reminders to keep receiving quotes on this device.");
    } catch {
      if (current === generation.current) { setPhase("error"); setError("Reminder settings did not load within ten seconds or could not be reached. Check your connection and try again."); }
    } finally { window.clearTimeout(timeout); }
  }, []);

  useEffect(() => {
    if (!openOnHash) return;
    function openFromLink() {
      if (window.location.hash !== openOnHash) return;
      setOpen(true);
      void prepare();
    }
    window.addEventListener("hashchange", openFromLink);
    const frame = window.requestAnimationFrame(openFromLink);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromLink);
    };
  }, [openOnHash, prepare]);

  function enable() {
    if (busy || actionController.current || !config.publicKey) return;
    // Request permission synchronously in the click handler, before any awaits.
    let permission: Promise<NotificationPermission>;
    try { permission = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission(); }
    catch { setError("The browser could not open notification permission. Check site settings and try again."); return; }
    const publicKey = config.publicKey;
    void runAction(async signal => {
      setMessage("Check your browser’s notification permission prompt…");
      const allowed = await bounded(permission, signal);
      checkOperation(signal);
      if (allowed !== "granted") {
        setPhase(allowed === "denied" ? "blocked" : "ready");
        setMessage("Reminders were not enabled. You can choose again when you’re ready.");
        return;
      }
      setMessage("Connecting this device…");
      const worker = await waitForWorker(signal);
      checkOperation(signal);
      registration.current = worker;
      let subscription = await bounded(worker.pushManager.getSubscription(), signal);
      checkOperation(signal);
      if (subscription && !matchesKey(subscription, publicKey)) {
        await bounded(subscription.unsubscribe(), signal);
        checkOperation(signal);
        subscription = null;
      }
      if (!subscription) subscription = await bounded(worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePushKey(publicKey) }), signal);
      checkOperation(signal);
      setMessage("Saving your reminder time…");
      await request("subscribe", signal, subscription);
      checkOperation(signal);
      localSubscription.current = subscription;
      setConfig({ ...config, enabled: true, localTime, timeZone });
      setHasLocal(true); setPhase("on");
      setMessage("Daily quote reminders are on. Your chosen time is saved.");
    });
  }

  function disable() {
    void runAction(async signal => {
      // Confirm the server stop first, even when the browser push service is slow.
      await request("disable", signal, localSubscription.current);
      checkOperation(signal);
      setConfig({ ...config, enabled: false }); setHasLocal(false); setPhase("ready");
      setMessage("Daily reminders are off on this device.");
      // The retained browser subscription can be reused if the reader opts in again.
    });
  }

  function test() {
    void runAction(async signal => {
      try { await request("test", signal); checkOperation(signal); setMessage("Test quote sent. Your device may delay showing the notification."); }
      catch (cause) {
        checkOperation(signal);
        if (cause instanceof ReminderError && cause.reenable) {
          setConfig({ ...config, enabled: false }); setPhase("ready");
          window.dispatchEvent(new Event(REMINDER_COUNT_EVENT));
        }
        throw cause;
      }
    });
  }

  const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-[#5B3A2D]/25 px-5 py-2.5 text-sm text-[#5B3A2D] transition-colors hover:bg-[#F6EFE7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D] disabled:opacity-50";
  return <div className="mt-6">
    <div className="flex flex-wrap items-center gap-x-3">
    <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#5B3A2D] underline decoration-[#5B3A2D]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D]" onClick={() => { if (open) { generation.current++; controller.current?.abort(); actionController.current?.abort(); actionController.current = null; setBusy(false); setOpen(false); } else { setOpen(true); void prepare(); } }}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{label}
    </button>
    <ReminderSubscriberCount />
    </div>
    {open && <section id={`${id}-panel`} aria-labelledby={`${id}-heading`} className="mt-3 max-w-xl rounded-2xl border border-[#5B3A2D]/15 bg-[#FFFCF8] p-5 text-left sm:p-6">
      <h3 id={`${id}-heading`} className="font-serif text-2xl font-normal leading-8 text-[#33241D]">A thought for your day.</h3>
      <p className="mt-2 text-sm leading-6 text-[#75665C]">One quote each day. No account or email needed.</p>
      <p className="mt-2 text-xs leading-5 text-[#75665C]">Choose a daily time. Delivery is approximate; your device may show it later.</p>
      {(phase === "ready" || phase === "on") && <div className="mt-4 space-y-3">
        <label className="block text-sm text-[#33241D]" htmlFor={`${id}-time`}>Reminder time
          <input id={`${id}-time`} type="time" required value={localTime} disabled={busy} onChange={event => setLocalTime(event.target.value)} className="ml-3 rounded-lg border border-[#5B3A2D]/25 bg-white p-2" />
        </label>
        <p className="text-xs text-[#75665C]">Time zone: {timeZone}. This follows daylight-saving changes in that zone.</p>
        <button type="button" disabled={busy} className="min-h-11 text-xs underline" onClick={() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}>Use this device’s current time zone</button>
      </div>}
      {phase === "loading" && <p className="mt-4 text-sm text-[#75665C]" role="status">Preparing reminders…</p>}
      {phase === "install" && <div className="mt-4 text-sm leading-6 text-[#5B3A2D]"><p>On iPhone and iPad, first add iSEREIN to your Home Screen, then open its icon to enable notifications.</p>{inlineInstallHelp ? <InstallHelp compact /> : <Link href="#install-device-steps" className="underline underline-offset-4">Follow the installation steps below</Link>}</div>}
      {phase === "browser" && <div className="mt-4 text-sm leading-6 text-[#5B3A2D]"><p>Open iSEREIN in Safari on iPhone or Chrome on Android to set up reminders. This app’s built-in browser may not support them.</p>{inlineInstallHelp ? <InstallHelp compact /> : <Link href="#install-device-steps" className="underline underline-offset-4">Open the browser and installation steps below</Link>}</div>}
      {phase === "unsupported" && <p className="mt-4 text-sm leading-6 text-[#5B3A2D]">This browser does not support quote notifications here. On iPhone or iPad, reminders need iOS 16.4 or later and the installed Home Screen app. <Link href="/install" className="underline underline-offset-4">See installation steps</Link></p>}
      {phase === "unavailable" && <p className="mt-4 text-sm leading-6 text-[#75665C]">Daily reminders aren’t available yet. Please try again later.</p>}
      {phase === "blocked" && <p className="mt-4 text-sm leading-6 text-[#5B3A2D]">Notifications are blocked. Allow iSEREIN notifications in your device or browser settings, then check again.</p>}
      {config.ready && config.scheduleReady === false && <p role="status" className="mt-3 text-sm text-[#8C3D2B]">Scheduled delivery is temporarily unavailable. You can save your preference, but reminders will resume only when delivery is restored.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {phase === "ready" && <button type="button" disabled={busy || !localTime} onClick={enable} className={`${button} bg-[#5B3A2D] text-[#FFF9F0] hover:bg-[#6B4937]`}>{busy ? "Working…" : "Enable daily reminders"}</button>}
        {phase === "on" && <button type="button" disabled={busy || !localTime} onClick={enable} className={button}>Save reminder time</button>}
        {phase === "on" && <button type="button" disabled={busy} onClick={() => void test()} className={button}>{busy ? "Working…" : "Send a test quote"}</button>}
        {(phase === "on" || phase === "ready" && (hasLocal || config.enabled)) && <button type="button" disabled={busy} onClick={() => void disable()} className={button}>Turn reminders off</button>}
        {["blocked", "error", "unavailable"].includes(phase) && <button type="button" disabled={busy} onClick={() => void prepare()} className={button}>Check again</button>}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-[#75665C]">{message}</p>
      {error && <p role="alert" className="mt-2 text-sm leading-6 text-[#8C3D2B]">{error}</p>}
    </section>}
  </div>;
}
