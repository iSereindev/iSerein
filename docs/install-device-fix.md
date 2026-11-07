# Installation and reminder access

The install page now keeps a useful action visible when the browser does not offer a native install prompt. iPhone readers see Apple Home Screen instructions; Android readers see Chrome instructions. There is a copyable website link and guidance for readers arriving through social apps.

Safari on iPhone does not implement the website-triggered install prompt. The reader must use Share, Add to Home Screen, and Add. This update explains that process; it does not claim to download an App Store app or automatically install on iOS.

The installed app's header now links to Quote reminders. The direct reminder link opens the settings panel. Home reminder settings remain visible while quotes load and when the quote request fails or returns no active quotes. The existing carousel interval, colours, articles, feedback, keys, daily delivery time and service-worker notification handlers are unchanged.

Some embedded browsers deliberately use an ordinary Safari user agent, so detection cannot be guaranteed. The manual copy-and-open guidance remains available even when a browser is not recognised as embedded.

## Apply on your Mac

Download iserein-install-reminders-fix.patch into Downloads. Run:

    cd ~/Documents/iserein &&
    git apply --check ~/Downloads/iserein-install-reminders-fix.patch &&
    git apply ~/Downloads/iserein-install-reminders-fix.patch

No additional Supabase query, environment variable or dependency is required.

Check and publish:

    npm test &&
    npm run lint &&
    npm run build &&
    git diff --cached --quiet &&
    git apply --cached ~/Downloads/iserein-install-reminders-fix.patch &&
    git commit -m "Clarify installation and keep quote reminders accessible" &&
    git push origin main

The staged-change guard stops if other work is already staged. Inspect git status --short if the block stops before committing.

## Device checks after Vercel is Ready

1. Open iserein.app/install in iPhone Safari. Confirm the iPhone steps and Copy website link button appear. Use Safari's actual Share menu to add the app.
2. Open its new Home Screen icon. The header should show Quote reminders. Follow that link, enable reminders and send a test quote.
3. Open the link inside LinkedIn, Instagram or WhatsApp. Use the app's external-browser menu when offered, or copy the website link into Safari or Chrome. Some embedded browsers cannot be reliably recognised.
4. In Android Chrome, check the native Install iSEREIN button if offered. Otherwise use the stated Chrome menu route. An install prompt is controlled by the browser and is not guaranteed to appear on every visit.
5. Check that the home reminder control remains present if quotes are temporarily unavailable.

Browser automation cannot reproduce Apple's native installation sheet or delivery to a physical iPhone. Complete the physical-device checks above after deployment.

## Checks before delivery

All 36 Node tests, ESLint and the Next.js production build passed. The new tests cover iPhone Safari, Chrome on iPhone, iPads requesting desktop sites, Android Chrome, known embedded browsers, and the notification prerequisites.

Separate React server-rendering checks confirmed that reminder settings remain present while quotes are pending, after a failed quote request, with no active quotes, and alongside successfully loaded quotes.

The managed preview service adds command-line options that Next.js does not accept, so the full app server could not run there. The unchanged production install HTML and its compiled assets were checked through the service's static preview instead. Browser checks confirmed copy-link feedback, visible alternative device steps, direct-link panel opening, and no horizontal overflow at 320, 390, 768 and desktop widths. These are Chrome layout checks, not native Safari or Android installation tests. The static preview does not exercise the live notification backend.

The existing live install page and reminder controls were also inspected. Complete the physical-device installation and notification checks after deployment.

Simulated iPhone and Android in-app browser user agents were also rendered with the real compiled client components. The iPhone showed Safari Home Screen instructions; the embedded-browser case showed the external-browser recovery path. The install page displayed one set of instructions rather than repeating them inside reminder settings. These simulations do not reproduce the native operating-system menus.
