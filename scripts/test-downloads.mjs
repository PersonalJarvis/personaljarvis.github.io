import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/install.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { detectOs, detectArchitecture, installerFor, releaseDownloads, INSTALLERS, REPO, downloadLabelFor } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const names = [...INSTALLERS.map((item) => item.asset), "installers-SHA256SUMS.txt", "installers-SHA256SUMS.txt.cosign.sig", "release-qualification.json"];
function release() {
  return { tag_name: "v1.2.3", draft: false, prerelease: false, assets: names.map((name) => ({ name, size: 100, browser_download_url: `${REPO}/releases/download/v1.2.3/${name}` })) };
}
test("desktop labels and downloads always match the detected OS", () => {
  for (const [ua, os, arch, extension] of [
    ["Windows NT 10.0; Win64; x64", "windows", "x64", ".exe"],
    ["X11; Linux x86_64", "linux", "x64", ".AppImage"],
    ["Macintosh; ARM64 Mac OS X", "macos", "arm64", ".dmg"],
  ]) {
    assert.equal(detectOs(ua), os);
    assert.equal(detectArchitecture(ua), arch);
    assert.ok(installerFor(os, arch).asset.endsWith(extension));
    assert.match(downloadLabelFor(os, "de-DE"), /^Download f\u00fcr /);
  }
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
