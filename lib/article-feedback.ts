export const MAX_FEEDBACK_LENGTH = 1200;
export const MAX_FEEDBACK_BODY_BYTES = 8192;

export type ArticleReaction = "up" | "down";
export type FeedbackPayload = {
  articleId: number;
  type: "reaction" | "comment";
  reaction: ArticleReaction | null;
  comment: string | null;
  website: string;
};

export function isArticleReaction(value: unknown): value is ArticleReaction {
  return value === "up" || value === "down";
}

export function isFeedbackOrigin(origin: string | null, host: string | null, fetchSite: string | null): boolean {
  if (!host || fetchSite === "cross-site") return false;
  // Some browsers omit Origin on same-origin fetches. Sec-Fetch-Site is browser-controlled.
  if (!origin) return fetchSite === "same-origin";
  try {
    const source = new URL(origin);
    const target = new URL(`${source.protocol}//${host}`);
    return (source.protocol === "https:" || source.protocol === "http:")
      && source.origin === origin && source.origin === target.origin
      && !target.username && !target.password && target.pathname === "/";
  } catch { return false; }
}

export function parseFeedbackPayload(value: unknown):
  | { ok: true; data: FeedbackPayload }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Please send a valid response." };
  }
  const input = value as Record<string, unknown>;
  if (typeof input.articleId !== "number" || !Number.isSafeInteger(input.articleId) || input.articleId < 1) {
    return { ok: false, error: "This reading could not be found." };
  }
  const website = typeof input.website === "string" ? input.website.trim() : "";
  if (input.type === "reaction" && isArticleReaction(input.reaction)) {
    return { ok: true, data: { articleId: input.articleId, type: "reaction", reaction: input.reaction, comment: null, website } };
  }
  if (input.type === "comment" && typeof input.comment === "string") {
    const comment = input.comment.trim();
    if (!comment || comment.length > MAX_FEEDBACK_LENGTH || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(comment)) {
      return { ok: false, error: `Please write a message of 1–${MAX_FEEDBACK_LENGTH} characters.` };
    }
    return { ok: true, data: { articleId: input.articleId, type: "comment", reaction: null, comment, website } };
  }
  return { ok: false, error: "Please choose a reaction or write a message." };
}

// A local display preference only. The database decides how many responses exist.
export function readStoredFeedback(raw: string | null): { reaction: ArticleReaction | null; commented: boolean } {
  try {
    const value = raw ? JSON.parse(raw) : null;
    return { reaction: isArticleReaction(value?.reaction) ? value.reaction : null, commented: value?.commented === true };
  } catch {
    return { reaction: null, commented: false };
  }
}
