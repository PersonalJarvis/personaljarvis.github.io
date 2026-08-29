#!/usr/bin/env node
/**
 * Where the people who starred Personal Jarvis are, as points on a globe.
 *
 * ## Why this runs at build time and not in the browser
 *
 * The star COUNT is public and anonymous: one unauthenticated request, which
 * the page makes for itself so the number is live to the minute.
 *
 * Where those people ARE is a different question. The REST API gives you a
 * list of logins and nothing else, so a location costs one more request per
 * person — 60 an hour is the anonymous ceiling, and a page that spends it on
 * the first visitor leaves the second one staring at an error. GraphQL hands
 * back login and location together, 100 people to a request, but it refuses to
 * answer without a token, and a token in a static page is a token anyone can
 * read out of the bundle.
 *
 * So the map is drawn here, where a token is safe, and the result is committed.
 * A scheduled workflow re-runs it and the site rebuilds; see
 * `.github/workflows/stargazers.yml`.
 *
 * ## What ships
 *
 * Counts per place. No logins, no profile URLs, no dates, nothing that names a
 * person. "Three people in Berlin" is the whole claim the section makes, and
 * it is the whole thing this file writes. People star a repository; they do
 * not agree to be pinned to a map by name.
 *
 * Usage:  node scripts/fetch-stargazers.mjs [--repo owner/name]
 * Auth:   $GITHUB_TOKEN, $GH_TOKEN, or a signed-in `gh` CLI
 * Writes: src/data/stargazers.json
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { geocode } from "./geocode.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "stargazers.json");

const DEFAULT_REPO = "PersonalJarvis/PersonalJarvis";
const PAGE = 100;

function repoArg() {
  const i = process.argv.indexOf("--repo");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : DEFAULT_REPO;
}

function token() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    // Locally there is usually a signed-in gh; in CI there is always a
    // GITHUB_TOKEN. Between them nobody has to paste a secret anywhere.
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error(
      "no GitHub token: set GITHUB_TOKEN, or sign in with `gh auth login`",
    );
  }
}

const QUERY = `
query($owner:String!, $name:String!, $after:String) {
  repository(owner:$owner, name:$name) {
    stargazerCount
    forkCount
    stargazers(first:${PAGE}, after:$after, orderBy:{field:STARRED_AT, direction:ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes { location }
    }
  }
}`;

async function graphql(auth, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${auth}`,
      "content-type": "application/json",
      "user-agent": "personal-jarvis-website-build",
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL: HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(`GitHub GraphQL: ${body.errors[0].message}`);
  return body.data.repository;
}

async function main() {
  const repo = repoArg();
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`--repo wants owner/name, got "${repo}"`);

  const auth = token();
  const locations = [];
  let after = null;
  let count = 0;
  let forks = 0;
  let requests = 0;

  for (;;) {
    const data = await graphql(auth, { owner, name, after });
    requests += 1;
    count = data.stargazerCount;
    forks = data.forkCount;
    for (const node of data.stargazers.nodes) {
      if (node.location) locations.push(node.location);
    }
    if (!data.stargazers.pageInfo.hasNextPage) break;
    after = data.stargazers.pageInfo.endCursor;
  }

  // One cluster per resolved place, so "SF", "San Francisco, CA" and
  // "san francisco" arrive as one marker of three rather than three markers
  // sitting on top of each other.
  const clusters = new Map();
  const rejected = [];

  for (const raw of locations) {
    const hit = geocode(raw);
    if (!hit) {
      rejected.push(raw);
      continue;
    }
    const key = `${hit.label}|${hit.country}`;
    const existing = clusters.get(key);
    if (existing) existing.count += 1;
    else clusters.set(key, { ...hit, count: 1 });
  }

  const list = [...clusters.values()]
    .map(({ lat, lon, label, country, count: n }) => ({
      lat,
      lon,
      label,
      country,
      count: n,
    }))
    // Biggest first, so the globe can draw the small ones on top of the large
    // ones rather than under them.
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const previous = readPrevious();
  const out = {
    repo,
    count,
    forks,
    // Everyone whose location resolved, which is what the markers add up to.
    // Named plainly so the section can say "8 of 31" instead of implying the
    // globe shows all of them.
    placed: list.reduce((s, c) => s + c.count, 0),
    stated: locations.length,
    generatedAt: new Date().toISOString(),
    clusters: list,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");

  const delta = previous ? count - previous.count : null;
  console.log(
    [
      `stargazers: ${count} stars${delta === null ? "" : delta === 0 ? " (unchanged)" : ` (${delta > 0 ? "+" : ""}${delta})`}, ${forks} forks`,
      `            ${locations.length} gave a location, ${out.placed} of those resolved, ${list.length} places`,
      `            ${requests} GraphQL request${requests === 1 ? "" : "s"} -> src/data/stargazers.json`,
    ].join("\n"),
  );
  if (rejected.length) {
    console.log(`            unresolved: ${rejected.map((r) => JSON.stringify(r)).join(", ")}`);
  }
}

function readPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return null;
  }
}

await main();
