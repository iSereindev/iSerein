// Keep old six-per-page topic links useful while the new reader shows one card.
export function topicDeckPosition(
  ids: readonly number[],
  reading?: string | string[],
  page?: string | string[]
): number {
  if (typeof reading === "string" && /^[1-9]\d*$/.test(reading)) {
    const selected = ids.indexOf(Number(reading));
    if (selected >= 0) return selected;
  }
  const requestedPage = typeof page === "string" ? Number(page) : 1;
  const lastPage = Math.max(1, Math.ceil(ids.length / 6));
  const legacyPage = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, lastPage)
    : 1;
  return (legacyPage - 1) * 6;
}

export function topicReadingHref(topic: string, id: number, seed: string): string {
  return `/topics/${topic}?${new URLSearchParams({ reading: String(id), shuffle: seed })}`;
}
