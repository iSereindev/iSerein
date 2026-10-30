# iSEREIN technical update

This update keeps the existing site layouts, colours, navigation labels, contact
email, quote autoplay, installation button, and device-based saved collections.
It adds no newsletter, email collection, accounts, or paid service.

## What changes

- Article bodies render Markdown, including **bold**, emphasis, headings, lists,
  quotes, links, and horizontal rules. Raw HTML is ignored. Subtitles and previews
  remain plain text without visible Markdown markers.
- Readings are ordered by publication date, then ID. Previous/Next can reach
  multiple readings published on the same date. The homepage and `/reading`
  consistently select the most recent reading by that order.
- Each public page has its own title, description, and canonical production URL.
  Sharing a reading includes a card with its title in the existing brand colours.
- `/robots.txt` and `/sitemap.xml` are generated automatically. The sitemap
  includes published readings only and excludes the device-specific collection.
- Missing and future-dated readings return a branded 404 and `noindex`. The
  existing reading loading indicator lives below the article validation layout,
  so a missing reading is checked before a success response starts streaming.
- Public article, quote, and book queries use a short data cache. HTML pages
  still render per request, preserving the existing topic shuffle behaviour.
  Content edits may take around a minute to appear; after a quiet period the
  first refresh can trigger revalidation, so refresh again after a moment.
- Publication-date values are part of article cache keys. New days are checked
  separately; future readings are excluded from pages, previews, and the sitemap.
- The existing UTC publication calendar is unchanged. A date starts at 00:00 UTC,
  which is 08:00 in Malaysia. Adding content in Supabase requires no deployment.
- Basic response headers protect against content-type guessing, framing, and
  unnecessary access to camera, microphone, and location. They do not replace
  a database permissions review.

## Database review: one separate, read-only check

The app's public pages cannot establish which Supabase permissions are enabled.
No grants or policies are changed by this update.

1. Open your Supabase project, then **SQL Editor**.
2. Open `docs/supabase-access-check.sql` from this repository and copy its contents.
3. Run that SQL in Supabase. It only reads permission and policy information.
4. Review both result sets together. A table grant alone does not establish
   whether a visitor can write; Row Level Security policies also apply.

The check selects no article text, email addresses, credentials, or API keys.
Any policy changes should be based on those results, rather than applying broad
write grants from a generic example.

## Checks

`npm test` checks the publication calendar and plain-text extraction from Markdown.
`npm run lint` checks the source. `npm run build` builds the production app using
your own environment settings. Vercel rebuilds the source after a GitHub push.

The update was also checked against sample data in a production server, including
real 404 responses, future-publication guards, same-day navigation, metadata,
sharing images, cache reuse, saved collections, quote autoplay, and phone layouts.
