#!/usr/bin/env node
/**
 * Rasterise the world's coastlines into the dot grid the globe draws.
 *
 * The globe is a lat/lon grid of squares, and every square needs one bit:
 * land or water. That bit could be decided in the browser from a coastline
 * file, but a 138 KB polygon set plus a point-in-polygon pass per cell is a
 * lot of work to repeat on every visit for an answer that never changes. So
 * it is decided once, here, and the result ships as a bitmask.
 *
 * Size, for the record: 360 x 180 cells is 64 800 bits — 8 100 bytes, about
 * 11 KB once base64 has had its way with it. The coastline file it replaces
 * is twelve times that, before the maths.
 *
 * Source: Natural Earth 1:110m land (`scripts/ne_110m_land.geojson`), public
 * domain. Committed rather than fetched, so a build never needs the network.
 * To refresh it, re-download from
 * https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
 * and run this script again.
 *
 * Usage:  node scripts/build-land-mask.mjs
 * Writes: src/data/land-mask.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SOURCE = join(ROOT, "scripts", "ne_110m_land.geojson");
const OUT = join(ROOT, "src", "data", "land-mask.ts");

/**
 * One cell per degree.
 *
 * The globe is drawn at roughly 600 px across, so 180 rows land about three
 * pixels apart — a grid the eye reads as a grid, which is the whole effect.
 * Going finer costs bytes and stops reading as pixel art; going coarser loses
 * Britain.
 */
const LON_CELLS = 360;
const LAT_CELLS = 180;

/**
 * Ray casting, the standard even-odd test.
 *
 * A ring is a closed loop of [lon, lat] pairs. Cast a ray east from the point
 * and count the edges it crosses: odd means inside. The `(yi > y) !== (yj > y)`
 * form is what keeps a vertex landing exactly on the ray from being counted
 * twice — the classic failure that puts a hole in the middle of Africa.
 */
function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** A polygon is an outer ring followed by any number of holes. */
function inPolygon(rings, x, y) {
  if (!inRing(rings[0], x, y)) return false;
  for (let i = 1; i < rings.length; i++) {
    if (inRing(rings[i], x, y)) return false; // a lake inside a landmass
  }
  return true;
}

function bboxOf(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function main() {
  const geo = JSON.parse(readFileSync(SOURCE, "utf8"));

  // Flatten every feature to a list of polygons, each with its bounding box.
  // The box is the whole optimisation: 64 800 cells against 127 polygons is
  // eight million ring walks without it, and a few thousand with.
  const polygons = [];
  for (const feature of geo.features) {
    const g = feature.geometry;
    if (!g) continue;
    const parts =
      g.type === "Polygon"
        ? [g.coordinates]
        : g.type === "MultiPolygon"
          ? g.coordinates
          : [];
    for (const rings of parts) {
      polygons.push({ rings, box: bboxOf(rings[0]) });
    }
  }

  const bits = new Uint8Array(Math.ceil((LON_CELLS * LAT_CELLS) / 8));
  let land = 0;

  for (let row = 0; row < LAT_CELLS; row++) {
    // Cell centres, not corners: a corner at exactly -180 or 90 sits on the
    // seam of the data and tests inconsistently.
    const lat = 90 - (row + 0.5) * (180 / LAT_CELLS);
    const candidates = polygons.filter(
      (p) => lat >= p.box.minY && lat <= p.box.maxY,
    );
    if (candidates.length === 0) continue;

    for (let col = 0; col < LON_CELLS; col++) {
      const lon = -180 + (col + 0.5) * (360 / LON_CELLS);
      let hit = false;
      for (const p of candidates) {
        if (lon < p.box.minX || lon > p.box.maxX) continue;
        if (inPolygon(p.rings, lon, lat)) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      const index = row * LON_CELLS + col;
      bits[index >> 3] |= 1 << (index & 7);
      land += 1;
    }
  }

  const base64 = Buffer.from(bits).toString("base64");
  const share = ((land / (LON_CELLS * LAT_CELLS)) * 100).toFixed(1);

  const file = `/**
 * Land or water, one bit per grid cell. GENERATED — do not edit.
 *
 * Written by \`scripts/build-land-mask.mjs\` from Natural Earth 1:110m land
 * (public domain). ${LON_CELLS} x ${LAT_CELLS} cells, ${land} of them land (${share}%).
 *
 * Row 0 is the northernmost band, column 0 the westernmost. A cell's centre
 * is at lat \`90 - (row + 0.5)\`, lon \`-180 + (col + 0.5)\`.
 */

export const LAND_LON_CELLS = ${LON_CELLS};
export const LAND_LAT_CELLS = ${LAT_CELLS};

/** The bitmask, base64'd. Bit \`row * LON_CELLS + col\`, little end first. */
export const LAND_MASK_BASE64 =
  "${base64}";
`;

  writeFileSync(OUT, file, "utf8");
  console.log(
    `land-mask: ${land}/${LON_CELLS * LAT_CELLS} cells land (${share}%), ${base64.length} base64 chars -> src/data/land-mask.ts`,
  );
}

main();
