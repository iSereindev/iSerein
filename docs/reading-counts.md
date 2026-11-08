# Quiet audience counts

Articles show a small `234 views` beside the reading time, both on the individual reading page and when reading through a topic stack. They use the same total for the same article. Daily reminders show `48 subscribed` beside the existing reminder control on the homepage and install page. Existing like/dislike and private feedback controls are unchanged; no public like total is added.

## What the numbers mean

- A view is recorded after the reading has remained open in a visible browser tab for three seconds. It is not proof that someone completed the reading.
- The same browser counts once per article per UTC day, across both reading routes. Refreshing does not add another view. A new browser, a different installed-app browser context, or cleared cookies can count separately.
- Views start at zero when this update goes live. Historical views cannot be recovered from this feature.
- The reminder total includes existing enabled subscriptions for the currently configured VAPID public key. It counts subscriptions, not individual people. Someone may subscribe on multiple devices. Expired endpoints drop out after delivery discovers they are invalid, or when a reader turns reminders off.
- Counts use compact formatting above 9,999. If a count cannot load, it is omitted; reading and reminder controls continue to work.
- Published article totals are cached for up to 15 seconds, and reminder totals for up to 60 seconds. Successful view records and reminder changes invalidate the relevant cache. Readers see their accepted view immediately, and their reminder count refreshes after changing it.

## Setup before deployment

1. In Supabase, open this project's **SQL Editor**, create a **New query**, paste all of `docs/reading-counts-setup.sql`, and click **Run**. It is safe to rerun. The script creates three private counter tables and two service-only functions; existing articles, feedback and reminder data are preserved.
2. Keep the existing Vercel Production variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the existing service-role key), and `VAPID_PUBLIC_KEY`. They are already used by the app. This feature needs no new keys, package dependencies, or paid service.
3. Apply the supplied patch in the local repository, run `npm test` and `npm run build`, then commit the listed feature files and push `main` to trigger the existing Vercel deployment.
4. When Vercel reports Ready, open a published reading and leave it visible for at least three seconds. Refresh: its total should not increase again that day in that browser. Open the same article through a topic: it should use the same total. Check the number next to daily quote reminders. A second browser/device is useful for a second counted view.

## Access and retention

All three counter tables have row-level security enabled and no visitor grants or write policies. The browser cannot submit a total. The server validates publication state and records an atomic increment through a service-only database function. The public endpoints return only aggregate numbers, never subscriptions, push endpoints, private keys, or stored reader/network hashes.

An HTTP-only, first-party `iserein-reading-day` cookie expires at UTC midnight. It is Secure in production and SameSite=Lax. Only article- and day-scoped HMACs derived from its random token are stored for daily deduplication; an additional day-scoped HMAC of the trusted hosting-proxy network address limits excessive new counts. Raw IP addresses and cookie tokens are not stored in these tables. Earlier daily hashes and rate-limit buckets are pruned on subsequent counted requests; this is not a scheduled deletion guarantee while the site is idle. Anonymous aggregate totals remain until the article or its total is removed.

Known crawlers are excluded. Origin checks, small JSON bodies, signed cookies, database uniqueness constraints, and a limit of 120 new views per network per minute reduce casual inflation. These are approximate public audience indicators, not bot-proof analytics or a count of unique people. The existing Vercel analytics remains independent.

If the SQL setup or a required server key is missing, the optional number stays hidden. See Vercel function logs and Supabase SQL Editor to diagnose setup without exposing secrets to the browser.
