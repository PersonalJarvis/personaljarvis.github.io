/** Anonymous, aggregate-only feed published by the repository receiving stars. */
export const STARGAZER_FEED =
  "https://raw.githubusercontent.com/PersonalJarvis/PersonalJarvis/stargazer-map/data/stargazers.json";

export interface Cluster {
  lat: number;
  lon: number;
  label: string;
  country: string;
  count: number;
}

export interface StargazerSnapshot {
  repo: string;
  count: number;
  forks: number;
  placed: number;
  stated: number;
  generatedAt: string;
  clusters: Cluster[];
}

/** Reject incomplete responses rather than replacing a good map with bad data. */
export function isSnapshot(value: unknown, repo: string): value is StargazerSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as StargazerSnapshot;
  const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (v.repo !== repo || ![v.count, v.forks, v.placed, v.stated].every(integer) ||
      v.placed > v.stated || v.stated > v.count ||
      typeof v.generatedAt !== "string" || !Number.isFinite(Date.parse(v.generatedAt)) ||
      Date.parse(v.generatedAt) > Date.now() + 300_000 || !Array.isArray(v.clusters)) return false;
  const keys = new Set<string>();
  for (const c of v.clusters) {
    if (!c || !Number.isFinite(c.lat) || Math.abs(c.lat) > 90 ||
        !Number.isFinite(c.lon) || Math.abs(c.lon) > 180 ||
        typeof c.label !== "string" || !c.label.trim() || typeof c.country !== "string" ||
        !integer(c.count) || c.count === 0) return false;
    const key = JSON.stringify([c.label, c.country]);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return v.clusters.reduce((sum, c) => sum + c.count, 0) === v.placed;
}

/** Shared by the globe and its caption; one request updates both atomically. */
export function createStargazerFeed(initial: StargazerSnapshot, fetcher: typeof fetch = fetch) {
  let current = initial;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    refresh(): Promise<void> {
      if (pending) return pending;
      pending = (async () => {
        try {
          const response = await fetcher(STARGAZER_FEED, {
            cache: "no-cache", credentials: "omit", signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) return;
          const next: unknown = await response.json();
          if (!isSnapshot(next, initial.repo) ||
              Date.parse(next.generatedAt) <= Date.parse(current.generatedAt)) return;
          // Keep the canvas effect alive when only the heartbeat timestamp changes.
          if (JSON.stringify(next.clusters) === JSON.stringify(current.clusters)) {
            next.clusters = current.clusters;
          }
          current = next;
          listeners.forEach((listener) => listener());
        } catch {
          // Offline, timed out, or malformed: preserve the last verified snapshot.
        }
      })().finally(() => { pending = undefined; });
      return pending;
    },
  };
}
