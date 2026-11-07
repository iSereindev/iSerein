import test from "node:test";
import assert from "node:assert/strict";
import { embeddedBrowser, installDevice, INSTALL_GUIDES, reminderPrerequisite } from "../lib/install-environment.ts";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const chromeIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1";
const android = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15";

test("iPhone Safari and Chrome receive the Apple Home Screen instructions", () => {
  for (const userAgent of [iphone, chromeIOS]) {
    assert.equal(installDevice({ userAgent, platform: "iPhone", maxTouchPoints: 5 }), "ios");
    assert.equal(embeddedBrowser(userAgent), false);
  }
});

test("iPads requesting desktop websites are distinguished from actual Macs", () => {
  assert.equal(installDevice({ userAgent: mac, platform: "MacIntel", maxTouchPoints: 5 }), "ios");
  assert.equal(installDevice({ userAgent: mac, platform: "MacIntel", maxTouchPoints: 0 }), "desktop");
});

test("normal Android Chrome is not mistaken for an embedded browser", () => {
  assert.equal(installDevice({ userAgent: android }), "android");
  assert.equal(embeddedBrowser(android), false);
});

test("known social browsers and Android WebViews receive external-browser guidance", () => {
  for (const userAgent of [iphone + " LinkedInApp", iphone + " Instagram", iphone + " [FBAN/FBIOS;FBAV/500]", iphone + " WhatsApp", android.replace("Android 15;", "Android 15; wv;")]) {
    assert.equal(embeddedBrowser(userAgent), true);
  }
});

test("Apple browser tabs get installation guidance before missing push APIs are interpreted", () => {
  assert.equal(reminderPrerequisite({ device: "ios", installed: false, embedded: false, supported: false }), "install");
  assert.equal(reminderPrerequisite({ device: "ios", installed: false, embedded: false, supported: true }), "install");
});

test("supported installed iPhone apps can proceed while older unsupported apps cannot", () => {
  assert.equal(reminderPrerequisite({ device: "ios", installed: true, embedded: false, supported: true }), null);
  assert.equal(reminderPrerequisite({ device: "ios", installed: true, embedded: false, supported: false }), "unsupported");
});

test("in-app browsers receive a usable recovery path even if they expose push interfaces", () => {
  for (const device of ["ios", "android"]) {
    assert.equal(reminderPrerequisite({ device, installed: false, embedded: true, supported: true }), "browser");
  }
  assert.equal(reminderPrerequisite({ device: "android", installed: false, embedded: false, supported: true }), null);
  assert.equal(reminderPrerequisite({ device: "desktop", installed: false, embedded: false, supported: false }), "unsupported");
});

test("Apple instructions include the actual installation and reopening actions", () => {
  const steps = INSTALL_GUIDES.ios.steps.join(" ");
  assert.match(steps, /Share button/);
  assert.match(steps, /Add to Home Screen/);
  assert.match(steps, /Open as Web App/);
  assert.match(steps, /Home Screen icon/);
});
