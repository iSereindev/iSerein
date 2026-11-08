# Open Page logo

The Open Page emblem uses the existing chocolate (`#5B3A2D`) and cream
(`#F6F0E8`) palette. It is vector artwork recreated from the selected cap/app
concept, with a flat finish suitable for screens and printing.

## Files

- `lib/brand.ts`: the emblem's four paths and brand colours.
- `app/BrandLogo.tsx`: the emblem and existing iSEREIN wordmark for page headers.
- `public/brand/iserein-open-page.svg`: transparent chocolate master.
- `public/brand/iserein-open-page-cream.svg`: cream artwork for dark backgrounds.
- `public/brand/iserein-open-page-black.svg`: artwork for single-colour printing.
- `app/icon.svg` and `app/favicon.ico`: browser icons.
- `public/icons/iserein-open-page-{180,192,512}.png`: Apple and web-app icons.
- `public/icons/iserein-open-page-badge-96.png`: transparent notification badge.

The app-icon background is opaque chocolate. The emblem stays inside the
central safe area for rounded and circular icon masks. New icon URLs are used
in the manifest, Apple metadata, install page, and notification worker.
The old icon URLs also contain the new artwork for compatibility.

The manifest's `id`, `start_url`, and `scope` are preserved. This update needs
no database changes, new dependencies, or environment variables.

## Apply and deploy

Save `iserein-open-page-logo.patch` in Downloads. In the project's Terminal,
with no previously staged work, run:

```bash
cd ~/Documents/iserein &&
git diff --cached --quiet &&
git update-index --refresh &&
git apply --check ~/Downloads/iserein-open-page-logo.patch &&
git apply --index ~/Downloads/iserein-open-page-logo.patch &&
npm run build &&
git commit -m "Use Open Page logo across website and installed app" &&
git push origin main
```

Wait for Vercel's production deployment to finish before checking the public
website. Existing browser tabs and installed app icons may retain cached
artwork; this does not require rotating notification keys or clearing saved
readings. Avoid clearing browser or app data while checking the new branding.

## Validation

The production build and existing 36 tests pass. The install-page preview
shows the header emblem and app icon, and exposes the SVG favicon and Apple
touch-icon metadata. The build was checked with placeholder Supabase public
settings; no live database content was changed. Physical phone installation
was not repeated for this branding update.
