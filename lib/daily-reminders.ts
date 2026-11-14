export type ReminderKind = "reading" | "quote";

export function readReminderKind(value: unknown): ReminderKind | null {
  return value === "reading" || value === "quote" ? value : null;
}

export function readingPayload(article: { id: number; title: string }, day: string, test = false) {
  return {
    type: "iserein-reading",
    title: test ? "iSEREIN · Test reading" : "iSEREIN · Today’s page",
    body: article.title.slice(0, 220),
    url: `/reading/${article.id}`,
    date: day,
    test,
  };
}
