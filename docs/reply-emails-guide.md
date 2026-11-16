# Optional discussion reply emails

This adds email replies, not newsletters or changes to daily reading reminders.
The sender is hello@iserein.app; private email replies go to isereindev@gmail.com.
Readers opt in per article under Discussion options. Signing in or following in-app updates does not opt them in.
A reader receives replies in the selected article's discussion, not only direct replies to their own comments.
No previously posted comments are emailed retroactively.

## Apply locally

1. Apply reply-emails.patch after the two compact-layout patches already installed.
2. Open reply-emails-setup.sql in a text editor, copy the entire contents, and run it ONCE in the existing Supabase project's SQL Editor.
   This is additive. Do not run the old local_catalog migration or a database reset.
3. Keep existing .env.local settings. The server needs:

```env
BREVO_API_KEY=your_private_Brevo_API_key
DISCUSSION_EMAIL_FROM=hello@iserein.app
DISCUSSION_EMAIL_REPLY_TO=isereindev@gmail.com
DISCUSSION_EMAIL_ENABLED=true
DISCUSSION_EMAIL_SITE_URL=http://localhost:3000
```

It also needs the existing NEXT_PUBLIC_SUPABASE_URL, and a private SUPABASE_SECRET_KEY
(or SUPABASE_SERVICE_ROLE_KEY) for that same project. Never prefix the private key with NEXT_PUBLIC_.
CRON_SECRET must also be present; use the existing production value if already configured, or a new strong random local-only value for local testing.
Do not paste or commit secrets. Configuration already in Vercel does not automatically appear in .env.local.

4. Stop the development server with Control+C and restart `npm run dev`.
5. Run `node --test tests/reply-emails.test.mjs tests/reply-email-delivery.test.mjs` in a second terminal.
   These tests use an in-memory database and mocked delivery; they do not send mail or require Docker.

## Real delivery test (two accounts)

1. As the first account, open an article -> Discussion options -> enable 'Email me replies in this discussion'.
2. Post a top-level comment. As the second account in Incognito, REPLY to that comment.
3. Wait five minutes for the batching delay. In a separate terminal run:

```bash
node --env-file=.env.local scripts/test-reply-email.mjs --send
```

This sends up to three due messages for opted-in readers in the connected database, not just the current browser account.
No background scheduler is installed by this package. An accepted count means Brevo accepted the email, not that inbox delivery is confirmed.
4. Check the inbox/spam folder and Brevo transactional logs. Open the conversation link.
5. Open the unsubscribe link. It must show a confirmation first. Click Stop reply emails.
6. Refresh the article: the checkbox should be off. Post another reply with the second account and confirm it does not queue another message for that reader.
7. In Profile -> Account settings, 'Turn off all reply emails' disables every article's opt-in for that account.

## Delivery behavior

- At least five minutes of batching, and at most one accepted/ambiguous email per article/reader/hour.
- At most four accepted/ambiguous emails per reader per rolling 24 hours; excess work is deferred.
- Self replies, hidden/deleted comments, hidden/deleted parent comments, restricted accounts, closed/unpublished threads are excluded.
- Reply opt-out cancels pending work. A message already in flight can still arrive.
- Provider 429 responses defer 15 minutes, up to three attempts. Other clear 4xx failures are held as failed.
- Network errors, timeouts, ambiguous 5xx results, and interrupted sends are held as uncertain, never automatically retried (prevents duplicates).
- Each request has a stable Brevo idempotency key as extra protection; we do not rely on indefinite provider deduplication.
- Inspect failed/uncertain messages in Brevo logs before deciding what to do. Do not blindly reset them to pending.
- Pending work older than 24 hours is canceled. Delivery metadata older than 30 days is removed by the worker.
- No public comment bodies are put in emails; titles are HTML escaped. Each message has exactly one recipient.
- Account deletion cascades preferences and pending delivery metadata. No contacts are added to marketing lists.

## Later production setup (after successful tests)

1. Add the three Brevo settings plus DISCUSSION_EMAIL_ENABLED=true to Vercel Production.
   Omit DISCUSSION_EMAIL_SITE_URL in production (defaults to https://iserein.app), or set it to that exact origin.
   Keep private Supabase credentials and CRON_SECRET server-only.
2. Review/build the branch, deploy under the user's control, and verify sign-in + discussion routes live.
3. Configure a separate Supabase Cron job every five minutes to POST to
   https://iserein.app/api/cron/discussion-emails with Authorization: Bearer <CRON_SECRET>.
   Store the secret in Supabase Vault; do not paste it into a shared SQL script or git.
   Do not change/delete the existing daily reading reminder job. This package deliberately does not schedule production sending.
4. Run one controlled live delivery and unsubscribe test before inviting more readers.

## Diagnose without exposing emails or secrets

Run in Supabase SQL Editor:

```sql
select status, count(*) from community_private.email_deliveries group by status;
```

Known outstanding launch checks: duplicate React key warning on topic pages, local reading-views 503,
reader cannot moderate or edit another reader's content, mobile layout, draft/expired link handling,
unchanged saves/daily reminders, production build, and actual delivery/opt-out.
