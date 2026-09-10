#!/usr/bin/env node
/** Keep the static/no-JavaScript fallback current without a cross-repo token. */
import { readFileSync, writeFileSync } from "node:fs";
import { STARGAZER_FEED, isSnapshot } from "../src/lib/stargazerFeed.ts";

const response = await fetch(STARGAZER_FEED, {
  cache: "no-cache", signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Stargazer feed: HTTP ${response.status}. Check the app repository's Stargazer map workflow.`);
const next = await response.json();
if (!isSnapshot(next, "PersonalJarvis/PersonalJarvis")) throw new Error("Invalid stargazer feed; keeping the previous map.");
if (Date.now() - Date.parse(next.generatedAt) > 24 * 60 * 60 * 1000) {
  throw new Error("Stargazer feed is over a day old. Check the app repository's Stargazer map workflow.");
}
const path = new URL("../src/data/stargazers.json", import.meta.url);
const previous = JSON.parse(readFileSync(path, "utf8"));
if (Date.parse(next.generatedAt) > Date.parse(previous.generatedAt)) {
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n", "utf8");
}
console.log(`Stargazer fallback: ${next.count} stars, ${next.placed} resolved, ${next.clusters.length} places.`);
