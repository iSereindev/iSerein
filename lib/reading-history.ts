export const READ_KEY = "iserein-read";
export const READ_EVENT = "iserein-read-changed";

export function parseReadIds(value: string | null): number[] {
  try {
    const ids: unknown = JSON.parse(value || "[]");
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0))] : [];
  } catch { return []; }
}

export function getReadIds(): number[] {
  try { return parseReadIds(localStorage.getItem(READ_KEY)); } catch { return []; }
}

export function markRead(id: number): boolean {
  try {
    const ids = getReadIds();
    if (!ids.includes(id)) {
      localStorage.setItem(READ_KEY, JSON.stringify([...ids, id]));
      window.dispatchEvent(new Event(READ_EVENT));
    }
    return true;
  } catch { return false; }
}
