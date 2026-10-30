const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const embedHosts = new Set(["youtube-nocookie.com", "www.youtube-nocookie.com"]);

// Accept video links, never arbitrary iframe markup or third-party embed URLs.
export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;

    let id: string | null = null;
    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null;
    } else if (youtubeHosts.has(url.hostname)) {
      id = url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null;
    } else if (embedHosts.has(url.hostname)) {
      id = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null;
    }
    return id && videoIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}
