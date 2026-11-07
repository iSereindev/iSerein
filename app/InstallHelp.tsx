"use client";

import { useId, useState } from "react";
import { INSTALL_GUIDES, type InstallDevice } from "@/lib/install-environment";
import { useInstallState } from "./InstallApp";

const WEBSITE = "https://iserein.app/";

function Guide({ device, compact }: { device: InstallDevice; compact: boolean }) {
  const id = useId();
  const guide = INSTALL_GUIDES[device];
  const Heading = compact ? "h4" : "h2";
  return (
    <section aria-labelledby={id}>
      <span className="iserein-install-step-label">{guide.label}</span>
      <Heading id={id}>{guide.heading}</Heading>
      <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </section>
  );
}

export default function InstallHelp({ compact = false }: { compact?: boolean }) {
  const { device, embedded, installed } = useInstallState();
  const [message, setMessage] = useState("");
  const id = useId();
  if (installed && !compact) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(WEBSITE);
      setMessage("Website link copied. Paste it into Safari on iPhone or Chrome on Android.");
    } catch {
      setMessage("Press and hold the website link below to copy it, then paste it into Safari or Chrome.");
    }
  }

  return (
    <div
      id={compact ? undefined : "install-device-steps"}
      className={"iserein-install-help" + (compact ? " iserein-install-help-compact" : "")}
    >
      <div className="iserein-install-browser-note">
        <p>
          <strong>{embedded ? "This page appears to be open inside another app." : "Opened this link inside another app?"}</strong>
          {" "}Use that app’s menu to choose Open in Safari or Open in Chrome when offered.
          Otherwise, copy the website link below and paste it into your browser.
        </p>
        <div className="iserein-install-copy">
          <label htmlFor={id}>Website link</label>
          <input id={id} type="url" readOnly value={WEBSITE} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={() => void copyLink()}>Copy website link</button>
        </div>
        <p role="status" aria-live="polite">{message}</p>
      </div>
      <div className="iserein-install-steps iserein-install-device">
        <Guide device={device} compact={compact} />
      </div>
      <details className="iserein-install-other-devices">
        <summary>Steps for other devices</summary>
        <div className="iserein-install-steps">
          {(["ios", "android", "desktop"] as const).filter((item) => item !== device)
            .map((item) => <Guide key={item} device={item} compact={compact} />)}
        </div>
      </details>
    </div>
  );
}
