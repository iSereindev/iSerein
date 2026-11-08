import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/app/BrandLogo";
import InstallControls from "../InstallApp";
import InstallHelp from "../InstallHelp";
import QuoteReminders from "../QuoteReminders";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Install iSEREIN",
  description:
    "Add iSEREIN to your home screen on iPhone or Android and return to your reading in a tap.",
  path: "/install",
});

export default function InstallPage() {
  return (
    <main className="iserein-install-page">
      <header className="iserein-home-header">
        <div className="iserein-home-container iserein-home-header-inner">
          <Link href="/" className="iserein-brand" aria-label="iSEREIN home">
            <BrandLogo />
          </Link>
          <Link href="/" className="iserein-home-text-link">
            Back to reading <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div className="iserein-install-container">
        <section className="iserein-install-intro" aria-labelledby="install-heading">
          <Image
            src="/icons/iserein-signature-v1-192.png"
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

        <section id="quote-reminders" className="iserein-install-notes" aria-labelledby="quote-reminders-heading">
          <h2 id="quote-reminders-heading" className="font-serif text-2xl text-[#33241D]">Daily quote reminders.</h2>
          <p>Choose one quote a day on this device. You can turn reminders off here at any time.</p>
          <QuoteReminders label="Manage daily reminders" openOnHash="#quote-reminders" inlineInstallHelp={false} />
        </section>

        <InstallHelp />

        <aside className="iserein-install-notes" aria-label="Installation notes">
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
