# iSEREIN discussions — localhost review

This is a local review build, not a production migration. Do not push it to main yet.
The sandbox contains sample articles and separate accounts. Live articles and readers are not touched.

## Included
- Five tabs: Today, Topics, Explore, Discussions, Profile.
- Books and Watch under Explore; /watch still works.
- Saved readings/books stay in Profile without requiring sign-in.
- Email-link sign-in, public display names, author badge, sign-out, account deletion.
- Collapsed article discussions, counts, text/emoji comments, one-level reply references.
- Edit/delete your comments, three reactions, private reports, 20 comments per page, refresh, local drafts.
- Topic filter, My conversations, opt-in IN-APP conversation updates.
- Author/moderator tools: hide/restore reported comments, restrict/restore readers, close/reopen discussions.
- Private feedback moves to About & Contact via email. Existing private feedback is not published.
- Database-enforced ownership, verified email, publication checks, posting limits, plain text.

## Not enabled in this local review
- No email or push delivery for discussion replies yet. Following adds in-app updates only.
- No live presence/automatic real-time stream; use Refresh conversation.
- No cross-device syncing of saved items.
- No real-world email provider, production CAPTCHA, or deployment has been configured.
- The sample sandbox does not configure production daily reminders, private reaction feedback,
  or article view-count services. Their existing production integrations remain unchanged.
- Two-account browser review and actual email-link flow still need testing on your Mac.

## 1. Prerequisite
Install and open Docker Desktop for Mac. Leave it running.
The scripts use Supabase CLI 3.1.0 through npx. You already have Node/npm.

## 2. Apply on a separate branch — VS Code Terminal
~~~bash
cd ~/Documents/iserein
git switch -c feature/local-discussions
git apply --check ~/Downloads/iserein-local-discussions.patch &&
git apply ~/Downloads/iserein-local-discussions.patch &&
npm install
~~~
Do not push. Leave unrelated untracked files alone.

## 3. Start a separate local Supabase
~~~bash
npm run discussions:start
~~~
First start downloads Docker images and applies local migrations. It may take several minutes.
No Supabase login, hosted project link, db push, or production SQL is needed.
Keep your existing .env.local unchanged.

## 4. Run the local app
Stop an existing Next dev server on port 3000 with Ctrl+C, then:
~~~bash
npm run discussions:dev
~~~
Open http://localhost:3000.
This special launcher reads the local API key, validates a loopback URL, and overrides inherited live
Supabase and notification credentials for that process only. It does not edit .env.local.
Use this command for this test; ordinary npm run dev still uses your existing environment.
Use localhost consistently for the app, not a mixture of localhost and 127.0.0.1.

## 5. Test sign-in
In Profile enter fabien@example.test.
Open http://localhost:54324 to see the LOCAL test mailbox. No real emails are sent.
Open the sign-in link in the same browser profile that requested it (PKCE).
Save a display name in Profile, then return to a sample article.

For a second account use an incognito window and reader@example.test.
Open that second account’s sign-in link in the incognito window, not the first account’s window.

## 6. Give your local account author/moderator access
After saving the display name, open LOCAL Studio at http://localhost:54323.
Run this in its SQL editor, not your hosted Supabase dashboard:
~~~sql
update community_private.members
set moderator = true
where user_id = (
  select id from auth.users where email = 'fabien@example.test'
);
~~~
Refresh Profile. Manage discussions appears.
Author privileges never come from public signup metadata.

## 7. Two-account review
- Read without sign-in; confirm local saved books/readings work.
- Write a draft, sign in, choose a name, return and post.
- Post text and an emoji-only comment: count increases by two.
- React to a comment: reaction total changes, discussion count does not.
- Reply, edit/delete your own comment.
- Tomorrow’s article must not allow a discussion before publication.
- Follow a conversation, post as the other account, then view updates in My conversations.
- Unfollow and confirm later comments do not add updates.
- Report as a reader; review as Fabien; hide/restore and close/reopen.
- Restrict/restore the reader’s posting access.
- Regular accounts cannot access moderation or edit others’ comments.
- Delete a test account: its bodies disappear; other readers’ replies remain.
- Test keyboard access, phone-sized screen, offline retry, and draft preservation.

## 8. Stop
Ctrl+C stops Next. Then:
~~~bash
npm run discussions:stop
~~~
Default stop preserves the local database. Do not use --no-backup or db reset unless intentionally
discarding all local test accounts/comments.

## Verification
~~~bash
npm run test:discussions
~~~
The isolated PostgreSQL test checks role permissions, ownership, future publication, emoji counts,
reactions, private reports, moderation, following, unfollowing, and account deletion.
It does not replace real browser sign-in testing.

## Before production
Review this UI first. Prepare a separate production migration using only the discussion schema:
NEVER apply the local_catalog bootstrap to your live database.
Configure SMTP/auth redirects, CAPTCHA or equivalent sign-in abuse controls, retention/moderation,
and whichever optional reply delivery channel you choose. Stage and test notifications before deployment.

Official references:
- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/local-development/cli/config
- https://supabase.com/docs/guides/auth/auth-email-passwordless
