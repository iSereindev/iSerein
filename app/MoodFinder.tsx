"use client";
import Link from "next/link";
import { useState } from "react";
import { MOODS, moodSuggestions, type Mood, type ReadingSummary } from "@/lib/reading-moods";
import useReadHistory from "./useReadHistory";

export default function MoodFinder({ articles }: { articles: ReadingSummary[] }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const read = useReadHistory();
  const results = mood ? moodSuggestions(articles, mood, read || []) : [];
  return <section aria-label="Find a reading for your mood" className="mx-auto my-8 max-w-4xl rounded-2xl border border-[#33241D]/15 bg-[#FFFDF9] p-6">
    <h2 className="font-serif text-2xl">Need a different page today?</h2>
    <p className="mt-2 text-sm text-[#75665C]">What do you need? Choose a direction for a few reading suggestions.</p>
    <div className="mt-5 flex flex-wrap gap-2">{MOODS.map(item => <button key={item.id} type="button" aria-pressed={mood === item.id} onClick={() => setMood(item.id)} className={`min-h-11 rounded-full border px-4 py-2 text-sm ${mood === item.id ? "border-[#5B3A2D] bg-[#5B3A2D] text-[#FFF9F0]" : "border-[#33241D]/20 text-[#33241D]"}`}>{item.label}</button>)}</div>
    <div aria-live="polite">
      {mood && results.length === 0 && <p className="mt-5 text-sm">No matching pages yet. Try another direction or <Link href="/reading" className="underline">read today&apos;s page</Link>.</p>}
      {mood && results.length > 0 && <details key={mood} className="mt-5 rounded-xl border border-[#33241D]/15">
        <summary className="cursor-pointer px-4 py-3 text-sm text-[#33241D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#805334]">
          Suggested readings <span className="ml-2 text-[#75665C]">({results.length})</span>
        </summary>
        <ul className="divide-y divide-[#33241D]/10 border-t border-[#33241D]/10 px-4">{results.map(article => <li key={article.id}><Link href={`/reading/${article.id}`} className="block py-4"><span className="font-serif text-xl">{article.title}</span><span className="mt-1 block text-xs text-[#75665C]">{article.topic}{read?.includes(article.id) ? " · ✓ Read" : ""}</span></Link></li>)}</ul>
      </details>}
    </div>
  </section>;
}
