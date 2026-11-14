import { getDayReadings, getTomorrowTitles } from "@/lib/daily-publications";
import ReadingEnd from "./ReadingEnd";

// Optional return prompts must never prevent an article from being read.
export default async function ReadingEnding({
  articleId, isToday, today,
}: { articleId: number; isToday: boolean; today: string }) {
  const [daily, upcoming] = await Promise.allSettled([
    isToday ? Promise.resolve([]) : getDayReadings(today),
    getTomorrowTitles(),
  ]);
  const todayId = daily.status === "fulfilled" ? daily.value[0]?.id : undefined;
  const tomorrow = upcoming.status === "fulfilled" ? upcoming.value : null;
  return <ReadingEnd articleId={articleId} isToday={isToday}
    todayHref={todayId ? `/reading/${todayId}` : undefined}
    tomorrow={tomorrow} />;
}
