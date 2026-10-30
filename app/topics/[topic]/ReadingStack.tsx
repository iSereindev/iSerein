"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

type ReadingStackProps = {
  articleId: number;
  title: string;
  topic: string;
  currentHref: string;
  previousHref: string | null;
  nextHref: string | null;
  underneath: number;
  children: ReactNode;
};

type Gesture = { id: number; x: number; y: number; horizontal: boolean };

export default function ReadingStack({
  articleId, title, topic, currentHref, previousHref, nextHref, underneath, children,
}: ReadingStackProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState(1);
  const region = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const turning = useRef(false);
  const lastArticle = useRef(articleId);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    // Preserve the selected reading and mix when refreshing or returning here.
    if (window.location.pathname + window.location.search !== currentHref) {
      window.history.replaceState(null, "", currentHref + window.location.hash);
    }
    if (lastArticle.current !== articleId) {
      lastArticle.current = articleId;
      turning.current = false;
      gesture.current = null;
      front.current?.style.removeProperty("--drag-x");
      front.current?.removeAttribute("data-dragging");
      region.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [articleId, currentHref]);

  function turn(step: number) {
    const href = step > 0 ? nextHref : previousHref;
    if (!href || pending || turning.current) return;
    turning.current = true;
    setDirection(step);
    startTransition(() => router.push(href, { scroll: false }));
  }

  function resetDrag() {
    gesture.current = null;
    front.current?.removeAttribute("data-dragging");
    front.current?.style.removeProperty("--drag-x");
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    resetDrag();
    if (!event.isPrimary) return;
    // Mouse users can select text normally and use the arrow controls.
    if (event.pointerType === "mouse" || pending || turning.current || !nextHref) return;
    if ((event.target as Element).closest("a, button, input, textarea, select, summary, [contenteditable]")) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { resetDrag(); return; }
      if (Math.abs(dx) <= 12 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
      start.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      front.current?.setAttribute("data-dragging", "true");
    }
    front.current?.style.setProperty("--drag-x", `${Math.max(-48, Math.min(48, dx * 0.35))}px`);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    const threshold = Math.min(80, event.currentTarget.clientWidth * 0.2);
    const shouldTurn = start.horizontal && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.3;
    if (start.horizontal) suppressClickUntil.current = event.timeStamp + 400;
    resetDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (shouldTurn) turn(dx < 0 ? 1 : -1);
  }

  function control(step: number, href: string | null) {
    const label = step < 0 ? "Previous reading" : "Next reading";
    const content = <><span aria-hidden="true">{step < 0 ? "←" : "→"}</span><span className="iserein-stack-control-label">{step < 0 ? "Previous" : "Next"}</span></>;
    return href ? (
      <Link
        href={href}
        prefetch={true}
        scroll={false}
        aria-label={label}
        aria-controls="topic-reading-card"
        aria-disabled={pending || undefined}
        className="iserein-stack-control"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault(); turn(step);
        }}
      >{content}</Link>
    ) : <button type="button" disabled aria-label={label} className="iserein-stack-control">{content}</button>;
  }

  return (
    <div
      ref={region}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${topic} readings`}
      tabIndex={0}
      className="iserein-reading-stack"
      style={{ "--stack-enter-x": `${direction * 18}px` } as CSSProperties}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault(); turn(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="iserein-stack-toolbar" aria-label="Reading controls">
        {control(-1, previousHref)}
        <p className="iserein-stack-hint">{pending ? "Opening reading…" : nextHref ? "Swipe left or right" : "A page for you"}</p>
        {control(1, nextHref)}
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{pending ? "Opening reading." : `Reading: ${title}.`}</p>

      <div
        className="iserein-stack-stage"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={resetDrag}
        onClickCapture={(event) => {
          if (event.timeStamp < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
        }}
      >
        {underneath > 1 && <div aria-hidden="true" className="iserein-stack-under is-far" />}
        {underneath > 0 && <div aria-hidden="true" className="iserein-stack-under is-near" />}
        <div ref={front} id="topic-reading-card" className="iserein-stack-front" aria-busy={pending}>
          <div key={articleId} className="iserein-stack-paper">{children}</div>
        </div>
      </div>
    </div>
  );
}
