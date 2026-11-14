import { getMoodReadings } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";
import MoodFinder from "./MoodFinder";

export default async function HomeMoodFinder() {
  const articles = await getMoodReadings(getPublicationDate()).catch(() => null);
  if (!articles) return <p className="py-6 text-sm">Reading suggestions are temporarily unavailable. You can still explore the topics.</p>;
  return <MoodFinder articles={articles} />;
}
