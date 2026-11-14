"use client";
import { READING_REMINDER_NAME } from "@/lib/reminder-labels";

import useReminderReadSync from "./useReminderReadSync";

import Link from "next/link";
import { bounded, checkOperation } from "@/lib/reminder-operation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { decodePushKey } from "@/lib/quote-reminders";
import { embeddedBrowser, installDevice, reminderPrerequisite } from "@/lib/install-environment";
import InstallHelp from "./InstallHelp";
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

export default function QuoteReminders({ label, openOnHash, inlineInstallHelp = true }: { label?: string; openOnHash?: string; inlineInstallHelp?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const readSyncPending = useReminderReadSync(phase === "on");
  const [config, setConfig] = useState<Config>({ ready: false });
  const [busy, setBusy] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const localTime = "09:00";
  const selectedKind = "reading";
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
      body: JSON.stringify({ action, subscription: subscription?.toJSON(), localTime, timeZone, kind: selectedKind }),
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
      // Opening settings never registers a worker or asks for permission.
      const worker = await bounded(navigator.serviceWorker.getRegistration("/"), abort.signal);
      const subscription = worker ? await bounded(worker.pushManager.getSubscription(), abort.signal) : null;
      if (current !== generation.current) return;
      registration.current = worker || null; localSubscription.current = subscription; setHasLocal(!!subscription);
      const active = value.enabled === true && Notification.permission === "granted" && subscription && matchesKey(subscription, value.publicKey);
      setPhase(active ? "on" : "ready");

    } catch {
      if (current === generation.current) { setPhase("error"); setError("Reminder settings did not load within ten seconds or could not be reached. Check your connection and try again."); }
    } finally { window.clearTimeout(timeout); }
  }, []);

  useEffect(() => { const frame = window.requestAnimationFrame(() => void prepare()); return () => window.cancelAnimationFrame(frame); }, [prepare]);

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

  useEffect(() => {
    if (phase !== "on" || busy || !localSubscription.current || (config.localTime === localTime && config.timeZone === timeZone)) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 10000);
    // Keep the saved schedule aligned with this device after travel, with no new permission prompt.
    void request("sync-timezone", abort.signal).then(() => {
      setConfig(current => ({ ...current, localTime, timeZone }));
    }).catch(() => setError("Couldn’t update your time zone. Open settings to retry."))
      .finally(() => window.clearTimeout(timer));
    return () => { abort.abort(); window.clearTimeout(timer); };
    // Automatic time-zone refresh never re-enables a disabled subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, config.localTime, config.timeZone, timeZone]);

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
      setOpen(false); setMessage("");
    });
  }

  function disable() {
    void runAction(async signal => {
      // Confirm the server stop first, even when the browser push service is slow.
      await request("disable", signal, localSubscription.current);
      checkOperation(signal);
      setConfig({ ...config, enabled: false }); setHasLocal(false); setPhase("ready");
      setMessage(`${READING_REMINDER_NAME} are off on this device.`);
      // The retained browser subscription can be reused if the reader opts in again.
    });
  }

  function test() {
    void runAction(async signal => {
      try { await request("test", signal); checkOperation(signal); setMessage("Test sent. It may take a moment to appear."); }
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
  const manageable = phase === "on" || phase === "ready";
  return <div className="mt-4 text-left">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {phase === "on" ? <span role="status" className="text-sm text-[#5B3A2D]">✓ {READING_REMINDER_NAME} on</span>
        : <button type="button" disabled={busy || phase === "loading"} onClick={() => phase === "ready" ? enable() : setOpen(true)}
          className={button}>{busy ? "Connecting…" : phase === "loading" ? "Checking reminders…" : READING_REMINDER_NAME}</button>}
      {phase !== "on" && <span className="text-xs text-[#75665C]">{label || "9 AM · based on this device’s read history"}</span>}
      <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} className="min-h-11 text-xs text-[#75665C] underline underline-offset-4" onClick={() => setOpen(value => !value)}>{open ? "Close" : phase === "on" ? "Manage" : "Options"}</button>
    </div>
    {open && <section id={`${id}-panel`} aria-label={READING_REMINDER_NAME} className="mt-2 max-w-xl rounded-xl border border-[#5B3A2D]/15 p-4">
      {manageable && <>
        <p className="text-sm leading-6 text-[#75665C]">Around 9 AM · {timeZone.replaceAll("_", " ")}. New readings first; otherwise, an unread page. All caught up? No notification.</p>
        <p className="mt-2 text-xs leading-5 text-[#75665C]">Completed-reading IDs sync privately for this device. No account needed.</p>
        {readSyncPending && <p role="status" className="mt-2 text-xs text-[#8C3D2B]">Read-history sync is pending. We’ll retry when you’re online.</p>}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={enable} className={button}>{phase === "on" ? "Save" : "Enable"}</button>
          {phase === "on" && <button type="button" disabled={busy} onClick={test} className={button}>Test</button>}
          {(phase === "on" || hasLocal || config.enabled) && <button type="button" disabled={busy} onClick={disable} className={button}>Turn off</button>}
        </div>
      </>}
      {phase === "loading" && <p className="text-sm" role="status">Checking reminders…</p>}
      {phase === "install" && <div className="text-sm leading-6"><p>On iPhone or iPad, add iSEREIN to your Home Screen and open it there to enable notifications.</p>{inlineInstallHelp ? <InstallHelp compact /> : <Link href="#install-device-steps" className="underline">Installation steps</Link>}</div>}
      {phase === "browser" && <p className="text-sm leading-6">Open this page in Safari or Chrome to enable notifications. <Link href="/install" className="underline">Help</Link></p>}
      {phase === "unsupported" && <p className="text-sm leading-6">This browser cannot receive notifications. <Link href="/install" className="underline">See supported options</Link></p>}
      {phase === "blocked" && <p className="text-sm leading-6">Notifications are blocked. Allow them in your browser’s site settings, then check again.</p>}
      {phase === "unavailable" && <p className="text-sm">Reminders are unavailable right now.</p>}
      {["blocked", "error", "unavailable"].includes(phase) && <button type="button" disabled={busy} onClick={() => void prepare()} className={button}>Check again</button>}
    </section>}
    {config.ready && config.scheduleReady === false && (phase === "on" || open) && <p role="status" className="mt-2 text-xs text-[#8C3D2B]">{phase === "on" ? "Delivery is temporarily paused. Your preference is saved." : "Scheduled delivery is temporarily unavailable."}</p>}
    {message && <p role="status" aria-live="polite" className="mt-2 text-xs text-[#75665C]">{message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-[#8C3D2B]">{error}</p>}
  </div>;
}
