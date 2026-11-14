export function digestPayload(batch: { digest_id: string; article_count: number; first_id: number; first_title: string; is_recommendation?: boolean }, day: string, test = false) {
  const multiple = batch.article_count > 1;
  return {
    type: "iserein-reading",
    title: test ? "iSEREIN · Test notification" : batch.is_recommendation ? "iSEREIN · A page you haven’t read yet" : multiple ? `iSEREIN · ${batch.article_count} new pages for you` : "iSEREIN · A new reading",
    body: multiple ? "A few quiet moments. Your new readings are ready." : batch.first_title.slice(0, 220),
    url: multiple ? `/readings?batch=${encodeURIComponent(batch.digest_id)}` : `/reading/${batch.first_id}`,
    date: day, test,
  };
}
