"use client";

import Link from "next/link";
import { embeddedBrowser, installDevice, type InstallDevice } from "@/lib/install-environment";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallContextValue = {
  prompt: InstallPromptEvent | null;
  clearPrompt: (usedPrompt: InstallPromptEvent) => void;
  installed: boolean;
  device: InstallDevice;
  embedded: boolean;
};

const InstallContext = createContext<InstallContextValue | null>(null);

function subscribeToDisplayMode(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  if (!media.addEventListener) {
    if (media.addListener) {
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
    return () => {};
  }
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function serverStandalone() {
  return false;
}

function subscribeToEnvironment() { return () => {}; }
function browserDevice() { return installDevice(navigator); }
function serverDevice(): InstallDevice { return "desktop"; }
function browserEmbedded() { return embeddedBrowser(navigator.userAgent); }

export function useInstallState() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("Installation controls must be inside InstallProvider");
  return context;
}

// Listen across routes so an Android prompt received on Home is still
// available when the reader opens the installation page.
export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [completed, setCompleted] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalone,
    serverStandalone
  );
  const device = useSyncExternalStore(subscribeToEnvironment, browserDevice, serverDevice);
  const embedded = useSyncExternalStore(subscribeToEnvironment, browserEmbedded, serverStandalone);

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setPrompt(null);
      setCompleted(true);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    // Register without requesting notification permission or caching pages.
    // This also supports browsers whose install promotion needs a worker.
    if (window.isSecureContext && "serviceWorker" in navigator) {
      try {
        void navigator.serviceWorker.register("/quote-reminders-sw.js", {
          scope: "/", updateViaCache: "none",
        }).catch(() => { /* Reminders offer a retry if registration fails. */ });
      } catch {
        // Restricted browsers must still show their installation instructions.
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function clearPrompt(usedPrompt: InstallPromptEvent) {
    setPrompt((current) => (current === usedPrompt ? null : current));
  }

  return (
    <InstallContext.Provider
      value={{ prompt, clearPrompt, installed: standalone || completed, device, embedded }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function InstallEntryLink() {
  const { installed, device } = useInstallState();
  return (
    <Link
      href={installed ? "/install#quote-reminders" : "/install"}
      className={"iserein-primary iserein-home-install iserein-install-entry" + (installed ? "" : " iserein-install-link")}
    >
      {installed ? "Reading reminders" : device === "ios" ? "Add to Home Screen" : "Install iSEREIN"}
      <span aria-hidden="true">{installed ? " →" : " ↓"}</span>
    </Link>
  );
}

export default function InstallControls() {
  const { prompt, clearPrompt, installed, device, embedded } = useInstallState();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const canPrompt = prompt && !embedded && device !== "ios";

  async function install() {
    if (!prompt || pending) return;

    setPending(true);
    setMessage("");

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Follow your browser’s instructions to finish installing."
          : "You can add iSEREIN later using the steps below."
      );
    } catch {
      setMessage("Use the steps below to add iSEREIN to your home screen.");
    } finally {
      clearPrompt(prompt);
      setPending(false);
    }
  }

  if (installed) {
    return (
      <div className="iserein-install-controls">
        <p role="status">iSEREIN is ready to open from your home screen.</p>
        <Link href="/reading" className="iserein-primary iserein-install-button">
          Continue reading <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="iserein-install-controls">
      {canPrompt ? (
        <button
          type="button"
          onClick={() => void install()}
          disabled={pending}
          className="iserein-primary iserein-install-button"
        >
          {pending ? "Opening installation…" : "Install iSEREIN"}
          {!pending && <span aria-hidden="true">↓</span>}
        </button>
      ) : (
        <a href="#install-device-steps" className="iserein-primary iserein-install-button iserein-install-guide-link">
          {device === "ios" ? "Show iPhone installation steps" : "Show installation steps"}
          <span aria-hidden="true"> ↓</span>
        </a>
      )}
      <p role="status" aria-live="polite">
        {message ||
          (canPrompt
            ? "Confirm in your browser to add iSEREIN to this device."
            : embedded
              ? "Open this website in Safari on iPhone or Chrome on Android. Use the link and steps below."
              : device === "ios"
                ? "On iPhone, use Safari’s Share menu to add iSEREIN to your Home Screen."
                : "Use your browser’s install menu, or follow the steps below.")}
      </p>
    </div>
  );
}
