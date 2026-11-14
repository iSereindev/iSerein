"use client";
import Link from "next/link";
import { useState } from "react";
import type { ReadingSummary } from "@/lib/reading-moods";
import useReadHistory from "./useReadHistory";

export default function ReadingDirectory({ articles, topic, currentId, directLinks = false }: { articles: Pick<ReadingSummary, "id" | "title" | "published_date">[]; topic: string; currentId?: number; directLinks?: boolean }) {
  const read = useReadHistory();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const filtered = articles.filter(article => (!unreadOnly || !read?.includes(article.id)) && article.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const href = (id: number) => directLinks ? `/reading/${id}` : `/topics/${encodeURIComponent(topic)}?reading=${id}#topic-reading`;
  return <details key={currentId ?? "index"} open={currentId === undefined} className="mb-6 rounded-2xl border border-[#33241D]/15 bg-[#FFFDF9] px-5">
    <summary className="cursor-pointer py-4 text-sm font-medium">Browse {topic} <span className="ml-2 font-normal text-[#75665C]">{articles.length} {articles.length === 1 ? "page" : "pages"}</span></summary>
    <section aria-label={`${topic} reading list`} className="pb-3">
      <div className="flex flex-wrap items-center gap-3 border-t border-[#33241D]/10 pt-3">
        <input aria-label="Find a reading" type="search" placeholder="Find a title…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#33241D]/15 bg-transparent px-3 text-sm" />
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={unreadOnly} disabled={read === null} onChange={event => { setUnreadOnly(event.target.checked); setPage(0); }} /> Unread</label>
      </div>
      <ul className="divide-y divide-[#33241D]/10">{filtered.slice(currentPage * 6, currentPage * 6 + 6).map(article => <li key={article.id}>
        <Link href={href(article.id)} aria-current={currentId === article.id ? "page" : undefined} className="flex min-h-14 items-center justify-between gap-4 py-3">
          <span className="font-serif text-lg">{article.title}</span>
          <span className="shrink-0 text-xs text-[#75665C]">{read?.includes(article.id) ? "✓ Read" : currentId === article.id ? "Open" : "→"}</span>
        </Link>
      </li>)}</ul>
      {!filtered.length && <p className="py-5 text-sm text-[#75665C]">{query ? "No matching titles." : unreadOnly ? "You’re all caught up." : "New readings will appear here."}</p>}
      {pages > 1 && <nav aria-label="Reading list pages" className="flex items-center justify-between border-t border-[#33241D]/10 pt-2 text-sm">
        <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="min-h-11 px-2 disabled:opacity-30">← Previous</button>
        <span aria-live="polite" className="text-xs text-[#75665C]">{currentPage + 1} / {pages}</span>
        <button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="min-h-11 px-2 disabled:opacity-30">Next →</button>
      </nav>}
    </section>
  </details>;
}
