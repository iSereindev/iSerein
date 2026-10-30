# Publish short videos on iSEREIN

The new page is `/watch`, linked as **Watch** in the bottom navigation. It uses the existing cream and chocolate palette. Videos load in the YouTube player only after someone selects Play; choosing another removes the previous player. Posters load from YouTube. Six videos appear per page, newest publication date first, then newest ID.

YouTube hosts the video files. Supabase stores their titles, links and captions. There is no public upload form or new paid service. YouTube branding and advertising can appear, including in its privacy-enhanced player.

## 1. Create the videos table in Supabase

In the existing iSEREIN Supabase project, open **SQL Editor → New query**. Paste the contents of `docs/videos-setup.sql` and select **Run** once. The query creates the videos table with row-level security and read-only visitor access. It leaves the existing tables unchanged. There is no need to alter project-wide default privileges.

Do this before deploying the patch. If the table is missing or unavailable, Watch shows a retry message. An empty table shows a “first short films” message.

## 2. Upload a short to YouTube

1. Open YouTube Studio with your own channel and upload your video.
2. Choose **Public** or **Unlisted** visibility. Private videos will not work for visitors. Unlisted means anyone with the link can watch; it is not confidential.
3. In the video details, under **Show more**, leave **Allow embedding** checked. Add captions in YouTube Studio if you want them available in the player.
4. Copy the video’s share link. YouTube Shorts links, standard watch links and `youtu.be` share links are supported. Use the complete `https://` link, not the HTML embed code. The page is designed for portrait 9:16 shorts.

## 3. Publish on iSEREIN

In **Supabase → Table Editor → videos → Insert row**, fill in:

| Field | What to enter |
| --- | --- |
| `id` | Leave the generated value alone. |
| `title` | The video title, up to 160 characters. |
| `youtube_url` | Paste the complete YouTube video link. |
| `caption` | Optional description, up to 1,000 characters. This is a caption below the video, not subtitles. |
| `published_date` | Today, or a future date to schedule it. Defaults to today in UTC. |
| `active` | Set to `true` when ready to publish. Defaults to `false` for a draft. |
| `created_at` | Leave the automatic timestamp alone. |

Save the row, then open `https://iserein.app/watch`. Allow about a minute for the cache to refresh, then refresh the page; the first request after expiry can still show the cached version while it updates. No redeployment is needed for new videos or edits.

Set `active` to `false` to hide a video. Future dates stay hidden until midnight UTC, which is 08:00 in Malaysia. A malformed or unsupported link is skipped, with its row ID noted in the Vercel server logs. Check the full YouTube link if a published row does not appear.

## First playback check

After adding your first real video, test Watch on your phone: Play, pause, fullscreen, sound and captions. Opening a second player should stop the first; Close player returns to its poster. If YouTube refuses playback, use the Watch on YouTube link and check that the upload allows embedding and is not private or age restricted. YouTube may be unavailable on some networks or in some countries.

## Deployment

The patch adds no npm dependencies or environment variables. Apply it to the current project, commit the changed files, and push `main` as usual. Vercel rebuilds the app using the existing Supabase variables. The sitemap includes `/watch` automatically; no Search Console resubmission is needed.
