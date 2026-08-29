#!/usr/bin/env node
/**
 * Build into a private directory, then publish it without ever serving a
 * half-written page.
 *
 * `astro build` empties `dist/` and refills it over several seconds. Anything
 * serving that folder — `astro preview`, which is how this site is usually
 * looked at — hands out whatever is in it at that instant. Measured: for about
 * three seconds of every build, the page comes back with **no stylesheet link
 * at all**. That is not a subtle flash. Marks in the logo strip are SVGs
 * carrying only a `viewBox`, so with no CSS they fall back to the 300x150 CSS
 * default and all fifty-six paint at once across the whole page. It reads as a
 * catastrophic layout bug in the strip, which is where the reports come from,
 * and it is nothing of the sort.
 *
 * It matters more here than it would elsewhere: several agent sessions share
 * this checkout and build whenever they finish a step, so the window is opened
 * often, and two builds writing the same folder can interleave.
 *
 * **Why the contents are swapped rather than the directory.** Renaming `dist`
 * aside and the new build into place would be one move instead of many — but
 * on Windows a running `preview` holds the folder open and the rename fails
 * with EBUSY, every time, for as long as the server runs. Individual *files*
 * can be replaced under it, so that is what happens:
 *
 *   1. Everything except HTML is copied in. Assets carry content hashes, so a
 *      new build's files never collide with the ones being served.
 *   2. The HTML is replaced last, one atomic rename per file. Until that
 *      moment the old page is complete and its assets are all still present;
 *      after it, the new page's assets are already there.
 *   3. Files the new build no longer contains are pruned.
 *
 * At no point does a page reference something that is not on disk.
 *
 * Usage: node scripts/build-atomic.mjs [...astro build flags]
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DIST = join(ROOT, "dist");

/**
 * Astro's own entry point, read from its manifest rather than hardcoded — the
 * path has moved between majors, and a wrong guess fails as "cannot find
 * module" long after the build looks like it started.
 */
const require = createRequire(import.meta.url);
const astroManifest = require.resolve("astro/package.json", { paths: [ROOT] });
const astroPkg = require(astroManifest);
const astroBin = join(
  astroManifest,
  "..",
  typeof astroPkg.bin === "string" ? astroPkg.bin : astroPkg.bin.astro,
);

/** Every file under `dir`, as paths relative to it. */
function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

/**
 * Retry a filesystem move that Windows refuses while a server is mid-response.
 * A static server holds a file only for the length of one request, so the
 * block clears on its own within milliseconds.
 */
function withRetry(action, attempts = 40) {
  for (let i = 0; ; i++) {
    try {
      return action();
    } catch (error) {
      const busy = ["EPERM", "EBUSY", "EACCES"].includes(error.code);
      if (!busy || i >= attempts) throw error;
      const until = Date.now() + 25;
      while (Date.now() < until);
    }
  }
}

const isHtml = (file) => file.toLowerCase().endsWith(".html");

// Taken before the build so the prune below can tell this build's output
// from a parallel session's, which is newer.
const startedAt = Date.now();

const staging = mkdtempSync(join(ROOT, ".dist-build-"));
const cleanup = () => {
  if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
};

try {
  const result = spawnSync(
    process.execPath,
    [astroBin, "build", "--outDir", staging, ...process.argv.slice(2)],
    { stdio: "inherit", cwd: ROOT },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    // The build failed, so what is being served is still the last good build.
    cleanup();
    process.exit(result.status ?? 1);
  }

  const built = walk(staging);
  mkdirSync(DIST, { recursive: true });

  // 1 — assets first. Hashed names mean these are additions, not replacements.
  for (const file of built.filter((f) => !isHtml(f))) {
    const to = join(DIST, file);
    mkdirSync(dirname(to), { recursive: true });
    withRetry(() => copyFileSync(join(staging, file), to));
  }

  // 2 — then the pages, each one swapped in a single move. Copying to a
  // neighbouring temp name first keeps the rename within the same volume,
  // which is what makes it atomic.
  for (const file of built.filter(isHtml)) {
    const to = join(DIST, file);
    const via = `${to}.incoming-${process.pid}`;
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(staging, file), via);
    withRetry(() => renameSync(via, to));
  }

  // 3 — drop what this build no longer produces, now that nothing points at it.
  //
  // Only files older than this build are eligible. Several sessions share this
  // checkout and build at once, and without the age test the first one to
  // finish deletes the assets the other has just published — leaving that
  // build's freshly swapped-in HTML pointing at a 404, which is the exact
  // failure this script exists to prevent.
  const keep = new Set(built);
  for (const file of walk(DIST)) {
    if (keep.has(file)) continue;
    const path = join(DIST, file);
    try {
      if (statSync(path).mtimeMs >= startedAt) continue;
      rmSync(path, { force: true });
    } catch {
      // A stale asset that will not delete is harmless: it is unreferenced and
      // the next build tries again. Failing the build over it would be worse.
    }
  }

  cleanup();
} catch (error) {
  cleanup();
  console.error(`\nbuild-atomic: ${error.message}`);
  process.exit(1);
}
