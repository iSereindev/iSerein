export const MOODS = [
  { id: "calm", label: "A quieter mind", words: /\b(calm|quiet|peace|mind|worry|worries|anxiety|overwhelm|silence|knowing|hear|speak)\b/i },
  { id: "courage", label: "A little courage", words: /\b(courage|fear|start|begin|confidence|resilience|initiative|ambition|moving on)\b/i },
  { id: "connection", label: "Connection", words: /\b(love|friend|friends|people|relationship|relationships|lonely|connection|unspoken|strangers)\b/i },
  { id: "perspective", label: "Perspective", words: /\b(perspective|meaning|plans|time|life|mountain|wisdom|work|professional)\b/i },
  { id: "explore", label: "Something to explore", words: /\b(learn|learning|curiosity|discover|surprise|possibility|possibilities|growth)\b/i },
] as const;
export type Mood = typeof MOODS[number]["id"];
export type ReadingSummary = { id: number; title: string; subtitle: string | null; topic: string; published_date: string; moods?: string[] | null };

// Editorial tags take precedence, including [] to deliberately exclude a reading.
// Otherwise suggest using title/subtitle words; no diagnosis or AI service.
export function readingMatchesMood(article: ReadingSummary, mood: Mood): boolean {
  if (Array.isArray(article.moods)) return article.moods.includes(mood);
  return MOODS.find(item => item.id === mood)!.words.test(article.title + " " + (article.subtitle || ""));
}
export function moodSuggestions(articles: ReadingSummary[], mood: Mood, read: readonly number[]) {
  const matching = articles.filter(article => readingMatchesMood(article, mood));
  return matching.sort((a, b) => Number(read.includes(a.id)) - Number(read.includes(b.id)) || b.published_date.localeCompare(a.published_date) || b.id - a.id).slice(0, 3);
}
