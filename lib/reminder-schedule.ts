export type ReminderSchedule = { localTime: string; timeZone: string };
export function readReminderSchedule(value: unknown): ReminderSchedule | null {
  if (!value || typeof value !== "object") return null;
  const { localTime, timeZone } = value as Record<string, unknown>;
  if (typeof localTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)
    || typeof timeZone !== "string" || timeZone.length > 80) return null;
  try { new Intl.DateTimeFormat("en", { timeZone }).format(); }
  catch { return null; }
  return { localTime, timeZone };
}
