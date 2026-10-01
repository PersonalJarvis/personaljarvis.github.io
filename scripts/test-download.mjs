/**
 * Unit tests for the download contract in src/lib/install.ts: which installer
 * each machine is offered, what the button says, and where it points.
 *
 * Run: node --experimental-strip-types --test scripts/test-download.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DOWNLOAD,
  DOWNLOAD_SIGNATURES,
  DOWNLOAD_TARGETS,
  INSTALLER_ASSETS,
  INSTALL_COMMANDS,
  REPO,
  RELEASES,
  detectDownload,
  detectOs,
  downloadTargetFor,
  installerLabelFor,
  installerUrl,
  refineMacArchitecture,
} from "../src/lib/install.ts";
import { USER_AGENTS } from "./fixtures/user-agents.mjs";

const LATEST = "https://github.com/PersonalJarvis/PersonalJarvis/releases/latest/download/";

for (const agent of USER_AGENTS) {
  test(`${agent.name} is offered ${agent.download}`, () => {
    assert.equal(detectDownload(agent.ua, agent.touch), agent.download);
  });
  test(`${agent.name} opens the command box on ${agent.install}`, () => {
    assert.equal(detectOs(agent.ua), agent.install);
  });
}

test("the asset names are the ones the app release workflow publishes", () => {
  assert.deepEqual(INSTALLER_ASSETS, {
    "macos-arm64": "PersonalJarvis-macOS-arm64.dmg",
    "macos-x64": "PersonalJarvis-macOS-x64.dmg",
    windows: "PersonalJarvis-Setup-x64.exe",
    linux: "PersonalJarvis-Linux-x86_64.AppImage",
  });
});

test("every installer link is the stable latest-release address over https", () => {
  for (const target of DOWNLOAD_TARGETS) {
    if (target.id === "other") continue;
    assert.equal(target.href, `${LATEST}${target.asset}`);
    assert.equal(target.href, installerUrl(target.asset));
    assert.ok(!/\d+\.\d+\.\d+/.test(target.href), "a versioned link goes stale on the next release");
  }
});

test("machines without an installer go to the release page, not a file", () => {
  const other = downloadTargetFor("other");
  assert.equal(other.asset, null);
  assert.equal(other.href, RELEASES);
  assert.equal(RELEASES, `${REPO}/releases/latest`);
  assert.equal(DEFAULT_DOWNLOAD, "other", "with scripting off nothing is known, so no file is guessed");
});

test("the button names the machine it serves", () => {
  assert.equal(installerLabelFor("windows"), "Download for Windows");
  assert.equal(installerLabelFor("linux"), "Download for Linux");
  assert.equal(installerLabelFor("macos-arm64"), "Download for macOS");
  assert.equal(installerLabelFor("macos-x64"), "Download for macOS");
  assert.equal(installerLabelFor("other"), "Download");
});

test("every target has one entry, a note, and a valid signature table", () => {
  const ids = DOWNLOAD_TARGETS.map((target) => target.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const target of DOWNLOAD_TARGETS) assert.ok(target.note.length > 10, target.id);
  const signed = new Set(DOWNLOAD_SIGNATURES.map(([id]) => id));
  for (const id of ["windows", "macos-arm64", "linux", "other"]) assert.ok(signed.has(id), id);
  for (const [, source] of DOWNLOAD_SIGNATURES) assert.doesNotThrow(() => new RegExp(source, "i"));
});

test("Chromium's architecture hint moves a Mac between builds, and only a Mac", () => {
  assert.equal(refineMacArchitecture("macos-arm64", "x86"), "macos-x64");
  assert.equal(refineMacArchitecture("macos-x64", "arm"), "macos-arm64");
  assert.equal(refineMacArchitecture("macos-arm64", "arm"), "macos-arm64");
  assert.equal(refineMacArchitecture("macos-arm64", undefined), "macos-arm64");
  assert.equal(refineMacArchitecture("macos-arm64", ""), "macos-arm64");
  assert.equal(refineMacArchitecture("windows", "arm"), "windows");
  assert.equal(refineMacArchitecture("linux", "x86"), "linux");
  assert.equal(refineMacArchitecture("other", "x86"), "other");
});

test("the command-line install is unchanged", () => {
  assert.match(INSTALL_COMMANDS.windows, /^irm https:\/\/raw\.githubusercontent\.com\/.+\/install\.ps1 \| iex$/);
  assert.match(INSTALL_COMMANDS.unix, /^curl -fsSL https:\/\/raw\.githubusercontent\.com\/.+\/install\.sh \| bash$/);
});
