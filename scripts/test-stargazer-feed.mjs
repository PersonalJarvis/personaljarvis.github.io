import assert from "node:assert/strict";
import { test } from "node:test";
import { createStargazerFeed, isSnapshot, STARGAZER_FEED } from "../src/lib/stargazerFeed.ts";

const place = { lat: 52.52, lon: 13.405, label: "Berlin", country: "Germany", count: 1 };
const initial = {
  repo: "PersonalJarvis/PersonalJarvis", count: 2, forks: 0, placed: 1, stated: 1,
  generatedAt: "2026-09-01T10:00:00Z", clusters: [place],
};
const newer = (changes = {}) => ({ ...initial, generatedAt: "2026-09-01T11:00:00Z", ...changes });
const response = (body) => new Response(JSON.stringify(body));

test("new located stars update markers and caption together without credentials", async () => {
  const next = newer({ count: 3, placed: 2, stated: 2, clusters: [place,
    { ...place, lat: 48.85, lon: 2.35, label: "Paris", country: "France" }] });
  const feed = createStargazerFeed(initial, async (url, options) => {
    assert.equal(url, STARGAZER_FEED);
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers, undefined);
    return response(next);
  });
  let notified = 0;
  const unsubscribe = feed.subscribe(() => { notified += 1; });
  await feed.refresh();
  assert.deepEqual(feed.getSnapshot(), next);
  assert.equal(notified, 1);
  unsubscribe();
});

test("profile edits refresh even when total stars stay unchanged", async () => {
  const next = newer({ clusters: [{ ...place, label: "Munich", lat: 48.13, lon: 11.57 }] });
  const feed = createStargazerFeed(initial, async () => response(next));
  await feed.refresh();
  assert.equal(feed.getSnapshot().clusters[0].label, "Munich");
});

test("unstars and removed locations remove markers, including the last", async () => {
  const next = newer({ count: 1, placed: 0, stated: 0, clusters: [] });
  const feed = createStargazerFeed(initial, async () => response(next));
  await feed.refresh();
  assert.deepEqual(feed.getSnapshot().clusters, []);
});

test("stars without locations do not invent markers or restart the canvas", async () => {
  const feed = createStargazerFeed(initial, async () => response(newer({ count: 3 })));
  await feed.refresh();
  assert.equal(feed.getSnapshot().count, 3);
  assert.equal(feed.getSnapshot().clusters, initial.clusters);
});

test("concurrent islands share one in-flight request", async () => {
  let resolve;
  let calls = 0;
  const feed = createStargazerFeed(initial, () => {
    calls += 1;
    return new Promise((done) => { resolve = done; });
  });
  const first = feed.refresh();
  const second = feed.refresh();
  assert.equal(first, second);
  resolve(response(newer()));
  await Promise.all([first, second]);
  assert.equal(calls, 1);
});

test("failures and stale CDN data preserve the map and permit recovery", async () => {
  const replies = [
    () => { throw new Error("offline"); },
    () => new Response("unavailable", { status: 503 }),
    () => new Response("not JSON"),
    () => response(newer({ placed: 100 })),
    () => response({ ...initial, generatedAt: "2026-08-01T00:00:00Z" }),
    () => response(newer()),
  ];
  const feed = createStargazerFeed(initial, async () => replies.shift()());
  for (let i = 0; i < 5; i += 1) {
    await feed.refresh();
    assert.equal(feed.getSnapshot(), initial);
  }
  await feed.refresh();
  assert.equal(feed.getSnapshot().generatedAt, newer().generatedAt);
});

test("reject invalid coordinates, totals, duplicate places, repos and timestamps", () => {
  assert.equal(isSnapshot(initial, initial.repo), true);
  for (const bad of [null, {}, { ...initial, repo: "other/repo" },
    { ...initial, generatedAt: "bad date" }, { ...initial, stated: 3 },
    { ...initial, count: -1 }, { ...initial, clusters: [{ ...place, lat: 91 }] },
    { ...initial, clusters: [{ ...place, lon: -181 }] },
    { ...initial, clusters: [{ ...place, count: 0 }] },
    { ...initial, clusters: [place, place], placed: 2, stated: 2 }]) {
    assert.equal(isSnapshot(bad, initial.repo), false, JSON.stringify(bad));
  }
});
