import Link from "next/link";
import BrandLogo from "@/app/BrandLogo";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "About & Contact",
  description:
    "A space for thoughtful reading about the self, life, and change. Get in touch with iSEREIN for feedback, questions, or reading suggestions.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="iserein-about-page">
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

      <div className="iserein-about-container">
        <section className="iserein-about-intro" aria-labelledby="about-heading">
          <h1 id="about-heading">About iSEREIN.</h1>
          <p>
            iSEREIN brings together readings and philosophical ideas about the
            self, life, and change.
          </p>
          <p>
            A space to consider unfamiliar perspectives, revisit familiar
            questions, and find words worth carrying with you.
          </p>
        </section>

        <section className="iserein-about-contact" aria-labelledby="contact-heading">
          <h2 id="contact-heading">Send private feedback.</h2>
          <p>For private feedback, questions, or reading suggestions. Your message is not posted in discussions:</p>
          <a href="mailto:isereindev@gmail.com" className="iserein-about-email">
            isereindev@gmail.com <span aria-hidden="true">↗</span>
          </a>
        </section>
      </div>
    </main>
  );
}
