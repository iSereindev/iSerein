"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useReadHistory from "./useReadHistory";
import { getReadIds } from "@/lib/reading-history";

type Reading = { id: number; title: string; published_date: string };
type Props = { articles: Reading[]; topic: string; currentId?: number };

function TopicList({ articles, topic, currentId, read, unread = false }: Props & { read: number[] | null; unread?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const title = unread ? "Unread" : "Latest readings";
  const loading = unread && read === null;
  const available = unread ? articles.filter(article => read !== null && !read.includes(article.id)) : articles;
  const filtered = available.filter(article => article.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const href = (id: number) => `/topics/${encodeURIComponent(topic)}?reading=${id}#topic-reading`;

  function surprise() {
    // Re-read on click: completion may have changed in another tab since rendering.
    const completed = new Set([...(read || []), ...getReadIds()]);
    const candidates = filtered.filter(article => !completed.has(article.id));
    const otherPages = candidates.filter(article => article.id !== currentId);
    const pool = otherPages.length ? otherPages : candidates;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen) router.push(href(chosen.id));
  }

  return <details open={!unread && currentId === undefined} className="rounded-2xl border border-[#33241D]/15 bg-[#FFFDF9] px-5">
    <summary className="cursor-pointer py-4 text-sm font-medium">
      {title}<span className="ml-2 font-normal text-[#75665C]">{loading ? "…" : available.length}</span>
    </summary>
    <section aria-label={`${topic} — ${title}`} className="border-t border-[#33241D]/10 pb-3 pt-3">
      {loading ? <p role="status" className="py-3 text-sm text-[#75665C]">Finding your unread pages…</p> : <>
        {unread && available.length > 0 && <button type="button" onClick={surprise} disabled={!filtered.length}
          className="mb-3 inline-flex min-h-11 items-center rounded-full bg-[#5B3A2D] px-5 text-sm text-[#FFF9F0] disabled:opacity-40">
          Surprise me →
        </button>}
        {available.length > 0 && <input type="search" aria-label={`Search ${title.toLowerCase()} in ${topic}`} placeholder="Find a title…"
          value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}
          className="mb-1 min-h-11 w-full rounded-lg border border-[#33241D]/15 bg-transparent px-3 text-sm" />}
        <ul className="divide-y divide-[#33241D]/10">
          {filtered.slice(currentPage * 6, currentPage * 6 + 6).map(article => <li key={article.id}>
            <Link href={href(article.id)} aria-current={currentId === article.id ? "page" : undefined}
              className="flex min-h-14 items-center justify-between gap-4 py-3">
              <span className="font-serif text-lg">{article.title}</span>
              <span className="shrink-0 text-xs text-[#75665C]">{read?.includes(article.id) ? "✓ Read" : currentId === article.id ? "Open" : "→"}</span>
            </Link>
          </li>)}
        </ul>
        {!filtered.length && <p className="py-4 text-sm text-[#75665C]">
          {!available.length ? unread && articles.length ? "You’re all caught up." : "New readings will appear here." : "No matching titles."}
        </p>}
        {pages > 1 && <nav aria-label={`${topic} ${title.toLowerCase()} pages`} className="flex items-center justify-between border-t border-[#33241D]/10 pt-2 text-sm">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="min-h-11 px-2 disabled:opacity-30">← Previous</button>
          <span aria-live="polite" className="text-xs text-[#75665C]">{currentPage + 1} / {pages}</span>
          <button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="min-h-11 px-2 disabled:opacity-30">Next →</button>
        </nav>}
      </>}
    </section>
  </details>;
}

export default function TopicReadingDirectory(props: Props) {
  const read = useReadHistory();
  const ordered = [...props.articles].sort((a, b) => b.published_date.localeCompare(a.published_date) || b.id - a.id);
  return <div key={`${props.topic}:${props.currentId ?? "index"}`} className="mb-6 space-y-3">
    <TopicList {...props} articles={ordered} read={read} />
    <TopicList {...props} articles={ordered} read={read} unread />
  </div>;
}
