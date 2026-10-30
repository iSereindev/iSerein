"use client";

import { useEffect, useRef, useState } from "react";
import type { WatchVideo } from "@/lib/videos";

export default function VideoGallery({ videos }: { videos: WatchVideo[] }) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const player = useRef<HTMLIFrameElement>(null);
  const triggers = useRef(new Map<number, HTMLButtonElement>());
  const lastOpened = useRef<number | null>(null);

  useEffect(() => {
    if (activeId !== null) {
      lastOpened.current = activeId;
      player.current?.focus({ preventScroll: true });
    } else if (lastOpened.current !== null) {
      triggers.current.get(lastOpened.current)?.focus({ preventScroll: true });
      lastOpened.current = null;
    }
  }, [activeId]);

  return (
    <div className="iserein-watch-grid">
      {videos.map((video) => {
        const active = activeId === video.id;
        return (
          <article key={video.id} className="iserein-watch-card" aria-labelledby={`video-title-${video.id}`}>
            <h2 id={`video-title-${video.id}`} className="iserein-watch-title">{video.title}</h2>
            <div className="iserein-watch-frame">
              {active ? (
                <iframe
                  key={video.id}
                  ref={player}
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&playsinline=1`}
                  title={video.title}
                  allow="autoplay; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="iserein-watch-player"
                />
              ) : (
                <button
                  ref={(element) => {
                    if (element) triggers.current.set(video.id, element);
                    else triggers.current.delete(video.id);
                  }}
                  type="button"
                  onClick={() => setActiveId(video.id)}
                  aria-label={`Play ${video.title}`}
                  className="iserein-watch-play"
                >
                  {/* The title labels the button; the poster is decorative. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt=""
                    width={480}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="iserein-watch-poster"
                  />
                  <span className="iserein-watch-play-label" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7V5Z" /></svg>
                    Play
                  </span>
                </button>
              )}
            </div>
            {video.caption && <p className="iserein-watch-caption">{video.caption}</p>}
            <div className="iserein-watch-controls">
              <a
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
                rel="noopener"
                aria-label={`Watch ${video.title} on YouTube (opens in a new tab)`}
              >
                Watch on YouTube <span aria-hidden="true">↗</span>
              </a>
              {active && (
                <button type="button" onClick={() => setActiveId(null)} aria-label={`Close ${video.title} player`}>
                  Close player
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
