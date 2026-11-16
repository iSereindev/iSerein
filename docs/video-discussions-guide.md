# Video discussions

This upgrade adds the existing compact discussion UI below Watch videos, with a permanent `/watch/[id]` page for sign-in return links, directory links, moderation and reply emails. Videos appear with a Video label and filter in Discussions. Articles keep their existing discussions.

## Apply

1. Stop the local automatic reply-email checker while upgrading.
2. Run the supplied installer from the project folder. It verifies all existing file contents before changing anything and backs up changed files outside the repository. It never reads environment files, runs SQL, commits or deploys.
3. Copy `supabase/migrations/20261117000100_video_discussions.sql` into the existing Supabase SQL Editor and run once. This is an upgrade only; never rerun the local catalogue/bootstrap migrations on hosted Supabase. The upgrade is transactional and rolls back on errors. A second run intentionally fails instead of overwriting objects.
4. Run `node --test tests/video-discussions.test.mjs tests/reply-emails.test.mjs tests/reply-email-delivery.test.mjs` and `npm run build`. These tests use an in-memory database and mocked mail requests, not the hosted database or real email delivery.
5. Restart the local production server with `npm run start` after stopping its previous process.

## Quick local check

- Watch: every published video has its own collapsed Discussion count.
- Post under one video; confirm it does not appear under an article with the same numeric ID or under another video.
- Use a reader account to reply/react and report. Author can hide/resolve/close; reader cannot moderate/edit other people’s messages.
- Discussions: the conversation appears with Video label and opens its permanent page.
- Sign-in: request and open the link in the same browser session; the draft and video return target survive.
- Opt in to video reply emails using the receiving account, then reply from a different account. Email link goes to `/watch/ID#discussion`. Local tests of emailed links still require replacing the production origin with `http://localhost:3000` after Brevo redirects.
- Unsubscribe for a video must not disable an article’s consent. No emails are enabled automatically.

## Implementation

Private subjects reference either an article or a video with real foreign keys. Positive subject IDs retain article IDs; negative IDs identify videos. This preserves deployed RPC signatures and existing data. Legacy `article_id`/`p_article` identifiers inside the discussion subsystem now mean the subject ID; they are not public article IDs when negative. Never pass a negative discussion ID to article APIs.

Catalogue rows are not copied or seeded. A restricted private view reads current source titles/publication dates, and insert triggers register future catalogue rows. Deleting a source cascades only its discussion data. Catalogue IDs must remain positive and stable.

The shared sender keeps existing batching, rate caps, self-exclusion and unsubscribe behavior. Daily reading/push reminders, saved lists, article feedback and account permissions are unchanged. Deploy all application files together before enabling production video reply-email delivery.

This does not configure production scheduling or deploy code. The production scheduler remains a separate release step.
