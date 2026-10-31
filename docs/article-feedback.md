# Private article feedback

The full reading page and each topic's front reading card now end with **Did this speak to you?**, thumbs up/down, and an optional **Share a thought** form. No account, name or email is required. Comments and reaction totals are private to the owner; the visitor-facing app cannot read them. The page design and home quotes remain unchanged.

## Setup before deployment

1. Download `iserein-reader-feedback.patch` into your Mac's Downloads folder. In Terminal, paste this block once:

   ```bash
   cd ~/Documents/iserein &&
   git apply --check ~/Downloads/iserein-reader-feedback.patch &&
   git apply ~/Downloads/iserein-reader-feedback.patch
   ```

2. In Terminal, run the following to copy the database setup. Then open Supabase **SQL Editor → New query**, paste it, and click **Run**. The script adds two protected tables, a server-only function and an owner-only summary view. It does not change articles, books, quotes or videos. It is safe to rerun.

   ```bash
   pbcopy < ~/Documents/iserein/docs/article-feedback-setup.sql
   ```

3. In Supabase **Settings → API Keys → Publishable and secret API keys**, copy a **secret** key beginning `sb_secret_`. If that tab offers **Create new API keys**, it adds keys alongside the existing keys; leave the existing website key alone.
4. In Vercel, open the iSEREIN project, then **Settings → Environment Variables**. Add **SUPABASE_SECRET_KEY** with that secret value for Production. Add it for Preview as well if you use preview deployments. Mark it sensitive if the option is available. This key is only for the server: never prefix its name with `NEXT_PUBLIC_`, put it into a source file, commit it, or send it in chat.
5. For local feedback testing, add the same `SUPABASE_SECRET_KEY` variable to your existing `.env.local` file in VS Code, then restart the local server. This file stays out of Git. The existing Supabase URL and publishable key stay as they are. A legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted if already configured, but the new secret key is recommended.
6. After adding the Vercel variable, paste the following block into Terminal. It tests the app, stages only this feature's files, commits and pushes them. If the cached-diff check stops the block, there are already staged changes; inspect `git status --short` before committing unrelated work. No new npm packages are needed.

   ```bash
   cd ~/Documents/iserein &&
   npm test &&
   npm run lint &&
   npm run build &&
   git diff --cached --quiet &&
   git add -- \
     'app/api/article-feedback/route.ts' \
     'app/reading/[id]/ArticleFeedback.tsx' \
     'app/reading/[id]/page.tsx' \
     'app/topics/[topic]/page.tsx' \
     lib/article-feedback.ts \
     docs/article-feedback-setup.sql \
     docs/article-feedback-report.sql \
     docs/article-feedback.md \
     tests/article-feedback.test.mjs &&
   git commit -m "Add private reader feedback to articles" &&
   git push origin main
   ```

7. When Vercel reports the deployment **Ready**, open a published reading on `https://iserein.app` or its topic card. Scroll to **Did this speak to you?**, tap Yes, change it to Not quite, then send a short private message. In Supabase, confirm the reaction changed on one `article_feedback` row and the message was saved. Repeat on your phone. A second browser/device can create another row; it should not show the first reader's comment.

## Where to see feedback

In Supabase Table Editor, open **article_feedback** for private responses (`article_id` identifies the reading). Open the **article_feedback_summary** view for article titles, topics, thumbs up/down, comment counts and the percentage of submitted reactions that were positive. Alternatively, run `docs/article-feedback-report.sql` in SQL Editor: its first query shows totals, and its second shows the messages with article titles.

To copy that report query from your Mac:

```bash
pbcopy < ~/Documents/iserein/docs/article-feedback-report.sql
```

The percentage covers people who reacted. No response does not mean dislike. Use your existing Vercel Analytics page visits alongside feedback, and look at whether article visits continue over time. Reaching the bottom or opening a page alone does not prove somebody read it.

## Counting and privacy

One response per browser and article is stored. A reader can change their reaction; a later comment updates their earlier comment. Voting does not erase a comment, and commenting does not erase a vote. A browser-local marker restores the selected reaction after refresh; private message text is not saved in browser storage. Clearing cookies, using private browsing, another device, or another domain can create another response. These are approximate browser-level counts, not verified unique people or a poll with identity checks.

A random HttpOnly cookie is set only when feedback is accepted. The database stores an article-specific keyed hash, not the cookie token or a raw IP address. Short-lived keyed network hashes support rate limits; old buckets are removed on subsequent submissions. Changing the server secret changes these hashes, so returning browsers may then count as new responders. The endpoint checks same-origin requests, bounds payload size, validates inputs, and applies a honeypot and shared database rate limits. This provides basic abuse protection, not a guarantee against determined spam.

The public database roles have no read/write access to the feedback tables or report, and cannot invoke the write function. Only the server's secret key submits feedback. Keep the secret key private. Missing configuration or a database failure produces an honest retry message; the page never reports a successful save on failure.

## Daily quote widgets

A true phone home-screen widget needs native iPhone/Android components. This patch does not add a widget or notifications. Optional Web Push reminders are a separate option for the installed web app; on iPhone readers must install it on their home screen and grant notification permission. Keep the current carousel as it is until the reminder approach is chosen.

## Verification completed before delivery

18 Node tests, ESLint and the Next.js production build passed. A local Postgres-compatible test database checked role permissions, private report access, repeat votes, comment preservation, rate limits, and UTC publication filtering. Browser checks passed at widths 320, 390, 768 and 1440 pixels, including both article routes, refresh persistence, changing readings, failure/retry messages, request validation and checking that the server secret was absent from client JavaScript. Tests used local content fixtures, and the existing Geist font files were served locally to avoid external font-request failures. No live reader data was changed. This patch still requires the Supabase setup, Vercel variable and deployment above.
