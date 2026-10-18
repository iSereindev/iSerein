import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import InstallControls from "../InstallApp";

export const metadata: Metadata = {
  title: "Install iSEREIN — A page for yourself",
  description:
    "Add iSEREIN to your home screen on iPhone or Android and return to your reading in a tap.",
};

export default function InstallPage() {
  return (
    <main className="iserein-install-page">
      <header className="iserein-home-header">
        <div className="iserein-home-container iserein-home-header-inner">
          <Link href="/" className="iserein-brand" aria-label="iSEREIN home">
            iSEREIN
          </Link>
          <Link href="/" className="iserein-home-text-link">
            Back to reading <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div className="iserein-install-container">
        <section className="iserein-install-intro" aria-labelledby="install-heading">
          <Image
            src="/icons/iserein-192.png"
            width={88}
            height={88}
            alt=""
            priority
            className="iserein-install-icon"
          />
          <p className="iserein-home-eyebrow">A little space of your own</p>
          <h1 id="install-heading">Install iSEREIN.</h1>
          <p className="iserein-install-description">
            Your daily reading, a tap away. Add iSEREIN to your home screen
            and open it in its own app window.
          </p>
          <InstallControls />
        </section>

        <div className="iserein-install-steps">
          <section aria-labelledby="install-iphone-heading">
            <span className="iserein-install-step-label">iPhone &amp; iPad</span>
            <h2 id="install-iphone-heading">Add with Safari.</h2>
            <ol>
              <li>Open this website in <strong>Safari</strong>.</li>
              <li>Tap <strong>Share</strong> in the browser toolbar or menu.</li>
              <li>Choose <strong>Add to Home Screen</strong>.</li>
              <li>
                Turn on <strong>Open as Web App</strong> if shown, then tap{" "}
                <strong>Add</strong>.
              </li>
            </ol>
          </section>

          <section aria-labelledby="install-android-heading">
            <span className="iserein-install-step-label">Android</span>
            <h2 id="install-android-heading">Add with Chrome.</h2>
            <ol>
              <li>Open this website in <strong>Chrome</strong>.</li>
              <li>Tap the <strong>three-dot menu</strong>.</li>
              <li>
                Choose <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>. Some versions show{" "}
                <strong>Install and create shortcut</strong> first.
              </li>
              <li>Tap <strong>Install</strong> and follow the confirmation.</li>
            </ol>
          </section>
        </div>

        <aside className="iserein-install-notes" aria-label="Installation notes">
          <p>
            Opened this link inside another app? Open it in Safari on iPhone
            or Chrome on Android to install. On a computer, use your browser’s
            install option when available.
          </p>
          <p>
            An internet connection is needed to load readings. Your saved
            collection stays in the browser or installed app where you save
            it; it doesn’t sync between devices.
          </p>
        </aside>

        <footer className="iserein-install-footer">
          <Link href="/" className="iserein-home-text-link">
            Return to iSEREIN <span aria-hidden="true">→</span>
          </Link>
          <span className="iserein-footer-brand">Read slowly. Live deeply.</span>
        </footer>
      </div>
    </main>
  );
}
