import Link from "next/link";
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
            iSEREIN
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
          <h2 id="contact-heading">Get in touch.</h2>
          <p>For feedback, questions, or reading suggestions:</p>
          <a href="mailto:isereindev@gmail.com" className="iserein-about-email">
            isereindev@gmail.com <span aria-hidden="true">↗</span>
          </a>
        </section>
      </div>
    </main>
  );
}
