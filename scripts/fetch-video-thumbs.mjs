#!/usr/bin/env node
/**
 * Fetches the YouTube poster frames the "Built in public" section shows, and
 * writes them into public/video-thumbs/ in the two sizes that section uses.
 *
 * WHY THIS SCRIPT EXISTS AT ALL:
 *
 * The section never loads a thumbnail from i.ytimg.com at runtime. A remote
 * poster frame is a request to Google carrying the visitor's IP address, sent
 * before they clicked anything — which is the exact thing the facade pattern
 * is there to prevent. So the images are fetched ONCE, here, and committed.
 *
 * Re-run it when a video is added, replaced or re-thumbnailed:
 *
 *   node scripts/fetch-video-thumbs.mjs
 *
 * TWO SIZES, because one file cannot serve both slots without waste:
 *
 *   {ID}.jpg     1280x720 - the featured player, which renders ~870px wide
 *   {ID}-sm.jpg   320x180 - the playlist rail, which renders ~150px wide
 *
 * Handing the rail the 1280px file would ship roughly ten times the bytes it
 * can show. Both are re-encoded rather than stored as downloaded: YouTube's
 * own JPEGs carry metadata and a quality level tuned for its player, not for a
 * page that has a Lighthouse budget to keep.
 *
 * Quality ladder: maxres does not exist for every upload (it needs a source
 * above 720p), so the fetch falls back through sd to hq rather than failing.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "public", "video-thumbs");

/** Kept in step with VIDEOS in src/sections/BuiltInPublic.astro. */
const IDS = ["3nV-3ygIJ0I", "BBcwq0jn7_E", "0ZrUVxfKFME", "M5PbmWV8OQc"];

/** Best first. `maxres` is absent on uploads sourced below 720p. */
const QUALITIES = ["maxresdefault", "sddefault", "hqdefault"];

async function fetchPoster(id) {
  for (const quality of QUALITIES) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${quality}.jpg`);
    if (res.ok) return { buffer: Buffer.from(await res.arrayBuffer()), quality };
  }
  throw new Error(`no poster frame available for ${id}`);
}

await mkdir(OUT, { recursive: true });

for (const id of IDS) {
  const { buffer, quality } = await fetchPoster(id);

  // `cover` rather than `contain`: hq/sd frames are 4:3 with black bars baked
  // in, and a letterboxed poster inside a 16:9 card reads as a broken image.
  const large = await sharp(buffer)
    .resize(1280, 720, { fit: "cover" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const small = await sharp(buffer)
    .resize(320, 180, { fit: "cover" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  await writeFile(join(OUT, `${id}.jpg`), large);
  await writeFile(join(OUT, `${id}-sm.jpg`), small);

  const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
  console.log(`${id}  ${quality}  ${kb(large.length)} + ${kb(small.length)}`);
}
