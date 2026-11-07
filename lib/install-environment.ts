export type InstallDevice = "ios" | "android" | "desktop";

type DeviceFacts = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

// Used for instructions only. Notification support is checked separately.
export function installDevice(facts: DeviceFacts): InstallDevice {
  if (/iPad|iPhone|iPod/i.test(facts.userAgent)
    || (facts.platform === "MacIntel" && (facts.maxTouchPoints ?? 0) > 1)) return "ios";
  return /Android/i.test(facts.userAgent) ? "android" : "desktop";
}

// Some in-app browsers use a normal Safari user agent and cannot be detected.
// Keep the manual "opened inside another app" instructions available as well.
export function embeddedBrowser(userAgent: string): boolean {
  return /LinkedIn|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|WhatsApp|MicroMessenger|Line\/|TikTok|Bytedance|Snapchat|\bwv\b/i.test(userAgent);
}

export function reminderPrerequisite(facts: {
  device: InstallDevice;
  installed: boolean;
  embedded: boolean;
  supported: boolean;
}): "install" | "browser" | "unsupported" | null {
  if (facts.embedded && !facts.installed) return "browser";
  if (facts.device === "ios" && !facts.installed) return "install";
  return facts.supported ? null : "unsupported";
}

export const INSTALL_GUIDES: Record<InstallDevice, {
  label: string;
  heading: string;
  steps: readonly string[];
}> = {
  ios: {
    label: "iPhone & iPad",
    heading: "Add with Safari.",
    steps: [
      "Open iserein.app in Safari.",
      "Tap Safari’s Share button (the square with an upward arrow). On some layouts, open the page menu first, then Share.",
      "Scroll down the share sheet and choose Add to Home Screen. If it is missing, choose Edit Actions and add it.",
      "Turn on Open as Web App if shown, then tap Add.",
      "Open iSEREIN from its new Home Screen icon. Then enable Daily quote reminders inside the app.",
    ],
  },
  android: {
    label: "Android",
    heading: "Add with Chrome.",
    steps: [
      "Open iserein.app in Chrome.",
      "Tap Install iSEREIN above when available, or open Chrome’s three-dot menu.",
      "Choose Install app or Add to Home screen. Some versions show Install and create shortcut first.",
      "Confirm the installation, then open iSEREIN from its icon.",
      "Open Daily quote reminders and choose Enable daily reminders.",
    ],
  },
  desktop: {
    label: "Computer",
    heading: "Add from your browser.",
    steps: [
      "In Chrome or Edge, use Install iSEREIN above when available, or look for the install option in the address bar or browser menu.",
      "On a Mac with Safari 17 or later, choose File, then Add to Dock.",
      "If your browser does not offer installation, you can keep reading on the website or use the phone steps below.",
    ],
  },
};
