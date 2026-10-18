"use client";

import Link from "next/link";
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
};

const InstallContext = createContext<InstallContextValue | null>(null);

function subscribeToDisplayMode(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
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
      value={{ prompt, clearPrompt, installed: standalone || completed }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export default function InstallControls() {
  const context = useContext(InstallContext);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  if (!context) {
    throw new Error("InstallControls must be inside InstallProvider");
  }

  const { prompt, clearPrompt, installed } = context;

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
      {prompt && (
        <button
          type="button"
          onClick={() => void install()}
          disabled={pending}
          className="iserein-primary iserein-install-button"
        >
          {pending ? "Opening installation…" : "Install iSEREIN"}
          {!pending && <span aria-hidden="true">↓</span>}
        </button>
      )}
      <p role="status" aria-live="polite">
        {message ||
          (prompt
            ? "Confirm in your browser to add iSEREIN to this device."
            : "Follow the steps for your device below.")}
      </p>
    </div>
  );
}
