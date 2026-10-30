"use client";

import Link from "next/link";

export default function WatchError({ retry }: { retry: () => void }) {
  return (
    <main className="min-h-screen bg-[#F6F0E8] px-6 py-20 text-center text-[#33241D]">
      <Link href="/" className="iserein-brand">iSEREIN</Link>
      <h1 className="mt-12 font-serif text-3xl font-normal md:text-5xl">The videos couldn’t load.</h1>
      <p className="mx-auto mt-5 max-w-md leading-8 text-[#75665C]">Please try again in a moment.</p>
      <button type="button" onClick={retry} className="iserein-primary mt-7 rounded-full px-7 py-3 text-sm">Try again</button>
      <p className="mt-6"><Link href="/" className="text-sm text-[#805334] underline underline-offset-4">Return to reading</Link></p>
    </main>
  );
}
