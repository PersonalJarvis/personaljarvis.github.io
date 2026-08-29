/**
 * The demo container — the only part of this folder that knows about time,
 * pointers and the size of the box it is in.
 *
 * It owns three things and nothing else:
 *
 *  1. the scale, from a ResizeObserver on the stage
 *  2. the frame script, and the take-over that stops it for good
 *  3. the register the counts are computed from
 *
 * PluginsView stays pure. See docs/feature-section.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_DEMO_PLUGINS,
  CATALOG_SIZE,
  DEMO_DESCRIPTION,
  FRAMES,
  type DemoPlugin,
  type FilterId,
} from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PluginsView } from "./PluginsView";
import {
  DemoStage,
  SEARCH_TYPE_MS,
  useFrameScript,
  usePrefersReducedMotion,
  useTypewriter,
} from "@/components/window-demo/Stage";
import "./plugins-demo.css";

type Register = Record<string, DemoPlugin>;

const BASE_REGISTER: Register = Object.fromEntries(
  ALL_DEMO_PLUGINS.map((plugin) => [plugin.id, plugin]),
);

/** The register a frame implies: the opening state, with that frame's rows
 *  written over it. */
function registerFor(frameIndex: number): Register {
  const frame = FRAMES[frameIndex];
  const next: Register = { ...BASE_REGISTER };
  for (const plugin of frame.plugins) next[plugin.id] = plugin;
  return next;
}

function countsFrom(register: Register) {
  const all = Object.values(register);
  const connected = all.filter((p) => p.status === "connected").length;
  const attention = all.filter((p) => p.status === "needs_reauth").length;
  return {
    // The real catalog's size, not the number of rows on screen — the demo
    // must not imply the app ships five plugins.
    total: CATALOG_SIZE,
    connected,
    attention,
    installed: connected + attention,
  };
}

const DURATIONS = FRAMES.map((f) => f.duration);

export function PluginsDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const {
    index: scriptIndex,
    tookOver: userTookOver,
    takeOver: stopScript,
  } = useFrameScript(DURATIONS, reducedMotion);

  /** Their state after take-over. Null while the script is still driving. */
  const [ownRegister, setOwnRegister] = useState<Register | null>(null);
  const [ownFilter, setOwnFilter] = useState<FilterId>("all");
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  /* The search box is typed, and the rest of the window waits for the last
     character.

     A catalog that narrows before the word that narrowed it is on screen reads
     as a recording rather than as a search — and "3 matches" over a list of
     twenty-four is simply wrong. So while the word is going in, the window is
     still showing the frame before it; only the search box has moved on. The
     frame before it is the previous index, and that is safe here because the
     one frame that types is never the first: a script that loops back to a
     frame with an empty query does no typing at all. */
  const query = userTookOver ? "" : FRAMES[scriptIndex].query;
  const typed = useTypewriter(
    query,
    query.length > 0,
    reducedMotion,
    SEARCH_TYPE_MS,
  );
  const typing = typed < query.length;
  const frameIndex = typing ? Math.max(0, scriptIndex - 1) : scriptIndex;

  const frame = FRAMES[frameIndex];

  /** Freeze whatever is on screen, then hand it over. */
  const takeOver = useCallback(() => {
    if (userTookOver) return;
    setOwnRegister(registerFor(frameIndex));
    setOwnFilter(frame.filter);
    stopScript();
  }, [userTookOver, frameIndex, frame.filter, stopScript]);

  // A connect in the real app opens a browser or a dialog and takes a moment.
  // Showing the spinner for a beat is the honest shape of that; flipping the
  // dot instantly would promise something the app cannot do.
  const busyTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(busyTimer.current), []);

  const toggle = useCallback(
    (id: string) => {
      const current = ownRegister ?? registerFor(frameIndex);
      takeOver();

      const plugin = current[id];
      if (!plugin) return;

      // Disconnecting is instant in the app too — the token is simply dropped.
      if (plugin.status === "connected") {
        setOwnRegister({
          ...current,
          [id]: { ...plugin, status: "not_connected", live: false },
        });
        return;
      }

      setOwnRegister(current);
      setBusyId(id);
      window.clearTimeout(busyTimer.current);
      busyTimer.current = window.setTimeout(() => {
        setBusyId(undefined);
        setOwnRegister((latest) => {
          const base = latest ?? current;
          const target = base[id];
          if (!target) return base;
          return {
            ...base,
            [id]: { ...target, status: "connected", live: true, reason: undefined },
          };
        });
      }, 700);
    },
    [ownRegister, frameIndex, takeOver],
  );

  const chooseFilter = useCallback(
    (next: FilterId) => {
      takeOver();
      setOwnFilter(next);
    },
    [takeOver],
  );

  const register = ownRegister ?? registerFor(frameIndex);
  const counts = useMemo(() => countsFrom(register), [register]);

  /** Which rows are on screen. While the script drives, the frame decides.
   *  After take-over the filter pills do. */
  const rows: DemoPlugin[] = useMemo(() => {
    if (!userTookOver) {
      return frame.plugins.map((plugin) => register[plugin.id] ?? plugin);
    }
    // Taking over clears the search — the pills drive the list from here, and a
    // frozen query the visitor cannot edit would be a dead control. "All" is
    // the whole catalog, so the visitor who clicks it gets every row.
    const shelf = ALL_DEMO_PLUGINS.map((plugin) => register[plugin.id]).filter(
      (plugin): plugin is DemoPlugin => Boolean(plugin),
    );
    if (ownFilter === "installed") {
      return shelf.filter((p) => p.status !== "not_connected");
    }
    if (ownFilter === "attention") {
      return shelf.filter((p) => p.status === "needs_reauth");
    }
    return shelf;
  }, [userTookOver, frame.plugins, register, ownFilter]);

  // What the fade restarts on: the search text and the set of rows on screen.
  // Keying it on the frame number instead made the table blink every time the
  // script ticked, including across the three frames that show the same rows
  // while Gmail connects — which read as a glitch under the spinner.
  const fadeKey = `${userTookOver ? "" : frame.query}|${rows.map((r) => r.id).join(",")}`;

  // After take-over the banner follows the register rather than the script, so
  // reconnecting the flagged plugin actually makes the warning go away.
  const flagged = Object.values(register).find((p) => p.status === "needs_reauth");
  const banner = userTookOver
    ? flagged
      ? {
          title: `${flagged.name} needs reconnecting`,
          detail: `${flagged.reason ?? "The authorization stopped working"} — reconnect to keep it working.`,
        }
      : undefined
    : frame.banner;

  return (
    <DemoStage
      canvasWidth={CANVAS_WIDTH}
      canvasHeight={CANVAS_HEIGHT}
      description={DEMO_DESCRIPTION}
      onTakeOver={takeOver}
    >
      <PluginsView
        query={userTookOver ? "" : query.slice(0, typed)}
        typing={typing}
        filter={userTookOver ? ownFilter : frame.filter}
        plugins={rows}
        busyId={userTookOver ? busyId : frame.busyId}
        hoverId={userTookOver ? undefined : frame.hoverId}
        banner={banner}
        counts={counts}
        onToggle={toggle}
        onFilter={chooseFilter}
        animate={!reducedMotion}
        fadeKey={fadeKey}
        onClearQuery={takeOver}
      />
    </DemoStage>
  );
}

export default PluginsDemo;
