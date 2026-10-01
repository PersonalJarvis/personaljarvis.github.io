/**
 * Integration test of the download buttons AS THEY SHIP: reads the built
 * pages in `dist/` (run `npm run build` first), executes the inline head probe
 * exactly as a browser would receive it, and checks that the anchor the CSS
 * reveals for that machine points at the right installer.
 *
 * The unit test proves the rules; this proves the rules survived the trip
 * through `define:vars`, Astro's scoping and the minifier — the three places a
 * correct `install.ts` can still turn into a wrong button.
 *
 * Run: node --experimental-strip-types --test scripts/test-download-dist.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { DOWNLOAD_TARGETS, RELEASES, installerLabelFor } from "../src/lib/install.ts";
import { USER_AGENTS } from "./fixtures/user-agents.mjs";

const DIST = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const page = (route) => readFileSync(join(DIST, route, "index.html"), "utf8");
const PAGES = ["", "clis", "plugins", "skills", "imprint", "privacy"].filter((route) =>
  existsSync(join(DIST, route, "index.html")),
);
const HREF = Object.fromEntries(DOWNLOAD_TARGETS.map((target) => [target.id, target.href]));
const IDS = DOWNLOAD_TARGETS.map((target) => target.id);

const decode = (value) =>
  value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Every opening tag of `name` carrying `marker`, with its attributes parsed. */
function tags(html, name, marker) {
  const found = [];
  const pattern = new RegExp(`<${name}\\b([^>]*\\b${marker}\\b[^>]*)>([\\s\\S]*?)</${name}>`, "g");
  for (const match of html.matchAll(pattern)) {
    const attributes = {};
    for (const attribute of match[1].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
      attributes[attribute[1]] = attribute[2] === undefined ? "" : decode(attribute[2]);
    }
    found.push({ attributes, text: decode(match[2].replace(/<[^>]+>/g, "")).trim() });
  }
  return found;
}

/** All CSS the front page loads: inline <style> blocks and linked sheets. */
function css(html) {
  let text = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  for (const link of html.matchAll(/<link[^>]+href="(\/_astro\/[^"]+\.css)"/g)) {
    text += "\n" + readFileSync(join(DIST, link[1]), "utf8");
  }
  return text;
}

/** The inline head probe, run against a fake navigator. */
function probe(html, userAgent, maxTouchPoints) {
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((body) => body.includes("data-download") && body.includes("setAttribute"));
  assert.ok(script, "the head probe is in the page");
  const attributes = {};
  const sandbox = {
    navigator: { userAgent, maxTouchPoints },
    document: { documentElement: { setAttribute: (key, value) => (attributes[key] = value) } },
  };
  vm.runInNewContext(script, sandbox, { timeout: 1000 });
  return attributes;
}

test("dist exists — run `npm run build` first", () => {
  assert.ok(existsSync(join(DIST, "index.html")), `no build at ${DIST}`);
});

for (const agent of USER_AGENTS) {
  test(`shipped probe: ${agent.name} -> ${agent.download}`, () => {
    const attributes = probe(page(""), agent.ua, agent.touch);
    assert.equal(attributes["data-download"], agent.download);
    assert.equal(attributes["data-os"], agent.install);
  });
}

test("the probe sits in the <head>, before the body is parsed", () => {
  const html = page("");
  const head = html.slice(0, html.indexOf("<body"));
  assert.match(head, /data-download/);
});

test("the hero offers one anchor per installer, each with its own file and label", () => {
  const hero = tags(page(""), "a", "data-download-for").filter((a) => !a.attributes.class.includes("site-nav__cta"));
  assert.deepEqual(hero.map((a) => a.attributes["data-download-for"]).sort(), [...IDS].sort());
  for (const anchor of hero) {
    const id = anchor.attributes["data-download-for"];
    assert.equal(anchor.attributes.href, HREF[id], id);
    assert.equal(anchor.text, installerLabelFor(id), id);
    assert.match(anchor.attributes.class, /rounded-full/, "the hero keeps its pill");
  }
});

test("the nav's Download button downloads too, on every page", () => {
  for (const route of PAGES) {
    const nav = tags(page(route), "a", "data-download-for").filter((a) => a.attributes.class.includes("site-nav__cta"));
    assert.deepEqual(nav.map((a) => a.attributes["data-download-for"]).sort(), [...IDS].sort(), `/${route}`);
    for (const anchor of nav) {
      assert.equal(anchor.attributes.href, HREF[anchor.attributes["data-download-for"]], `/${route}`);
      assert.equal(anchor.text, "Download", `/${route}: the nav keeps the bare word`);
    }
  }
});

test("exactly one anchor carries the no-script fallback, and it is the release page", () => {
  for (const route of PAGES) {
    const fallbacks = tags(page(route), "a", "data-download-for").filter((a) => "data-fallback" in a.attributes);
    for (const anchor of fallbacks) assert.equal(anchor.attributes.href, RELEASES, `/${route}`);
    const expected = route === "" ? 2 : 1; // hero + nav on the front page, nav elsewhere
    assert.equal(fallbacks.length, expected, `/${route}`);
  }
});

test("the CSS hides every anchor and reveals exactly the one for the probed machine", () => {
  const sheet = css(page("")).replace(/\s+/g, " ");
  assert.match(sheet, /\.download-cta\[data-astro-cid-[\w-]+\]\s*\{\s*display:\s*none/);
  // Astro puts its scoping attribute between the class and ours.
  const scope = String.raw`(?:\[data-astro-cid-[\w-]+\])?`;
  const reveal = (html, anchor) =>
    new RegExp(String.raw`html\[data-download="?${html}"?\] \.download-cta${scope}\[data-download-for="?${anchor}"?\]`);
  for (const id of IDS) {
    assert.match(sheet, reveal(id, id), `reveal rule for ${id}`);
    for (const other of IDS.filter((x) => x !== id)) {
      assert.doesNotMatch(sheet, reveal(id, other), `${id} must not reveal ${other}`);
    }
  }
  assert.match(sheet, new RegExp(String.raw`html:not\(\[data-download\]\) \.download-cta${scope}\[data-fallback\]`));
});

test("the note under the hero names the file and offers the other Mac build", () => {
  const lines = tags(page(""), "span", "data-download-for").filter((s) => s.attributes.class.includes("download-note__line"));
  assert.deepEqual(lines.map((s) => s.attributes["data-download-for"]).sort(), [...IDS].sort());
  const html = page("");
  for (const target of DOWNLOAD_TARGETS) assert.ok(html.includes(target.note), target.id);
  assert.match(html, /href="[^"]+PersonalJarvis-macOS-x64\.dmg"[^>]*>Intel Mac\?</);
  assert.match(html, /href="[^"]+PersonalJarvis-macOS-arm64\.dmg"[^>]*>Apple silicon\?</);
});

test("the command-line install is still on the page, below the buttons", () => {
  for (const route of ["", "clis", "plugins", "skills"].filter((r) => PAGES.includes(r))) {
    const html = page(route);
    assert.match(html, /id="install"/, `/${route}`);
    assert.ok(html.includes("install.ps1 | iex"), `/${route}: PowerShell line`);
    assert.ok(html.includes("install.sh | bash"), `/${route}: curl line`);
  }
  const html = page("");
  assert.ok(html.indexOf('data-download-for="windows"') < html.indexOf('id="install"'), "buttons first, commands below");
  assert.match(html, /href="#install"[^>]*>Install from the command line</);
});

test("no download anchor anywhere still points at a bare #install", () => {
  for (const route of PAGES) {
    for (const anchor of tags(page(route), "a", "data-download-for")) {
      assert.ok(anchor.attributes.href.startsWith("https://github.com/PersonalJarvis/PersonalJarvis/releases/latest"), `/${route}`);
    }
  }
  assert.ok(readdirSync(DIST).length > 0);
});
