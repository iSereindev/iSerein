# Quieter reading and morning reminders

For the newer title previews and article-only batches, see [article-digests-guide.md](article-digests-guide.md).

Prepared against main 53a674c. Not deployed.

## What changes
- Topic lists show at most six titles, with search, unread filtering and previous/next pagination. The list collapses when a reading is open.
- The topic painting appears inside Self, Life and Growth.
- Article endings retain feedback, one reminder action and compact navigation. Removed duplicate slogans, the “new page tomorrow” promise and the automatic YouTube popup on Yes.
- “Remind me at 9 AM” enables device notifications directly, followed by the browser's required permission prompt. Optional settings let readers choose daily readings or quotes, test delivery or turn it off.
- The detected device time zone is used automatically. It refreshes when an enabled reader revisits a reminder surface after travelling. DST is handled by the saved IANA zone. Closed apps cannot tell the server about travel until reopened.
- Existing subscribers remain on quotes; their time moves to 09:00 in their previously saved zone. Unknown device zones cannot be recovered remotely; they update on the next visit.
- One daily notification per subscription. Readings link to the exact article; quotes link to the selected home quote. Reading notifications skip days without a page published on the app's UTC publication date.
- Quotes still rotate every six seconds. Likes, saved books/readings and mood matching are preserved.

These are device notifications, not emails. Email reminders would require an email provider, explicit address opt-in, verification and unsubscribe handling. No email addresses are collected here.

## Apply
Download iserein-quiet-reading.patch into Downloads, then:

```bash
cd ~/Documents/iserein
git apply --check ~/Downloads/iserein-quiet-reading.patch &&
git apply ~/Downloads/iserein-quiet-reading.patch &&
npm run build
```

If the check fails, stop and share the error; do not force it.

Before publishing, run docs/quiet-reading-setup.sql in Supabase SQL Editor. It builds on reader-return-setup.sql, keeps RLS and subscription ownership, and does not delete content. It can be rerun.

Review and commit the patch's changed files, then push when ready to deploy. Avoid staging unrelated changes.

## Delivery schedule
The existing Supabase job iserein-local-reminders must be active every five minutes. If it was never activated, follow docs/reader-return-scheduler.sql after deployment. It uses the existing CRON_SECRET stored in Vault. Do not create a second job.

The Vercel once-daily fallback alone cannot deliver at 9 AM in every time zone. The five-minute scheduler targets about 9:00–9:05; devices may delay displaying notifications. If the scheduler misses the 30-minute window, the app skips that delivery rather than sending at night. Reminders show a paused message when the scheduler heartbeat is stale.

## Check after deployment
1. Open a topic on mobile: painting visible, six titles maximum; open a reading and confirm the list is collapsed.
2. Enable a reading reminder, allow browser permission, and use Manage → Test. Confirm the notification opens that article.
3. Choose quote in Manage and Save, then Test. Confirm it opens the quote.
4. Turn off; confirm the subscription is disabled.
5. Confirm the five-minute cron job runs successfully and an actual 9 AM notification arrives.

iPhone/iPad require the installed Home Screen app before Web Push permission. The app shows installation guidance only when needed.

## Verification
49 unit tests passed; TypeScript and lint passed. Production build and rendered-route checks used local fixture data. Simulated browser tests cover pending permissions, timeout recovery, late-response rejection, subscribing, switching reminder content, disabling, read tracking and a 100-title list. Embedded PostgreSQL checks cover repeatable migrations, fixed 9 AM, content filtering, duplicate prevention, DST and anonymous access denial.

Real browser permission prompts and live push delivery still need the device checks above. No production credentials or accounts were used.
