"use client";
import { useEffect, useState } from "react";
import { communityRpc, COMMUNITY_CHANGE } from "@/lib/community-client";
export default function ReplyEmailPreference({ articleId }: { articleId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const value = await communityRpc<boolean>("community_email_preference", { p_article: articleId });
        if (alive) { setEnabled(value); setReady(true); setMessage(""); }
      } catch { if (alive) setMessage("Reply email settings are unavailable. Refresh to retry."); }
    }
    void load();
    window.addEventListener(COMMUNITY_CHANGE, load);
    return () => { alive = false; window.removeEventListener(COMMUNITY_CHANGE, load); };
  }, [articleId]);
  return <div className="text-sm">
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={enabled} disabled={!ready || busy} onChange={async event => {
        const next = event.target.checked;
        setBusy(true); setMessage("");
        try {
          setEnabled(await communityRpc<boolean>("community_email_preference", { p_article: articleId, p_enabled: next }));
          setMessage(next ? "Reply emails enabled for this article." : "Reply emails stopped for this article.");
        } catch { setMessage("Couldn’t save this setting. Please try again."); }
        finally { setBusy(false); }
      }} /> Email me replies in this discussion
    </label>
    {message && <p role="status" className="mb-2 text-xs text-[#75665C]">{message}</p>}
  </div>;
}
