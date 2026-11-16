// A private discussion subject uses positive article IDs or negative video IDs.
// This keeps existing article conversations and RPCs compatible.
export function discussionHref(subjectId: number): string {
  if (!Number.isSafeInteger(subjectId) || subjectId === 0) throw new Error("Invalid discussion ID.");
  return subjectId < 0 ? `/watch/${-subjectId}#discussion` : `/reading/${subjectId}#discussion`;
}
export function discussionElementId(subjectId: number): string {
  return subjectId < 0 ? `video-discussion-${-subjectId}` : "discussion";
}
