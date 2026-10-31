# Daily quote reminders — setup on your Mac, Supabase and Vercel

This update adds an optional **Daily quote reminder** below the home quotes and **Manage daily reminders** on the Install page. Readers explicitly enable it, grant their browser's notification permission, and can turn it off at any time. No account or email is collected. The existing three-second quote carousel continues normally.

One quote is chosen each UTC day from active `home_quotes`, ordered by display order and ID. The first version sends around **09:00–10:00 Malaysia time (UTC+8)**. Before enabling, readers see that send window converted to their own device timezone. Your existing Vercel Hobby plan supports one daily scheduled run, with hour-level timing. Notification delivery can be delayed by connectivity, Focus settings or the push provider. It is a daily reminder, not an alarm with guaranteed delivery time.

The reminder opens the home page at the quoted thought. This is a notification feature; it does not add a native home-screen widget. On iPhone/iPad, readers need to add iSEREIN to their Home Screen and open that installed app before enabling notifications.

## 1. Apply the update once

Download **iserein-daily-quotes.patch** to your Mac's Downloads folder. In your Mac Terminal:

```bash
cd ~/Documents/iserein &&
git apply --check ~/Downloads/iserein-daily-quotes.patch &&
git apply ~/Downloads/iserein-daily-quotes.patch &&
npm ci
```

This patch is separate from `iserein-reader-feedback.patch`. It can be applied before or after that patch; do not apply either patch twice.

## 2. Add the private notification tables

In Mac Terminal:

```bash
pbcopy < ~/Documents/iserein/docs/quote-reminders-setup.sql
```

Open your iSEREIN project in **Supabase → SQL Editor → New query**. Paste and select **Run**. It creates two protected tables and server-only functions. Readers cannot read subscription endpoints or invoke these functions directly. The existing articles, quotes, books, videos and article feedback are unchanged. The script is safe to rerun.

## 3. Confirm the private Supabase setting in Vercel

If you already added **SUPABASE_SECRET_KEY** for article feedback, reuse it; do not create another variable with that name.

Otherwise, in Supabase open **Settings → API Keys → Publishable and secret API keys**. Copy a **secret** key starting `sb_secret_`. In **Vercel → iSEREIN project → Settings → Environment Variables**, add it as **SUPABASE_SECRET_KEY**, for **Production**. Keep the value private. Do not put it in chat, GitHub, or a `NEXT_PUBLIC_` variable. Leave your existing Supabase URL and publishable key as they are.

A legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted if already configured, but the new secret key is preferred. Creating a new secret key does not require changing the website's existing publishable key.

## 4. Generate the notification keys on your Mac

In Mac Terminal:

```bash
cd ~/Documents/iserein &&
node scripts/quote-reminder-keys.mjs init
```

This adds **VAPID_PUBLIC_KEY**, **VAPID_PRIVATE_KEY** and **CRON_SECRET** to your `.env.local` file. Existing settings are preserved. Running it again preserves a working key pair; it does not rotate your keys. The values are not printed. Keep these keys stable: replacing the VAPID pair later requires readers to reconnect their reminders.

## 5. Copy those three values into Vercel

For each variable below, run its copy command in Mac Terminal, then paste the clipboard into the matching **Production** environment variable in Vercel. Each command copies only the value; it never prints the value in Terminal.

**VAPID_PUBLIC_KEY**:

```bash
node ~/Documents/iserein/scripts/quote-reminder-keys.mjs copy VAPID_PUBLIC_KEY
```

**VAPID_PRIVATE_KEY** — mark sensitive:

```bash
node ~/Documents/iserein/scripts/quote-reminder-keys.mjs copy VAPID_PRIVATE_KEY
```

**CRON_SECRET** — mark sensitive:

```bash
node ~/Documents/iserein/scripts/quote-reminder-keys.mjs copy CRON_SECRET
```

Do not add `NEXT_PUBLIC_` to any of these names. The app exposes only the public VAPID key through its own settings endpoint. The private key, cron secret and Supabase secret stay on the server. Do not share `.env.local` or the clipboard values.

## 6. Test, commit and deploy

After adding the Vercel variables, run this block in Mac Terminal. The cached-diff guard stops if there are already staged changes; inspect `git status --short` before committing unrelated work. Applying the patch to the index here stages this update's changes precisely.

```bash
cd ~/Documents/iserein &&
npm test &&
npm run lint &&
npm run build &&
git diff --cached --quiet &&
git apply --cached ~/Downloads/iserein-daily-quotes.patch &&
git commit -m "Add optional daily quote notifications" &&
git push origin main
```

Once Vercel reports **Ready**, check **Settings → Cron Jobs**. The `/api/cron/daily-quote` job should be registered with schedule `0 1 * * *` (01:00 UTC, the 09:00 hour in Malaysia). Cron delivery runs only for Production, not Preview. Changing any Vercel environment value requires a new deployment for that value to take effect.

No paid notification service or Firebase project is needed. The feature uses Web Push and the existing Vercel/Supabase services, subject to their usage limits and availability. Local testing needs the existing Supabase variables and the private Supabase key in `.env.local`; add that private key in VS Code if you want local enrollment to save. Keep that file out of Git. Vercel is the live app; your Mac can be off.

## 7. Test on your phone before inviting readers

1. Open **https://iserein.app** on your phone. On iPhone, install it using Safari's **Add to Home Screen**, then launch the installed app from its icon.
2. Under **A thought to take with you**, open **Daily quote reminder**.
3. Read the displayed local send window, tap **Enable daily reminders**, and allow notifications.
4. Tap **Send a test quote**. It sends only to that browser/install, not all readers. Check the notification, tap it and confirm it opens the selected thought.
5. Tap **Turn reminders off**, refresh and check the setting is off. Enable again if you want future daily reminders.
6. If nothing appears, check the device's notification/Focus settings, connectivity and whether the installed app has permission. A successful test request means the push provider accepted it, not that the phone has displayed or the reader has read it.

Avoid manually running the production cron as a device test once other readers subscribe: it attempts that day's quote for all eligible subscribers. Use **Send a test quote** for your own device. Duplicate scheduled runs are guarded so a subscription is attempted at most once per UTC day; an uncertain failed attempt is not retried that day, which favors avoiding duplicates over guaranteeing a delivery.

## Where to see subscriptions and delivery status

In Supabase, **quote_reminder_subscriptions** contains one record per subscribed browser/install, not a verified unique person. `enabled` shows whether delivery is active. `last_sent_date` records the day a push service accepted the notification. Endpoints and encryption keys are private and never returned by the settings API. Stopping a reminder or detecting an expired endpoint clears those credentials. Stopped/expired records are removed after 30 days by a later daily run.

To copy a report without displaying endpoint secrets:

```bash
pbcopy < ~/Documents/iserein/docs/quote-reminders-report.sql
```

Paste it into a Supabase SQL Editor query. Vercel's cron/function logs show aggregate attempted, sent, expired and failed counts. No raw endpoint, device encryption secret, IP address or reader token is logged. Short-lived keyed network hashes and browser hashes limit enrollment/test spam. Old rate-limit buckets are removed on subsequent requests. This is basic abuse protection, not identity verification.

The sender processes bounded batches and schedules protected continuations when needed. Claims prevent duplicate attempts across concurrent or repeated runs. Provider timeouts and transient failures are retried on the next daily run; expired endpoints are disabled. There is a guard of 100 continuation steps per chain; check logs and hosting usage limits if the audience grows substantially. A service outage or paused Supabase project can prevent reminders from sending.

## Verification before delivery

The notification update passed 22 Node tests, ESLint and the Next.js production build. Both patches together passed 28 tests and a production build. Role/ownership/delivery-claim tests ran in a local PostgreSQL-compatible database, and browser-flow/layout checks covered widths 320–1440 pixels. The production dependency audit found no vulnerabilities. Local push endpoints and permission dialogs are simulated for automated testing; the encrypted Web Push request path is exercised without sending to real devices. A physical iPhone/Android test after deployment is still required. The service worker never intercepts page requests or caches readings, so the website's existing content/update behavior is preserved.
