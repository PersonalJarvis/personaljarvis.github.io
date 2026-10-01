/**
 * Live contract test: the installers the buttons link to exist on the latest
 * release, and the app repository still publishes and updates under the same
 * names.
 *
 * Network-bound on purpose, so it does NOT gate a deploy — a release in
 * flight leaves `releases/latest` without installers for the better part of
 * an hour, and that must not stop the site from publishing. It runs in the
 * `downloads` workflow on every push and once a day.
 *
 * Run: node --experimental-strip-types --test scripts/test-download-live.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { INSTALLER_ASSETS, INSTALLER_CHECKSUMS, installerUrl } from "../src/lib/install.ts";

const APP_RAW = "https://raw.githubusercontent.com/PersonalJarvis/PersonalJarvis/main";
const ASSETS = Object.values(INSTALLER_ASSETS);
/** The smallest installer on record is ~239 MB; anything tiny is an error page. */
const MIN_BYTES = 50 * 1024 * 1024;

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { redirect: "follow", ...options });
      if (response.status < 500) return response;
      last = new Error(`${url} -> HTTP ${response.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw last;
}

const text = async (url) => {
  const response = await fetchWithRetry(url);
  assert.equal(response.status, 200, url);
  return response.text();
};

const names = (source) =>
  new Set([...source.matchAll(/PersonalJarvis-[A-Za-z0-9_-]+\.(?:exe|dmg|AppImage)/g)].map((m) => m[0]));

test("the in-app updater picks the same four files the buttons link to", async () => {
  const updater = await text(`${APP_RAW}/jarvis/core/installer_update.py`);
  assert.deepEqual([...names(updater)].sort(), [...ASSETS].sort());
});

test("the release workflow publishes the same four files", async () => {
  const workflow = await text(`${APP_RAW}/.github/workflows/desktop-installers.yml`);
  const published = names(workflow);
  for (const asset of ASSETS) assert.ok(published.has(asset), `${asset} missing from desktop-installers.yml`);
});

for (const asset of ASSETS) {
  test(`the latest release serves ${asset}`, async () => {
    const response = await fetchWithRetry(installerUrl(asset), { method: "HEAD" });
    assert.equal(response.status, 200, `${installerUrl(asset)} -> ${response.status}`);
    const size = Number(response.headers.get("content-length"));
    assert.ok(size > MIN_BYTES, `${asset} is ${size} bytes`);
    assert.match(response.url, /^https:\/\//);
  });
}

test("the release carries a checksum for every installer", async () => {
  const sums = await text(installerUrl(INSTALLER_CHECKSUMS));
  for (const asset of ASSETS) {
    assert.match(sums, new RegExp(`^[0-9a-f]{64}\\s+\\*?${asset.replace(/\./g, "\\.")}$`, "m"), asset);
  }
});
