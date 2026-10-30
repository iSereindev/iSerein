import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — iSEREIN",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F6F0E8] px-6 py-24 text-center text-[#33241D]">
      <Link href="/" className="iserein-brand" aria-label="iSEREIN home">iSEREIN</Link>
      <h1 className="mt-12 font-serif text-3xl font-normal md:text-5xl">This page could not be found.</h1>
      <p className="mx-auto mt-6 max-w-md text-base leading-8 text-[#75665C]">
        The link may have changed, or this reading may not be available yet.
      </p>
      <Link href="/" className="iserein-primary mt-8 rounded-full px-7 py-3 text-sm">
        Return to reading <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
