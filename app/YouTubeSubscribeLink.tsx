const CHANNEL_URL = "https://www.youtube.com/@iSEREIN-s5g";

export default function YouTubeSubscribeLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Subscribe to iSEREIN on YouTube (opens in a new tab)"
      className={`iserein-save-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm ${className}`}
    >
      Subscribe on YouTube <span aria-hidden="true">↗</span>
    </a>
  );
}
