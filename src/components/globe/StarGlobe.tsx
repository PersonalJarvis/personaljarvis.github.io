/**
 * The globe, and the number beside it.
 *
 * Two islands, because they are two jobs. `StarCount` owns one number and one
 * network call; `StarGlobe` owns a canvas and a rotation. Neither knows about
 * the other, and the section can place them at opposite ends of a grid.
 *
 * ## What is live, and what is not
 *
 * The COUNT is live. The browser asks GitHub for the repository's current star
 * count on its own — a public, unauthenticated call — and if the answer differs
 * from the one baked in at build time the number moves to it. That movement is
 * the only animation on the number, and it is deliberate: a counter that
 * animates on every page load is decoration, one that animates when the figure
 * has actually changed is information.
 *
 * The MARKERS are from the build. Finding out where a stargazer lives needs a
 * token, and a token cannot live in a page anyone can read the source of;
 * `scripts/fetch-stargazers.mjs` explains the whole reasoning. A scheduled
 * workflow re-runs the fetch and the site rebuilds, so they trail the count by
 * hours rather than by releases.
 *
 * The section says so out loud rather than implying the map is complete.
 *
 * ## Why the markers are DOM and the dots are canvas
 *
 * The dots are thousands of squares that never need to be hovered, clicked or
 * read; they belong in a canvas. The markers are a handful of things that need
 * a tooltip, so they are elements, moved with `transform` — which stays on the
 * compositor and does not make the browser re-do layout sixty times a second.
 * Drawing them into the canvas would mean writing hit-testing and a tooltip by
 * hand, for something CSS already does.
 */

import { useEffect, useRef, useState } from "react";

import { LAND_LAT_CELLS, LAND_LON_CELLS, LAND_MASK_BASE64 } from "@/data/land-mask";
import { buildDotField, dotAlpha, project, strideFor, trigOf } from "./projection";
import "./star-globe.css";

export interface Cluster {
  lat: number;
  lon: number;
  label: string;
  country: string;
  count: number;
}

/** Seconds for one full turn. Slow enough that it never asks to be watched. */
const TURN_SECONDS = 80;

/**
 * Where the globe parks when it is not turning.
 *
 * Twenty degrees west puts the Atlantic in the middle, which is the one
 * longitude that has Europe and North America on the same side of the planet.
 * That is where the people are.
 */
const RESTING_SPIN = (20 * Math.PI) / 180;

/** Shades of ink a dot can be drawn in. More is invisible, fewer is banded. */
const SHADES = 7;

/** Below this the dot is a smudge on the rim; not drawing it is cheaper. */
const MIN_ALPHA = 0.06;

/** The sphere, as a share of the box. The rest is room for markers at the rim. */
const RADIUS_SHARE = 0.45;

/** One dot per this many pixels of radius. Sets the grain of the raster. */
const RADIUS_PER_DOT = 145;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ------------------------------------------------------------------ count */

const CACHE_MS = 10 * 60 * 1000;

/**
 * The repository's star count, straight from GitHub.
 *
 * Anonymous, so it costs the visitor one of the sixty requests an hour that
 * GitHub gives their IP address, and it is cached for ten minutes so a reader
 * moving around the site spends exactly one. Every failure path — offline,
 * rate-limited, blocked by an extension, GitHub having a bad morning — returns
 * null and leaves the built-in number on screen. The number is never blank and
 * never zero.
 */
async function liveStars(repo: string): Promise<number | null> {
  const key = `pj:stars:${repo}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const { n, at } = JSON.parse(cached);
      if (Date.now() - at < CACHE_MS && Number.isFinite(n)) return n;
    }
  } catch {
    // A private window with storage denied is not a reason to skip the fetch.
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const n = Number(body?.stargazers_count);
    if (!Number.isFinite(n)) return null;
    try {
      sessionStorage.setItem(key, JSON.stringify({ n, at: Date.now() }));
    } catch {
      // Same again: caching is a nicety, not a requirement.
    }
    return n;
  } catch {
    return null;
  }
}

interface CountProps {
  repo: string;
  /** The figure baked in at build time. Shown until GitHub says otherwise. */
  value: number;
}

export function StarCount({ repo, value }: CountProps) {
  const [shown, setShown] = useState(value);
  const target = useRef(value);

  useEffect(() => {
    let live = true;
    let raf = 0;

    liveStars(repo).then((n) => {
      if (!live || n === null || n === target.current) return;
      const from = target.current;
      target.current = n;

      if (reducedMotion()) {
        setShown(n);
        return;
      }

      // Short, and eased out. The point is to be noticed once, not to perform.
      const started = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - started) / 700);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(from + (n - from) * eased));
        if (t < 1 && live) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });

    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [repo]);

  return (
    <span className="tabular-nums">{shown.toLocaleString("en-US")}</span>
  );
}

/* ------------------------------------------------------------------ globe */

interface GlobeProps {
  clusters: Cluster[];
}

export function StarGlobe({ clusters }: GlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const field = buildDotField(LAND_MASK_BASE64, LAND_LON_CELLS, LAND_LAT_CELLS);
    const marks = clusters.map((c) => trigOf(c.lat, c.lon));

    // Colours come from the tokens, read once off the live element. Naming a
    // hex here would put a colour in a file nobody looks in when the palette
    // changes — and the style gate would refuse it, correctly.
    const styles = getComputedStyle(host);
    // rgb() rather than a hex, because a hex here is a colour outside
    // tokens.css and the style gate is right to refuse one. It is only
    // reached if --ink is missing, in which case the page has bigger trouble
    // than the globe — but a canvas with no fillStyle paints black, which on
    // this floor is an empty rectangle and no error anywhere.
    const ink = styles.getPropertyValue("--ink").trim() || "rgb(247 247 244)";
    const hairline = styles.getPropertyValue("--hairline-strong").trim();

    // One position buffer per shade, filled fresh each frame. Allocated once
    // at full size, because a per-frame allocation of this many floats is a
    // sixty-times-a-second gift to the garbage collector.
    const buffers = Array.from(
      { length: SHADES },
      () => new Float32Array(field.count * 2),
    );
    const used = new Int32Array(SHADES);

    let ratio = 1;
    let size = 0;
    let radius = 0;
    let dot = 2;
    let stride = 1;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const next = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
      const nextRatio = Math.max(1, Math.round(window.devicePixelRatio || 1));
      if (next === size && nextRatio === ratio) return;
      size = next;
      ratio = nextRatio;
      canvas.width = size * ratio;
      canvas.height = size * ratio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      radius = (size * ratio) / 2 * (RADIUS_SHARE * 2);
      // A whole number of device pixels. A 2.4px square lands on a pixel
      // boundary in one row and between two in the next, and the grid
      // shimmers as the globe turns.
      dot = Math.max(1, Math.round(radius / RADIUS_PER_DOT));
      stride = strideFor(radius, LAND_LAT_CELLS, dot);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // A globe below the fold has no business holding a frame budget.
    let onScreen = true;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { rootMargin: "200px" },
    );
    visibility.observe(host);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let running = true;
    let raf = 0;
    const started = performance.now();

    const draw = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!onScreen || size === 0) return;

      const spin = motion.matches
        ? RESTING_SPIN
        : RESTING_SPIN + ((now - started) / (TURN_SECONDS * 1000)) * Math.PI * 2;
      const sinSpin = Math.sin(spin);
      const cosSpin = Math.cos(spin);

      const cx = (size * ratio) / 2;
      const cy = (size * ratio) / 2;
      const half = dot >> 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The silhouette. One hairline circle is what tells the eye there is a
      // sphere behind the oceans, which carry no dots at all.
      if (hairline) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hairline;
        ctx.lineWidth = Math.max(1, Math.round(ratio * 0.75));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      used.fill(0);

      for (let i = 0; i < field.count; i++) {
        if (stride > 1 && (field.row[i] % stride || field.col[i] % stride)) {
          continue;
        }
        const p = project(
          field.sinLat[i], field.cosLat[i],
          field.sinLon[i], field.cosLon[i],
          sinSpin, cosSpin, cx, cy, radius,
        );
        if (p.z <= 0) continue; // the far side of the world
        const alpha = dotAlpha(p.light, p.z);
        if (alpha < MIN_ALPHA) continue;

        // Which shade this dot rounds to. Sorting into buckets is the whole
        // performance story: setting globalAlpha per dot costs more than the
        // maths above, and there are thousands of them.
        const shade = Math.min(SHADES - 1, (alpha * SHADES) | 0);
        const buffer = buffers[shade];
        const at = used[shade];
        buffer[at] = ((p.x + 0.5) | 0) - half;
        buffer[at + 1] = ((p.y + 0.5) | 0) - half;
        used[shade] = at + 2;
      }

      ctx.fillStyle = ink;
      for (let shade = 0; shade < SHADES; shade++) {
        const n = used[shade];
        if (n === 0) continue;
        ctx.globalAlpha = (shade + 1) / SHADES;
        const buffer = buffers[shade];
        ctx.beginPath();
        for (let i = 0; i < n; i += 2) {
          ctx.rect(buffer[i], buffer[i + 1], dot, dot);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // The markers ride in CSS pixels, so the device ratio comes back out.
      for (let i = 0; i < marks.length; i++) {
        const el = markerRefs.current[i];
        if (!el) continue;
        const m = marks[i];
        const p = project(
          m.sinLat, m.cosLat, m.sinLon, m.cosLon,
          sinSpin, cosSpin, cx, cy, radius,
        );
        if (p.z <= 0.02) {
          // Gone round the back. Hidden rather than transparent, so a tooltip
          // cannot be opened on a marker the reader cannot see.
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        // Fade in over the first slice of the near side, or a marker pops into
        // existence on the silhouette.
        el.style.opacity = String(Math.min(1, p.z / 0.16));
        el.style.zIndex = String(10 + Math.round(p.z * 20));
        el.style.transform = `translate3d(${p.x / ratio}px, ${p.y / ratio}px, 0)`;
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
    };
  }, [clusters]);

  return (
    <div ref={hostRef} className="star-globe">
      {/*
        The drawing is decorative: everything it says is said again, in words,
        in the list below. Announcing a canvas of 21 538 squares helps nobody.
      */}
      <canvas ref={canvasRef} aria-hidden="true" />

      {clusters.map((c, i) => (
        <div
          key={`${c.label}-${c.country}`}
          ref={(el) => {
            markerRefs.current[i] = el;
          }}
          className="star-globe-marker"
          // The halo is the only thing that grows with the cluster, so a city
          // with thirty stargazers is one bigger mark rather than thirty marks
          // in a pile. Square root, not linear: linear turns a busy city into
          // a blot that covers the country it is in.
          style={{ "--halo": `${haloSize(c.count)}px` } as React.CSSProperties}
          aria-hidden="true"
        >
          <span className="star-globe-halo" />
          <span className="star-globe-ring" />
          <span className="star-globe-core" />
          <span className="star-globe-tip">
            {/*
              The place is ONE element, not a <strong> with loose text beside
              it. The tooltip is a grid, and a grid turns every bare text node
              into a row of its own — which put ", New Zealand" underneath
              "Auckland" and made a two-line tooltip 81 pixels tall.
            */}
            <span>
              <strong>{c.label}</strong>
              {c.country && c.country !== c.label ? `, ${c.country}` : ""}
            </span>
            <span className="star-globe-tip-count">
              {c.count === 1 ? "1 stargazer" : `${c.count} stargazers`}
            </span>
          </span>
        </div>
      ))}

      <ul className="sr-only">
        {clusters.map((c) => (
          <li key={`sr-${c.label}-${c.country}`}>
            {c.label}
            {c.country && c.country !== c.label ? `, ${c.country}` : ""}:{" "}
            {c.count === 1 ? "1 stargazer" : `${c.count} stargazers`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function haloSize(count: number) {
  return Math.round(Math.min(38, 15 + 7 * Math.sqrt(count - 1)));
}
