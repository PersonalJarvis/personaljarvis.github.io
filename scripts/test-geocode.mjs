#!/usr/bin/env node
/**
 * Cases the geocoder has to get right, and cases it has to refuse.
 *
 * The first block is every location string our own stargazers actually had on
 * the day this was written — including the one that is a Radiohead song. The
 * rest are the shapes that break a naive matcher: a US state code that is also
 * a country code, a city that exists in four countries, a renamed city, an
 * emoji, a country written in its own language.
 *
 * Usage: node scripts/test-geocode.mjs
 * Exit:  0 all as expected, 1 otherwise
 */

import { geocode } from "./geocode.mjs";

/** [input, expected label, or null to require a refusal] */
const CASES = [
  // — real stargazers, verbatim ————————————————————————————
  ["Auckland, NZ", "Auckland"],
  ["Calgary, AB, Canada", "Calgary"],
  ["Rome, Italy", "Rome"],
  ["Paris, France", "Paris"],
  ["Munich", "Munich"],
  ["Brazil", "Brazil"],
  ["USA, Minnesota", "Minnesota"],
  ["Planet Telex", null],

  // — a US state code that is also a country code ————————————
  ["Boston, MA", "Boston"], // MA is Morocco
  ["Denver, CO", "Denver"], // CO is Colombia
  ["San Francisco, CA", "San Francisco"], // CA is Canada
  ["Portland, OR", "Portland"],
  ["Berlin, DE", "Berlin"], // DE really is Germany

  // — same name, several countries ——————————————————————————
  ["Cambridge, UK", "Cambridge"],
  ["Cambridge, MA", "Cambridge, MA"],
  ["London, Ontario", "London"],
  ["Vancouver, WA", "Vancouver"],

  // — nicknames and old names ————————————————————————————————
  ["SF", "San Francisco"],
  ["SF Bay Area", "San Francisco"],
  ["NYC", "New York"],
  ["Bangalore, India", "Bengaluru"],
  ["Bombay", "Mumbai"],
  ["Silicon Valley", "San Jose"],
  ["Mountain View, CA", "Mountain View"],

  // — written another way ————————————————————————————————————
  ["München, Deutschland", "München"],
  ["Zürich, Switzerland", "Zürich"],
  ["São Paulo, Brasil", "São Paulo"],
  ["Москва, Россия", "Moscow"],
  ["日本", "Japan"],
  ["Kraków, Polska", "Kraków"],

  // — decorated, or oddly punctuated ————————————————————————
  ["🇩🇪 Berlin", "Berlin"],
  ["Amsterdam / Netherlands", "Amsterdam"],
  ["Tokyo | Japan", "Tokyo"],
  ["  lisbon,  portugal  ", "Lisbon"],

  // — regions instead of cities ——————————————————————————————
  ["California, USA", "California"],
  // Natural Earth names German states in German, so the English form finds no
  // region and lands on the country. Coarse, not wrong.
  ["Bavaria, Germany", "Germany"],
  ["Bayern, Germany", "Bayern"],
  ["Scotland", "Scotland"],
  ["Europe", "Europe"],

  // — not places ——————————————————————————————————————————————
  ["Remote", null],
  ["earth", null],
  ["/dev/null", null],
  ["localhost", null],
  ["", null],
  ["   ", null],
  ["¯\\_(ツ)_/¯", null],
];

let failed = 0;
for (const [input, expected] of CASES) {
  const got = geocode(input);
  const label = got?.label ?? null;
  const ok = expected === null ? got === null : label === expected;
  if (!ok) {
    failed += 1;
    const where = got ? ` @ ${got.lat}, ${got.lon} (${got.kind})` : "";
    console.log(`FAIL  ${JSON.stringify(input)}\n      want ${expected}, got ${label}${where}`);
  }
}

const total = CASES.length;
console.log(`${total - failed}/${total} geocode cases as expected`);
process.exit(failed === 0 ? 0 : 1);
