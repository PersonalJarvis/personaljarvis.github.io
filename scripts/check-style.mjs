#!/usr/bin/env node
/**
 * Style gate — makes docs/layout.md and docs/design.md enforceable.
 *
 * A rule that lives only in a document is a rule the next person in a hurry
 * breaks, agent or human. These checks are the ones that can be decided
 * mechanically; the rest of both documents still needs a reader.
 *
 * Escape hatch: put `layout-allow: <reason>` in a comment on the same line.
 * A reason is required — a bare allow is itself an error, because "why" is the
 * only thing that makes an exception reviewable.
 *
 * Usage:  node scripts/check-style.mjs [--quiet]
 * Exit:   0 clean, 1 violations found, 2 the gate itself broke
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_DIRS = ["src", "app", "pages", "styles", "components"];
const SCAN_EXT = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".astro", ".svelte", ".vue", ".html"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".astro", ".next", "coverage"]);

/** Files allowed to name a raw width — the single source of truth. */
const WIDTH_OWNERS = [
  join("src", "lib", "widths.ts"),
  join("src", "components", "Container.tsx"),
  join("src", "components", "Container.astro"),
  join("src", "styles", "layout.css"),
];

/** Files allowed to name a raw colour. */
const TOKEN_OWNERS = [join("src", "styles", "tokens.css")];

/** Where a bespoke `max-w-*` is a layout violation rather than a UI primitive. */
const SECTION_DIRS = [join("src", "sections"), join("src", "pages"), join("src", "app")];

const rules = [
  {
    id: "vw-width",
    re: /(?:(?:max-)?(?:width|inline-size)\s*:\s*[^;{}]*\b\d+(?:\.\d+)?vw)|(?:\b(?:max-)?w-\[[^\]]*\d+(?:\.\d+)?vw[^\]]*\])/i,
    msg: "viewport-relative content width — use one of the three steps (prose/content/full)",
    doc: "layout.md",
  },
  {
    id: "percent-width",
    re: /max-(?:width|inline-size)\s*:\s*(?!100%)\d+(?:\.\d+)?%/i,
    msg: "percentage max-width — content width comes from the container, not a percentage",
    doc: "layout.md",
  },
  {
    id: "vh-height",
    re: /\b(?:min-|max-)?(?:height|block-size)\s*:\s*[^;{}]*\b\d+(?:\.\d+)?vh\b|\bh-\[[^\]]*\d+(?:\.\d+)?vh[^\]]*\]|\bh-screen\b/i,
    msg: "vh unit — use svh (or .section-full-height); vh jumps as the iOS address bar collapses",
    doc: "layout.md",
  },
  {
    id: "section-max-width",
    re: /\bmax-w-(?!none\b|full\b)[a-z0-9[\]./-]+/i,
    msg: "bespoke max-width on a section — wrap it in <Container width=...> instead",
    doc: "layout.md",
    only: SECTION_DIRS,
  },
  {
    id: "no-shadow",
    // Depth in this system is hairlines and ink-on-cream. A shadow flattens it
    // into a generic SaaS page.
    re: /(?:box-shadow|text-shadow)\s*:\s*(?!none\b)[^;{}]+|\bdrop-shadow(?:-[a-z0-9[\]./-]+)?\b|\bshadow-(?!none\b)[a-z0-9[\]./-]+/i,
    msg: "shadow — this system has hairline-only depth, no elevation tiers",
    doc: "design.md",
  },
  {
    id: "inline-hex",
    // Tokens exist so a colour can be changed once. An inline hex is a colour
    // nobody can find later.
    re: /#[0-9a-f]{3}(?:[0-9a-f]{3}(?:[0-9a-f]{2})?)?\b(?![^(]*\))/i,
    msg: "inline hex colour — use a token from tokens.css, or add one",
    doc: "design.md",
    skipOwners: TOKEN_OWNERS,
  },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(name.slice(name.lastIndexOf(".")).toLowerCase())) out.push(p);
  }
  return out;
}

function main() {
  const quiet = process.argv.includes("--quiet");
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  const violations = [];
  let scanned = 0;

  for (const file of files) {
    const rel = relative(ROOT, file);
    scanned += 1;
    const isWidthOwner = WIDTH_OWNERS.includes(rel);

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const allow = /layout-allow\s*:\s*(\S.*?)(?:\s*\*\/|\s*-->|\s*}\s*$|$)/.exec(line);
      if (allow) {
        if (!allow[1].trim()) {
          violations.push({ rel, line: i + 1, id: "bare-allow", doc: "-", msg: "layout-allow needs a reason", text: line.trim() });
        }
        return; // an explained exception is the author's call to make
      }
      for (const rule of rules) {
        if (rule.only && !rule.only.some((d) => rel.startsWith(d + sep))) continue;
        if (rule.skipOwners?.includes(rel)) continue;
        if (rule.doc === "layout.md" && isWidthOwner) continue;
        if (rule.re.test(line)) {
          violations.push({ rel, line: i + 1, id: rule.id, doc: rule.doc, msg: rule.msg, text: line.trim() });
        }
      }
    });
  }

  if (violations.length === 0) {
    if (!quiet) console.log(`style gate: OK - ${scanned} files, no violations.`);
    return 0;
  }

  console.error(`style gate: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    const text = v.text.length > 110 ? v.text.slice(0, 107) + "..." : v.text;
    console.error(`  ${v.rel}:${v.line}  [${v.id}]  ${v.msg}`);
    console.error(`      ${text}`);
    console.error(`      see docs/${v.doc}\n`);
  }
  console.error("If an exception is genuinely right, mark the line:  layout-allow: <why>");
  return 1;
}

try {
  process.exit(main());
} catch (err) {
  console.error("style gate failed to run:", err?.message ?? err);
  process.exit(2);
}
