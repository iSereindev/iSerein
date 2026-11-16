import { discussionEmailDatabase } from "@/lib/discussion-email";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function page(content: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reply emails · iSEREIN</title><body style="background:#F6F0E8;color:#33241D;font-family:Georgia,serif;padding:32px;line-height:1.6"><main style="max-width:520px;margin:40px auto"><p>iSEREIN</p>${content}</main></body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" },
  });
}
// GET is confirmation only: email scanners must not unsubscribe a reader.
export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!tokenPattern.test(token)) return page("<h1>This link is invalid.</h1><p>You can turn reply emails off in Profile.</p>", 400);
  return page(`<h1>Stop emails for this discussion?</h1><p>Your daily reading reminders will stay unchanged.</p><form method="post" action="/api/discussion-emails/unsubscribe"><input type="hidden" name="token" value="${token}"><button style="padding:12px 20px;border-radius:24px;background:#5B3A2D;color:white;border:0" type="submit">Stop reply emails</button></form>`);
}
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 2048) return page("<p>Invalid request.</p>", 413);
  try {
    const text = await request.text();
    if (text.length > 2048) return page("<p>Invalid request.</p>", 413);
    const token = new URLSearchParams(text).get("token") || "";
    if (!tokenPattern.test(token)) return page("<p>This link is invalid.</p>", 400);
    const { error } = await discussionEmailDatabase().rpc("community_email_unsubscribe", { p_token: token });
    if (error) throw new Error("Unavailable");
    return page('<h1>Reply emails stopped.</h1><p>You won’t receive further emails for this discussion. A message already being sent may still arrive.</p><p><a href="/profile#account">Back to Profile</a></p>');
  } catch { return page('<h1>Please try again.</h1><p>Your preference could not be saved. You can also turn reply emails off in Profile.</p>', 503); }
}
