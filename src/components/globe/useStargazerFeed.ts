import { useEffect, useSyncExternalStore } from "react";
import initial from "@/data/stargazers.json";
import { createStargazerFeed } from "@/lib/stargazerFeed";

const feed = createStargazerFeed(initial);
let consumers = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function schedule() {
  // Jitter and one shared poller avoid a burst when multiple islands hydrate.
  timer = setInterval(async () => {
    if (!document.hidden) await feed.refresh();
  }, 60_000 + Math.random() * 15_000);
}

export function useStargazerFeed() {
  const snapshot = useSyncExternalStore(feed.subscribe, feed.getSnapshot, () => initial);
  useEffect(() => {
    consumers += 1;
    if (consumers === 1) {
      void feed.refresh();
      schedule();
    }
    return () => {
      consumers -= 1;
      if (!consumers) clearInterval(timer);
    };
  }, []);
  return snapshot;
}
