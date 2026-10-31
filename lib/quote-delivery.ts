export type QuoteDeliveryRow = {
  id: number; endpoint: string; p256dh: string; auth: string; claim_token: string;
};
export type QuoteDeliveryResult = { id: number; claim_token: string; status: "sent" | "expired" | "failed" };

export async function dispatchQuoteBatch({ day, publicKey, claim, send, finish, continueLater, now = Date.now, budgetMs = 30000 }: {
  day: string; publicKey: string;
  claim: (day: string, publicKey: string, limit: number) => Promise<QuoteDeliveryRow[]>;
  send: (row: QuoteDeliveryRow) => Promise<QuoteDeliveryResult["status"]>;
  finish: (results: QuoteDeliveryResult[]) => Promise<void>;
  continueLater: () => Promise<void>;
  now?: () => number; budgetMs?: number;
}) {
  const started = now();
  const summary = { attempted: 0, sent: 0, expired: 0, failed: 0, continued: false };
  let more = false;
  do {
    const rows = await claim(day, publicKey, 12);
    if (!rows.length) { more = false; break; }
    const results: QuoteDeliveryResult[] = [];
    // Six outbound requests at a time. A slow provider cannot exhaust the function.
    for (let offset = 0; offset < rows.length; offset += 6) {
      results.push(...await Promise.all(rows.slice(offset, offset + 6).map(async row => {
        let status: QuoteDeliveryResult["status"];
        try { status = await send(row); } catch { status = "failed"; }
        return { id: row.id, claim_token: row.claim_token, status };
      })));
    }
    await finish(results);
    for (const result of results) { summary.attempted++; summary[result.status]++; }
    more = rows.length === 12;
  } while (more && now() - started < budgetMs);
  if (more) { await continueLater(); summary.continued = true; }
  return summary;
}
