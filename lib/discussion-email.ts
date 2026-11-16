import "server-only";
import { createClient } from "@supabase/supabase-js";

export function discussionEmailDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server Supabase configuration.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
}
export function discussionEmailSettings() {
  if (process.env.DISCUSSION_EMAIL_ENABLED !== "true") throw new Error("Reply email delivery is not enabled.");
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.DISCUSSION_EMAIL_FROM;
  const replyTo = process.env.DISCUSSION_EMAIL_REPLY_TO;
  if (!apiKey || !sender || !replyTo) throw new Error("Missing Brevo email configuration.");
  const site = process.env.DISCUSSION_EMAIL_SITE_URL || "https://iserein.app";
  const url = new URL(site);
  if (url.origin !== "https://iserein.app" && !(process.env.NODE_ENV !== "production" && url.origin === "http://localhost:3000")) {
    throw new Error("Invalid reply email site URL.");
  }
  return { apiKey, sender, replyTo, site: url.origin };
}
type Delivery = { id: string; email: string; article_id: number; title: string; token: string; count: number };
export function escapeEmail(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export async function sendDiscussionEmails() {
  const settings = discussionEmailSettings();
  const db = discussionEmailDatabase();
  const started = Date.now();
  const totals = { accepted: 0, failed: 0, uncertain: 0, deferred: 0 };
  // Bound work to fit the function duration. The next scheduled call drains more.
  for (let i = 0; i < 3 && Date.now() - started < 15000; i++) {
    const { data, error } = await db.rpc("community_email_claim");
    if (error) throw new Error("Could not claim reply email. Check the reply-email migration.");
    const job = data as Delivery | null;
    if (!job) break;
    const allowed = await db.rpc("community_email_allowed", { p_id: job.id });
    if (allowed.error) throw new Error("Could not check reply email preference.");
    if (!allowed.data) {
      const result = await db.rpc("community_email_finish", { p_id: job.id, p_result: "failed" });
      if (result.error) throw new Error("Could not record skipped email.");
      continue;
    }
    const reading = `${settings.site}/reading/${job.article_id}#discussion`;
    const unsubscribe = `${settings.site}/api/discussion-emails/unsubscribe?token=${encodeURIComponent(job.token)}`;
    let outcome: "sent" | "failed" | "uncertain" | "retry" = "uncertain";
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { "api-key": settings.apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: "iSEREIN", email: settings.sender },
          to: [{ email: job.email }], replyTo: { email: settings.replyTo },
          subject: "A new reply in your iSEREIN discussion",
          headers: { idempotencyKey: job.id },
          tags: ["discussion-replies"],
          htmlContent: `<html><body style="background:#F6F0E8;color:#33241D;font-family:Georgia,serif;padding:24px"><div style="max-width:560px;margin:auto"><p>iSEREIN</p><h1 style="font-size:26px">The conversation continues.</h1><p>There are new replies in the discussion for <strong>${escapeEmail(job.title)}</strong>.</p><p><a href="${reading}">Read the conversation →</a></p><p style="font-size:13px">You asked for reply emails for this article. <a href="${unsubscribe}">Stop emails for this discussion</a>, or turn all reply emails off in <a href="${settings.site}/profile#account">Profile</a>.</p><p style="font-size:13px">To reply publicly, use the discussion link above. Replies to this email reach iSEREIN privately.</p></div></body></html>`,
          textContent: `iSEREIN\n\nThe conversation continues.\nNew replies in: ${job.title}\n\nRead the conversation: ${reading}\n\nStop emails for this discussion: ${unsubscribe}\nTurn all reply emails off in Profile: ${settings.site}/profile#account\n\nTo reply publicly, open the discussion. Replies to this email reach iSEREIN privately.`,
        }),
      });
      if (response.ok) outcome = "sent";
      else if (response.status === 429) outcome = "retry"; // Explicitly rejected: safe to defer.
      else if (response.status >= 500 || response.status === 408) outcome = "uncertain";
      else outcome = "failed";
    } catch {
      // Never automatically retry an ambiguous send: the provider may have accepted it.
      outcome = "uncertain";
    }
    const result = await db.rpc("community_email_finish", { p_id: job.id, p_result: outcome });
    if (result.error) throw new Error("Could not record reply email result; inspect delivery status before retrying.");
    if (outcome === "sent") totals.accepted++;
    else if (outcome === "retry") totals.deferred++;
    else totals[outcome]++;
    if (outcome !== "sent") break; // Avoid repeating a provider/configuration error across recipients.
  }
  return totals;
}
