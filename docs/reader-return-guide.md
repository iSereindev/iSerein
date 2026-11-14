# iSEREIN reader-return update

This describes the earlier release. For the current simplified UI and 9 AM schedule, see [quiet-reading-guide.md](quiet-reading-guide.md).

This update implements all six reader-feedback improvements. It is prepared against GitHub main 2f1fed5 and can also be applied after the topic-paintings patch. It does not change the quote-carousel timer or artwork.

## Changes

1. Reminder permission is requested directly from the enable-button click. A shared ten-second deadline covers permission, service-worker activation, subscription and the API save. The button becomes usable again after a timeout. Late browser responses cannot continue into a new server write. Errors distinguish blocked permissions, unsupported environments and connection problems.
2. Both standalone readings and topic-stack readings end with a reminder invitation and an installation link. Installed standalone apps hide the installation link. This remains a daily **quote** reminder; it is not an email signup.
3. Reminder settings allow choosing a time in the reader's detected IANA time zone, saving changes, and adopting the device's current zone after travel.
4. Topics initially show a newest-first title list with dates, an unread filter, a Next unread link and browser-local read badges. Eight titles show initially, with Show more. Opening a reading does not mark it read: reaching the ending does. Saving and feedback remain separate. Existing explicit reading/shuffle links work.
5. The currently selected daily reading uses “End of today’s reading”; archive readings use “End of reading” with a link to today's selection. The same latest-published selection is used as /reading.
6. Home includes an optional mood finder. It suggests matching articles and prefers unread results. Mood choices stay in component memory, are not saved or sent to analytics by this feature, and are not sent to an AI provider.

## Apply locally

Download iserein-reader-return.patch into Downloads. In your existing app folder:

```bash
cd ~/Documents/iserein
git apply --check ~/Downloads/iserein-reader-return.patch &&
git apply ~/Downloads/iserein-reader-return.patch &&
npm run build
```

Stop if the check fails. Do not use git reset or overwrite your current files to make it apply.
The patch contains the SQL and this guide under docs/.

## Set up the database before publishing

Run docs/reader-return-setup.sql in the Supabase SQL Editor. It preserves your current RLS and existing subscription ownership checks. It adds schedule fields and optional article mood tags.

Do not disable RLS and do not add public access to the subscription table.

Existing subscriptions keep their former 01:00 UTC schedule until their reader chooses a local time. New subscriptions default to 08:00 in the device's current time zone. Saving a time updates the existing subscription.

## Publish the code

After the local build and SQL migration succeed, review and commit the changed app/, lib/, docs/ files and tests/reader-return.test.mjs. Push the commit to main using your normal Git workflow, then wait for Vercel Ready.

No production deployment has been performed by preparing this update.

## Activate local-time delivery

The current Vercel job only runs once per day. It cannot alone deliver different local times.

1. Enable pg_cron (Cron), pg_net and Vault in your existing Supabase project if needed.
2. In Supabase Vault, create a secret named **iserein_cron_secret**. Copy its value directly from the existing **CRON_SECRET** in Vercel. Do not put the value in source code, chat, screenshots or Git.
3. After the new code is deployed, run docs/reader-return-scheduler.sql in Supabase SQL Editor.
4. This creates one named job, **iserein-local-reminders**, which calls the existing authenticated endpoint every five minutes. It is a fixed notification-delivery task, not an AI agent. Rerunning the setup updates the same job.
5. Wait up to five minutes, then reopen reminder settings. The delivery-unavailable notice should disappear. Save your local time and send a test quote.
6. For a real timing check, save a time a few minutes ahead and leave the app. Confirm receipt on your own phone/browser. Then restore your preferred time.

The original daily Vercel trigger can remain as a fallback. Both triggers claim the same rows atomically and cannot send the same local-date reminder twice.

Delivery is approximate: the scheduler checks every five minutes, only sends within a 30-minute window after the selected time, and gives the push provider a 30-minute TTL. Device power saving, connectivity or notification settings can delay display. A missed delivery window is skipped, not caught up in the middle of the night. Failed/uncertain attempts are not retried that local day to avoid duplicates. A 20-hour minimum gap also limits duplicate sends after time-zone changes. DST uses PostgreSQL's IANA rules; a nonexistent spring-forward time moves forward, and an ambiguous autumn time resolves using PostgreSQL's standard-time choice.

The schedule panel reports when no authenticated scheduler tick has been seen for 15 minutes. A test quote verifies the push path, not the periodic job; check both.

To stop ONLY this new scheduled job:
```sql
select cron.unschedule('iserein-local-reminders');
```
Disabling the job does not disable subscriptions. The existing Vercel daily fallback may still deliver due 01:00 UTC reminders.

## Manage mood suggestions in Supabase

articles.moods is an optional text array. Allowed app choices:
- calm — A quieter mind
- courage — A little courage
- connection — Connection
- perspective — Perspective
- explore — Something to explore

Examples in the Supabase array editor: `["calm","perspective"]`.
NULL uses simple title/subtitle word matching; an empty array [] excludes the reading.
Editorial tags take priority. Tags are suggestions about subject matter, not psychological assessments. No AI service or API key is required. Keep future articles future-dated; the finder only loads published articles.

## Verification performed

- Production Next.js build using a local fixture configuration.
- TypeScript and lint checks on changed components.
- Existing automated tests plus new tests for malformed history, mood ranking, schedule validation and late timeout responses.
- Rendered-component tests with simulated browser APIs: stalled permission, stalled push registration, retry, save time, disable, end-of-reading tracking, installed-state CTA hiding, unread filters, mood ranking and corrupt storage.
- Production route rendering with fixture articles: topic list, selected topic reading, older/current labels and home mood entry.
- Embedded PostgreSQL checks: migration applies twice, time validation, due selection, duplicate prevention, missed windows, DST conversions and denial of anonymous access.

Limitations: native Chrome/Safari permission prompts and real push delivery need the device checks above. No live database credentials or production accounts were used. Browser read history does not sync across devices, and private/restricted browser storage may not persist it.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready
- https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
- https://supabase.com/docs/guides/cron/quickstart
- https://supabase.com/docs/guides/functions/schedule-functions
