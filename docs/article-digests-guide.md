# Tomorrow previews and daily reading reminders

Prepared against main d860463. Not deployed. This revised package replaces the earlier iserein-article-digests.patch; do not apply both.

## Reader experience
- Homepage: one lead reading, a link to all of today's readings when there are several, and a quiet “Coming tomorrow” section.
- Tomorrow shows at most three titles and “+N more”. Titles are not links. No future content or subtitles are exposed by the preview.
- Optional articles.is_featured selects the lead among today's readings. If several are featured, highest ID wins. If none are featured, highest ID wins. No new reading today: keep the latest reading with the correct label.
- One action: “Remind me to read”. No quote/reading selector. Quotes stay on the homepage.
- About 9 AM in the device's saved time zone: one article opens directly; multiple articles use one notification and an exact-batch title list.
- New unread releases come first. When none remain, suggest one older unread article. Choose randomly among never-suggested unread pages first, then rotate the least-recently suggested ones. If everything is read, send nothing. Publications after the reader's 9 AM cutoff wait until the next morning.
- At most one automatic send attempt per local day, with a 20-hour guard against repeats after travel. A failed push is eligible the following morning. A successful provider acceptance is recorded, but the provider/device can still delay or fail display.
- Existing reminder subscriptions move to article notifications. New-release tracking includes articles released today onward; the unread fallback can suggest older published articles. Earlier quote/reading notifications did not have an article ledger and cannot reliably be reconstructed.
- Saved lists, likes, six-second quote rotation, mood suggestions and paintings remain.

## Apply on your Mac
Download iserein-reading-reminders.patch into Downloads. Use this replacement instead of the earlier article-digests patch.

Run in VS Code Terminal (NOT Supabase):
```bash
cd ~/Documents/iserein
git apply --check ~/Downloads/iserein-reading-reminders.patch &&
git apply ~/Downloads/iserein-reading-reminders.patch
```

Stop if the check fails; do not force it.

## Database
In Supabase SQL Editor, paste the contents of docs/article-digests-setup.sql and Run.
Requires the previous quiet-reading-setup.sql migration. This migration is repeatable.
It adds is_featured, release tracking, a private notification ledger and private device-linked read history.
It enforces a future-content SELECT restriction for anon/authenticated even if another policy allowed all articles. Dashboard/service-role editorial access remains available.
A narrow function exposes only tomorrow's three titles and total count.
Batch links expose published titles/topic/date only, never subscriber identity or push keys.

Then in VS Code Terminal:
```bash
npm run build
git status --short
```

Review, commit only the patch's files and push when ready. This document does not deploy the app.

## Publishing
In Supabase articles:
1. Write articles as usual.
2. Set published_date to tomorrow to preview their titles now and release them on that date.
3. Optionally set is_featured=true for the main homepage selection.
4. Publish several on the same date if you wish; all eligible releases join the morning notification.

Publication dates use UTC, consistently across the app and database. This is separate from each reader's notification time zone.
Newly inserted backdated articles are tracked from insertion time, so an article added after 9 AM is not sent at 9:05 just because its date is today.
Changing only text/title/featured does not trigger a new notification. Moving an already-notified article to another date does not notify it again.
Do not delete/recreate an article merely to edit it.

## Activate delivery
The existing Supabase job iserein-local-reminders must run every five minutes. The old once-daily Vercel fallback cannot cover 9 AM worldwide.
If it has not been activated, follow docs/reader-return-scheduler.sql AFTER the new deployment is Ready:
- Enable pg_cron, pg_net and Vault as described there.
- In Vault create iserein_cron_secret with the same value as Vercel CRON_SECRET. Do not share it in chat.
- Run the scheduler SQL. Re-running updates the named job instead of duplicating it.

Read-only checks in Supabase:
```sql
select jobname,schedule,active from cron.job where jobname='iserein-local-reminders';
select public.reminder_scheduler_status();
```

A healthy check should become true after a successful scheduler invocation. Do not manually mark it healthy. If false, inspect cron job runs and Vercel function logs. The app's paused message will remain until the worker records a successful check.

## Verify live
- Preview: future titles show, direct future reading URLs return not found, future bodies are blocked through the public database API.
- Set one of two current-day articles as Featured; verify homepage lead and “See all” list.
- Enable notifications; Manage → Test sends a sample current reading or current-day list without consuming the daily delivery ledger.
- Confirm the next actual morning digest opens the announced articles. Without new releases, check that it suggests an unread article with “A page you haven’t read yet”. Once all published readings are completed, no automatic notification is sent.
- Turn off and confirm no future automatic deliveries.

## Validation performed
52 unit tests; TypeScript and changed-file lint; production build with local fixture data.
Production-rendered checks: featured lead, multi-release list, non-clickable three-title preview, exact batch, invalid-batch 404, current/older labels.
Simulated browser tests: permission timeout, stalled registration, recovery, late-response rejection, single-action subscription and opt-out. Read-sync tests cover no uploads before opt-in, bounded batches, incremental completion IDs, retry after connection failure and no uploads after opt-out.
Embedded PostgreSQL tests: repeatable migration; embargo despite a permissive policy; title-only preview; three-article notification; late release included in next day's five-article batch; no repeats; random unread fallback and silence when all content is read; failed-send carryover; private tables inaccessible to anonymous readers; rescheduled articles removed from old public batch lists.

## Read history and privacy
Completion still means reaching the article ending, not clicking a heart or opening a page.
When reminders are enabled, completed-reading IDs sync to that anonymous browser/device subscription. No account, email, article text or reading-duration data is uploaded by this feature.
History from before enabling reminders is included. The subscription cookie proves ownership; read tables cannot be queried or written by public clients directly.
Turning reminders off deletes that subscription's synced read IDs and stops uploads. Local read history stays in the browser and can sync again after re-enabling.
Other devices do not share this history. Offline completion syncs on a later online visit; until then a notification can suggest something the reader has already finished offline.
The server may re-suggest an article that remains unread after all other unread options have been suggested.

No production accounts or credentials were used. Actual browser permission prompts, live scheduling and push delivery require the device checks above.
