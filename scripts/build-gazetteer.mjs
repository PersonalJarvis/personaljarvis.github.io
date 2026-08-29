#!/usr/bin/env node
/**
 * Build the place lookup the stargazer fetch geocodes against.
 *
 * A GitHub profile's location is one free-text line the person typed
 * themselves. Real examples off our own stargazers, unedited:
 *
 *     "Auckland, NZ"   "Calgary, AB, Canada"   "Munich"
 *     "USA, Minnesota" "Brazil"                "Planet Telex"
 *
 * City, city with a country, country alone, country-then-region, and a
 * Radiohead song. Nothing about it is a format. So the lookup has to be a
 * gazetteer — a list of every name a place goes by — and the matcher has to
 * be allowed to fail, because the last one is not a place and never will be.
 *
 * Sources, both Natural Earth, both public domain, downloaded on first run and
 * ignored by git thereafter:
 *   - ne_10m_populated_places_simple.geojson — 7 342 cities with population
 *   - ne_110m_admin_0_countries.geojson      — 177 countries, with the
 *     cartographer's own label point and the country's name in 25 languages
 *
 * Only the OUTPUT is committed. The site build reads `gazetteer.json` and never
 * runs this script, so the network is needed once, by whoever refreshes the
 * data — not by a build, and not by CI.
 *
 * This file, its sources and its output are BUILD-ONLY. None of it reaches the
 * browser — what ships is the handful of clusters the fetch produces.
 *
 * Usage:  node scripts/build-gazetteer.mjs
 * Writes: scripts/gazetteer.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { normalise } from "./geocode.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "gazetteer.json");

const NE_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";

/**
 * The two sources are 5.8 MB together and are read exactly once, by this
 * script, to produce a file a fifth their size. Committing them would put six
 * megabytes of reference data in a marketing site's history for the sake of a
 * command nobody runs twice a year, so they are downloaded on demand and
 * ignored by git. Only the output is committed.
 */
async function source(name) {
  const path = join(ROOT, "scripts", `${name}.geojson`);
  if (!existsSync(path)) {
    console.log(`fetching ${name} …`);
    const res = await fetch(NE_BASE + name + ".geojson");
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Country name fields worth keeping as aliases.
 *
 * The multilingual ones are not decoration: someone in Munich is as likely to
 * write "Deutschland" as "Germany", and someone in Moscow may well write
 * "Россия". Matching is done on a normalised string, so a name in any script
 * costs one array entry and works.
 */
const COUNTRY_NAME_FIELDS = [
  "NAME", "NAME_LONG", "NAME_EN", "NAME_CIAWF", "NAME_SORT", "FORMAL_EN",
  "ABBREV", "POSTAL", "ISO_A2", "ISO_A3", "ADM0_A3", "BRK_NAME", "ADMIN",
  "NAME_AR", "NAME_BN", "NAME_DE", "NAME_ES", "NAME_FA", "NAME_FR", "NAME_EL",
  "NAME_HE", "NAME_HI", "NAME_HU", "NAME_ID", "NAME_IT", "NAME_JA", "NAME_KO",
  "NAME_NL", "NAME_PL", "NAME_PT", "NAME_RU", "NAME_SV", "NAME_TR", "NAME_UK",
  "NAME_UR", "NAME_VI", "NAME_ZH", "NAME_ZHT",
];

/**
 * Countries whose dataset name is the formal one and reads as such in a
 * tooltip beside a city. Two entries, deliberately: every other long name in
 * the set — "Bosnia and Herzegovina", "Democratic Republic of the Congo" — IS
 * the short name, and shortening those would be inventing one.
 */
const DISPLAY_NAME = {
  USA: "United States",
  CHN: "China",
};

/** Two-letter codes that are words in their own right, and would swallow them. */
const CODE_BLOCKLIST = new Set(["in", "is", "it", "me", "no", "so", "at", "be", "by", "do", "id", "la", "ml", "mt", "my", "ne", "om", "pa", "re", "sh", "st", "to", "va"]);

function addAlias(set, value) {
  const n = normalise(value);
  if (!n || n.length < 2) return;
  if (n.length === 2 && CODE_BLOCKLIST.has(n)) return;
  set.add(n);
}

async function main() {
  const countriesGeo = await source("ne_110m_admin_0_countries");
  const citiesGeo = await source("ne_10m_populated_places_simple");

  const countries = [];
  const byA3 = new Map();

  for (const f of countriesGeo.features) {
    const p = f.properties;
    // LABEL_X/Y is where Natural Earth's own cartographers put the country's
    // name on a map. It beats a computed centroid, which for Norway lands in
    // the sea and for the United States lands in Kansas by way of Alaska.
    const lon = Number(p.LABEL_X);
    const lat = Number(p.LABEL_Y);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const aliases = new Set();
    for (const field of COUNTRY_NAME_FIELDS) addAlias(aliases, p[field]);
    for (const alt of String(p.NAME_ALT ?? "").split("|")) addAlias(aliases, alt);

    // Positional, not named. 7 342 city objects carry 7 342 copies of every
    // key name, which came to more bytes than the data itself — the file was
    // 1 023 KB with keys and 545 KB without. The column order is documented on
    // the reader in geocode.mjs and nowhere else needs to know it.
    const entry = [
      DISPLAY_NAME[p.ADM0_A3] || p.NAME_EN || p.NAME,
      p.ADM0_A3,
      Number(lat.toFixed(3)),
      Number(lon.toFixed(3)),
      [...aliases].sort(),
    ];
    countries.push(entry);
    byA3.set(entry[1], entry);
  }

  const cities = [];
  for (const f of citiesGeo.features) {
    const p = f.properties;
    const names = new Set();
    addAlias(names, p.nameascii);
    addAlias(names, p.name);
    for (const alt of String(p.namealt ?? "").split("|")) addAlias(names, alt);
    if (names.size === 0) continue;

    cities.push([
      // The display label keeps its diacritics; only the match keys lose them.
      p.name || p.nameascii,
      p.adm0_a3,
      p.adm1name || "",
      Number(Number(p.latitude).toFixed(3)),
      Number(Number(p.longitude).toFixed(3)),
      // Population is the tie-breaker for a bare "Cambridge" or "Springfield".
      Number(p.pop_max) || 0,
      [...names].sort(),
    ]);
  }

  // Biggest first: the matcher takes the first hit, and for an ambiguous bare
  // city name the bigger one is the better guess by a wide margin.
  cities.sort((a, b) => b[5] - a[5]);

  const out = {
    generatedAt: new Date().toISOString(),
    countryColumns: "name,a3,lat,lon,aliases",
    cityColumns: "label,a3,adm1,lat,lon,pop,names",
    countries,
    cities,
  };
  const json = JSON.stringify(out);
  writeFileSync(OUT, json, "utf8");
  console.log(
    `gazetteer: ${countries.length} countries, ${cities.length} cities -> scripts/gazetteer.json (${(json.length / 1024).toFixed(0)} KB, build-only)`,
  );
}

await main();
