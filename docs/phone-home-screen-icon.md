# Phone home-screen icon

The phone app icon combines a small Open Page emblem with a larger outlined
`iS` monogram. It uses the existing chocolate (`#5B3A2D`) and cream
(`#F6F0E8`) palette, with an opaque background and mask-safe padding.

This is a launcher-icon update. Website headers and the small browser favicon
keep the Open Page emblem. The install-page preview and notification image use
the launcher artwork; the small monochrome notification badge keeps the emblem.

## Assets

- `public/icons/iserein-signature-v1.svg`: outlined SVG master. It contains no
  font references or external dependencies.
- `public/icons/iserein-signature-v1-180.png`: iPhone/iPad Apple touch icon.
- `public/icons/iserein-signature-v1-192.png`: web-app and notification image.
- `public/icons/iserein-signature-v1-512.png`: high-resolution and maskable icon.

The monogram uses outlined glyphs from the project's DejaVu Serif font. Its
license is already included at `assets/share/DejaVu-LICENSE.txt`.

New icon URLs are intentional: updating the icon file alone may not cause an
installed browser app to reload it. The existing manifest `id`, `start_url`,
`scope`, app name, and service-worker registration path are preserved.
No database migration, dependency install, or environment change is required.

## Existing installations

Installed launchers can retain previous artwork, and an icon update is subject
to each browser and operating system's update behavior. Chrome may ask readers
to review an app identity update. Do not promise immediate replacement on every
phone, or change the app ID to force a new identity.

Saved readings live on the reader's device. Do not clear browser/app data or
remove the installed app as a routine icon-refresh instruction. Keep an
existing installation until its saved readings and notification setup have
been checked.

References:

- https://developer.chrome.com/blog/improvements-to-web-app-updates
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
