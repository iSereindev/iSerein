"use client";
import Link from "next/link";
import { useState } from "react";
import type { ReadingSummary } from "@/lib/reading-moods";
import useReadHistory from "./useReadHistory";

export default function ReadingDirectory({ articles, topic, currentId }: { articles: ReadingSummary[]; topic: string; currentId?: number }) {
  const read = useReadHistory();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(8);
  const filtered = unreadOnly && read ? articles.filter(article => !read.includes(article.id)) : articles;
  const next = read ? articles.find(article => article.id !== currentId && !read.includes(article.id)) : undefined;
  const href = (id: number) => `/topics/${encodeURIComponent(topic)}?reading=${id}#topic-reading`;
  return <section aria-label={`${topic} reading list`} className="mb-8 rounded-2xl border border-[#33241D]/15 bg-[#FFFDF9] p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-serif text-2xl">Pages in {topic}</h2>
      {next && <Link href={href(next.id)} className="rounded-full bg-[#5B3A2D] px-5 py-3 text-sm text-[#FFF9F0]">Next unread →</Link>}
    </div>
    <p className="mt-2 text-xs text-[#75665C]">Newest first · Read history stays on this browser.</p>
    <label className="mt-4 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} disabled={read === null} onChange={event => { setUnreadOnly(event.target.checked); setLimit(8); }} /> Unread only</label>
    <ul className="divide-y divide-[#33241D]/10">{filtered.slice(0, limit).map(article => <li key={article.id}><Link href={href(article.id)} aria-current={currentId === article.id ? "page" : undefined} className="flex items-center justify-between gap-4 py-4">
      <span><span className="font-serif text-lg">{article.title}</span><time dateTime={article.published_date} className="mt-1 block text-xs text-[#75665C]">{article.published_date}</time></span>
      <span className="shrink-0 text-xs text-[#75665C]">{read?.includes(article.id) ? "✓ Read" : currentId === article.id ? "Open" : "→"}</span>
    </Link></li>)}</ul>
    {!filtered.length && <p className="py-4 text-sm">{unreadOnly ? "You’ve read every page here. Come back for new readings." : "New readings will appear here when published."}</p>}
    {filtered.length > limit && <button type="button" className="mt-3 min-h-11 text-sm underline" onClick={() => setLimit(value => value + 8)}>Show more titles</button>}
  </section>;
}
