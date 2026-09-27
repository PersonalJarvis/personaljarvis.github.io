import assert from "node:assert/strict";
import test from "node:test";
import { detectOs, detectArchitecture, installerFor, releaseDownloads, INSTALLERS, REPO, downloadLabelFor, INSTALL_TARGETS, INSTALL_COMMANDS } from "../src/lib/install.ts";
const names = [...INSTALLERS.map((item) => item.asset), "installers-SHA256SUMS.txt", "installers-SHA256SUMS.txt.cosign.sig", "release-qualification.json"];
function release() {
  return { tag_name: "v1.2.3", draft: false, prerelease: false, assets: names.map((name) => ({ name, size: 100, browser_download_url: `${REPO}/releases/download/v1.2.3/${name}` })) };
}
test("desktop labels and downloads always match the detected OS", () => {
  for (const [ua, os, arch, extension] of [
    ["Windows NT 10.0; Win64; x64", "windows", "x64", ".exe"],
    ["X11; Linux x86_64", "linux", "x64", ".AppImage"],
  ]) {
    assert.equal(detectOs(ua), os);
    assert.equal(detectArchitecture(ua), arch);
    assert.ok(installerFor(os, arch).asset.endsWith(extension));
    assert.match(downloadLabelFor(os, "de-DE"), /^Download f\u00fcr /);
  }
});

test("macOS uses CLI only and every platform retains a command", () => {
  assert.equal(detectOs("Macintosh; ARM64 Mac OS X"), "macos");
  for (const arch of ["x64", "arm64", null]) assert.equal(installerFor("macos", arch), null);
  assert.equal(downloadLabelFor("macos", "de-DE"), "macOS per CLI installieren");
  assert.equal(INSTALL_TARGETS.length, 3);
  assert.equal(INSTALL_TARGETS.find((item) => item.id === "windows").command, INSTALL_COMMANDS.windows);
  for (const os of ["macos", "linux"]) assert.equal(INSTALL_TARGETS.find((item) => item.id === os).command, INSTALL_COMMANDS.unix);
  assert.ok(!names.some((name) => name.endsWith(".dmg")));
  assert.equal(releaseDownloads(release()).size, 5);
});
test("mobile, ChromeOS and unknown UAs never receive a desktop default", () => {
  for (const ua of ["Android Linux", "iPhone Mac OS X", "iPad", "CrOS X11", "unknown", ""]) assert.equal(detectOs(ua), null);
  assert.equal(detectOs("Macintosh", 5), null);
  assert.equal(installerFor(null, "x64"), null);
});
test("ambiguous Macs and unsupported CPUs require an explicit choice", () => {
  assert.equal(detectArchitecture("Macintosh; Intel Mac OS X"), null);
  assert.equal(detectArchitecture("Windows NT 10.0"), null);
  assert.equal(detectArchitecture("Win64", { architecture: "arm", bitness: "64" }), "arm64");
  assert.equal(installerFor("windows", "arm64"), null);
  assert.equal(installerFor("linux", "arm64"), null);
  assert.equal(detectArchitecture("Win64", { architecture: "x86", bitness: "32" }), null);
  assert.equal(detectArchitecture("Win64", { architecture: "riscv", bitness: "64" }), null);
});
test("complete stable release maps exact assets", () => {
  assert.equal(releaseDownloads(release()).size, names.length);
});
test("each absent, duplicated, empty or foreign asset blocks the release", () => {
  for (const name of names) {
    for (const corrupt of [
      (r) => { r.assets = r.assets.filter((a) => a.name !== name); },
      (r) => { r.assets.push(r.assets.find((a) => a.name === name)); },
      (r) => { r.assets.find((a) => a.name === name).size = 0; },
      (r) => { r.assets.find((a) => a.name === name).browser_download_url = "https://example.com/installer"; },
      (r) => { r.assets.find((a) => a.name === name).browser_download_url = `${REPO}/releases/download/v1.0.0/${name}`; },
    ]) { const r = release(); corrupt(r); assert.throws(() => releaseDownloads(r)); }
  }
});
test("drafts, prereleases and malformed release payloads cannot be installed", () => {
  for (const r of [null, {}, { ...release(), draft: true }, { ...release(), prerelease: true }, { ...release(), tag_name: "v1.2.3-rc1" }]) assert.throws(() => releaseDownloads(r));
});
