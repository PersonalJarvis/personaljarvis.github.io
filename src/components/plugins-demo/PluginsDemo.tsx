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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ALL_DEMO_PLUGINS,
  CATALOG_SIZE,
  DEMO_DESCRIPTION,
  FRAMES,
  type DemoPlugin,
  type FilterId,
} from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PluginsView } from "./PluginsView";
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

/** True when the visitor asked their system for less motion. Read once on
 *  mount, because reading it during render would differ between the server-
 *  rendered HTML and the first client render. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Scale the fixed canvas to fit the stage.
 *
 * The hero scales by width alone; its stage owns its aspect ratio and may grow
 * as tall as it likes. This card's height is already fixed by `16/9`, so a
 * width-only scale would push the window through the card's bottom edge. Fit
 * both axes and the window is always whole. See docs/feature-section.md.
 */
function useFitScale(ref: RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = (width: number, height: number) => {
      if (width <= 0) return;
      const byWidth = width / CANVAS_WIDTH;
      // The width is always definite — the column is. The height only is while
      // the stage has an aspect ratio (narrow) or the card's 16/9 gives it one
      // (wide). Fall back to the width if it ever is not, because a height read
      // from the content is a height the window itself decided: scale feeds
      // size feeds scale, and the mockup runs away to full size.
      const byHeight = height > 0 ? height / CANVAS_HEIGHT : byWidth;
      // Never above 1:1. A mockup enlarged past its design size looks soft.
      setScale(Math.min(1, byWidth, byHeight));
    };

    const box = node.getBoundingClientRect();
    measure(box.width, box.height);

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) measure(rect.width, rect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return scale;
}

export function PluginsDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const scale = useFitScale(stageRef);
  const reducedMotion = usePrefersReducedMotion();

  const [frameIndex, setFrameIndex] = useState(0);
  /** Set on the first click and never cleared. Once the visitor has touched
   *  the window it stops moving under their hand — permanently, not until the
   *  next timer. */
  const [userTookOver, setUserTookOver] = useState(false);

  /** Their state after take-over. Null while the script is still driving. */
  const [ownRegister, setOwnRegister] = useState<Register | null>(null);
  const [ownFilter, setOwnFilter] = useState<FilterId>("all");
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const frame = FRAMES[frameIndex];

  useEffect(() => {
    if (userTookOver || reducedMotion) return;
    const timer = window.setTimeout(
      () => setFrameIndex((i) => (i + 1) % FRAMES.length),
      frame.duration,
    );
    return () => window.clearTimeout(timer);
  }, [frameIndex, frame.duration, userTookOver, reducedMotion]);

  /** Freeze whatever is on screen, then hand it over. */
  const takeOver = useCallback(() => {
    if (userTookOver) return;
    setOwnRegister(registerFor(frameIndex));
    setOwnFilter(frame.filter);
    setUserTookOver(true);
  }, [userTookOver, frameIndex, frame.filter]);

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
    // frozen query the visitor cannot edit would be a dead control.
    const all = ALL_DEMO_PLUGINS.map((plugin) => register[plugin.id]).filter(
      (plugin): plugin is DemoPlugin => Boolean(plugin),
    );
    // Google Drive and Calendar only ever appear under a search; without one
    // they are not part of the five-row shelf.
    const shelf = all.filter((plugin) => !plugin.id.startsWith("google_"));
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
    <div className="h-full w-full">
      {/*
        The stage: the recessed well. Its 24px of padding is what keeps the
        window off its edge — the second of the two nested radii that carry the
        depth in this system, since it has no shadows.

        aria-hidden, because a screen reader should get the sentence below, not
        a table of fictional plugin rows.
      */}
      <div
        ref={stageRef}
        aria-hidden="true"
        onMouseDownCapture={takeOver}
        className="grid aspect-[7/6] w-full place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-canvas p-6 lg:aspect-auto lg:h-full"
      >
        {/*
          The window's own frame sits OUTSIDE the transform, so its 1px border
          and 8px radius stay exactly that at any scale. Everything inside is
          design pixels and scales; a window's chrome does not.
        */}
        <div
          className="overflow-hidden rounded-[var(--radius-md)] border border-hairline bg-card"
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
            // Nothing to show until the observer has measured; drawing at
            // scale 0 would flash a collapsed window on first paint.
            visibility: scale > 0 ? "visible" : "hidden",
          }}
        >
          <div
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <PluginsView
              query={userTookOver ? "" : frame.query}
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
          </div>
        </div>
      </div>

      <p className="sr-only">{DEMO_DESCRIPTION}</p>
    </div>
  );
}

export default PluginsDemo;
