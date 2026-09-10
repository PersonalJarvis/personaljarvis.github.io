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
 * The MARKERS start with the build snapshot, then follow an anonymous aggregate
 * feed. The app repository refreshes that feed on each star and hourly, using
 * its own short-lived Actions token. No credential reaches the browser.
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
 *
 * ## The globe can be dragged
 *
 * Press and move, and the world turns under the pointer. Let go and it carries
 * the throw before easing back to its own slow rotation.
 *
 * Three decisions in that, and each one is a trade:
 *
 *  1. **A pixel of drag is a pixel of surface.** The rotation per pixel is
 *     1/radius radians, which is the angle a point at the centre of the disc
 *     actually moves through. Any other constant makes the sphere feel like it
 *     is geared to the mouse rather than held by it.
 *  2. **The spin keeps whatever it is given; the TILT comes home.** Where the
 *     globe is pointing is the reader's business, but how far the camera sits
 *     off the equator is the composition — 18° is the whole reason the graphic
 *     reads as a ball and not as a disc. So the tilt eases back on release,
 *     over about a second, while the spin keeps its momentum.
 *  3. **`touch-action: pan-y`, set in the stylesheet.** On a phone the globe
 *     fills most of the screen, and a section you cannot scroll past because
 *     the graphic ate the gesture is a trap. Horizontal drags turn the globe;
 *     vertical ones scroll the page, and the browser arbitrates, not us.
 *
 * ## And it answers the scroll
 *
 * The section it lives in pins itself for the better part of a screen, so the
 * reader scrolls and the page does not move. The globe is what tells them the
 * scroll arrived: half a turn across that span, forwards and backwards, as a
 * function of the scroll position rather than a rate.
 *
 * It is the second angle in the sum and not a change to the first, because the
 * two are answering different questions. `spin` is where the globe is pointing
 * — the idle drift and whatever the reader has thrown at it, which is theirs to
 * keep. `SCROLL_TURN` is a reading of where they are in the section, which has
 * to be reversible and has to stand still when they do. Folding the second into
 * the first would make it neither. See `SCROLL_TURN` below.
 */

import { useEffect, useRef, useState } from "react";
import { useStargazerFeed } from "./useStargazerFeed";

import { LAND_LAT_CELLS, LAND_LON_CELLS, LAND_MASK_BASE64 } from "@/data/land-mask";
import { trackProgress } from "@/lib/scrollSpan";
import {
  buildDotField,
  dotAlpha,
  project,
  strideFor,
  trigOf,
  TILT_DEGREES,
  TILT_MAX,
  TILT_MIN,
  type View,
} from "./projection";
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

/** The same, as radians per second — what the spin actually carries. */
const AUTO_RATE = (Math.PI * 2) / TURN_SECONDS;

/**
 * How far the reader's own scroll turns the globe, across the whole of the
 * section's pinned span.
 *
 * THIS IS THE SECTION'S ANSWER TO THE SCROLL, and it exists because the section
 * holds the reader still for the better part of a screen (see Stargazers.astro
 * § "AND IT HOLDS THE READER FOR A BEAT"). A pause that answers nothing is
 * indistinguishable from a page that has stopped working — the wipe in
 * `VoiceSwitch` is the same construction and the same reason: the reader's
 * gesture has to move something, or they conclude the gesture was lost.
 *
 * THE IDLE ROTATION CANNOT DO THIS JOB, and that is the whole point of adding a
 * second term rather than speeding the first one up. The globe already turns on
 * its own, so its motion says nothing about whether the scroll arrived; a
 * reader watching a globe that turns identically whether they scroll or not
 * learns nothing from it. This term is a FUNCTION of the scroll position, so it
 * runs backwards when they scroll back and stands still when they stop — which
 * is what makes it a reading of their gesture rather than decoration.
 *
 * HALF A TURN, not a whole one and not a quarter. Over the pinned span it works
 * out at about the same degrees-per-pixel as dragging the globe with the
 * pointer, so the two gestures agree about how heavy the planet is. It is also
 * the rotation that means something here: the globe faces the Atlantic at rest,
 * so half a turn is exactly the trip from the people on one side of the planet
 * to the people on the other.
 */
const SCROLL_TURN = Math.PI;

/**
 * Where the globe starts, and where a released throw settles back toward.
 *
 * Twenty degrees west puts the Atlantic in the middle, which is the one
 * longitude that has Europe and North America on the same side of the planet.
 * That is where the people are.
 */
const RESTING_SPIN = (20 * Math.PI) / 180;

const RESTING_TILT = (TILT_DEGREES * Math.PI) / 180;

/** How fast a throw bleeds back to the idle rate, and the tilt back to 18°. */
const SPIN_SETTLE = 1.6;
const TILT_SETTLE = 3.2;

/** A throw is capped so a flick across the trackpad cannot become a blur. */
const MAX_THROW = 6;

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

  return <span className="tabular-nums">{shown.toLocaleString("en-US")}</span>;
}

/* ------------------------------------------------------------------ globe */

export function StarMapNote() {
  const { clusters, placed, count, generatedAt } = useStargazerFeed();
  const places = clusters.length === 1 ? "1 place" : `${clusters.length} places`;
  return (
    <>
      The globe marks {places}, covering {placed} of {count} stargazers.
      {" "}Only public locations we can resolve are shown. New stars update the map
      automatically; processing can take a few minutes.
      {" "}Locations checked <time dateTime={generatedAt}>{new Date(generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</time>.
    </>
  );
}

export function StarGlobe() {
  const { clusters } = useStargazerFeed();
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

    // One view object, rewritten each frame and handed to every projection.
    const view: View = {
      sinSpin: 0, cosSpin: 1, sinTilt: 0, cosTilt: 1, cx: 0, cy: 0, radius: 0,
    };

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
      radius = ((size * ratio) / 2) * (RADIUS_SHARE * 2);
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

    /* The scroll span this globe is standing in, if it is standing in one.
     *
     * `closest`, and not a prop: which element carries the span is a fact about
     * the section's markup, and a prop would be a hand-maintained copy of it
     * that goes wrong silently the moment the section is restructured. The same
     * attribute drives `SectionTrack`, so the marker walking the frame and the
     * globe turning under the reader are reading ONE number — they cannot
     * disagree about how far through the pause the reader is, which is the
     * defect a reader actually notices.
     *
     * `null` outside a pinned section, and the globe then behaves exactly as it
     * did before this existed: idle rotation and the drag. This component is
     * not the section's, and must not need it. */
    const span = host.closest<HTMLElement>("[data-scroll-span]");

    /* --- state the drag and the clock share ------------------------------ */

    let spin = RESTING_SPIN;
    let tilt = RESTING_TILT;
    /** Radians per second. Starts at the idle rate and is what a throw sets. */
    let spinRate = AUTO_RATE;

    let dragging = false;
    let pointer = -1;
    let lastX = 0;
    let lastY = 0;
    let lastMove = 0;
    /** The last few milliseconds of movement, which is what a throw is made of. */
    let throwRate = 0;

    /** Radians per pixel: the angle a point at the centre of the disc moves. */
    const perPixel = () => (radius > 0 ? ratio / radius : 0);

    const onPointerDown = (e: PointerEvent) => {
      if (dragging || e.button !== 0) return;
      dragging = true;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMove = performance.now();
      throwRate = 0;
      host.classList.add("is-dragging");
      // Capture, so a drag that leaves the globe — or the window — still ends
      // with a pointerup we hear about, instead of a globe stuck to the mouse.
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        // Capture is a convenience; without it the listeners below still fire
        // while the pointer is over the host, which is the common case.
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      const k = perPixel();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      spin += dx * k;
      // Down means looking from further north: raising the camera's latitude
      // pushes the equator down the screen, so the surface follows the hand.
      tilt = Math.min(TILT_MAX, Math.max(TILT_MIN, tilt + dy * k));

      const now = performance.now();
      const dt = (now - lastMove) / 1000;
      lastMove = now;
      // Guard the divide: two pointermove events can share a millisecond, and
      // dt = 0 would make the throw infinite.
      if (dt > 0.001) throwRate = (dx * k) / dt;
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      dragging = false;
      pointer = -1;
      host.classList.remove("is-dragging");
      // A pointer that stopped moving before it was released was not thrown.
      const stale = performance.now() - lastMove > 90;
      spinRate = stale
        ? AUTO_RATE
        : Math.max(-MAX_THROW, Math.min(MAX_THROW, throwRate));
      try {
        host.releasePointerCapture(e.pointerId);
      } catch {
        // Already released, or never captured. Nothing to undo.
      }
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", endDrag);
    host.addEventListener("pointercancel", endDrag);

    /* --- the loop -------------------------------------------------------- */

    let running = true;
    let raf = 0;
    let previous = performance.now();

    const draw = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      // Clamp the step. A tab that was in the background hands back a delta of
      // several seconds on its first frame, and an unclamped one would snap the
      // globe a third of the way round.
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!onScreen || size === 0) return;

      const idle = motion.matches ? 0 : AUTO_RATE;

      if (!dragging) {
        spin += spinRate * dt;
        // Exponential settle, framed as a fraction of the remaining distance,
        // so it is frame-rate independent rather than tuned for 60Hz.
        spinRate += (idle - spinRate) * Math.min(1, dt * SPIN_SETTLE);
        tilt += (RESTING_TILT - tilt) * Math.min(1, dt * TILT_SETTLE);
      }

      /* The reader's own scroll, as an angle. Read every frame rather than
       * accumulated, because it is a POSITION and not a rate: scroll back up
       * and it unwinds, stop and it stops. An accumulated version would drift
       * away from the scroll it is meant to be reporting, and a globe that
       * keeps turning after the reader stopped is back to saying nothing.
       *
       * One `getBoundingClientRect` per frame, next to the several thousand
       * dots this loop is already projecting. `onScreen` guards it above, so a
       * globe nobody is looking at reads nothing at all.
       *
       * Off under reduced motion, like every other scroll-driven thing on this
       * site: `VoiceSwitch` drops its wipe there and the section drops its pin,
       * so a globe still swinging half a turn would be the one piece of the
       * page that ignored the request. */
      const scrolled =
        span && !motion.matches
          ? trackProgress(span) * SCROLL_TURN
          : 0;

      view.sinSpin = Math.sin(spin + scrolled);
      view.cosSpin = Math.cos(spin + scrolled);
      view.sinTilt = Math.sin(tilt);
      view.cosTilt = Math.cos(tilt);
      view.cx = (size * ratio) / 2;
      view.cy = (size * ratio) / 2;
      view.radius = radius;

      const half = dot >> 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The silhouette. One hairline circle is what tells the eye there is a
      // sphere behind the oceans, which carry no dots at all.
      if (hairline) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hairline;
        ctx.lineWidth = Math.max(1, Math.round(ratio * 0.75));
        ctx.beginPath();
        ctx.arc(view.cx, view.cy, radius, 0, Math.PI * 2);
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
          view,
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
        const p = project(m.sinLat, m.cosLat, m.sinLon, m.cosLon, view);
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
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", endDrag);
      host.removeEventListener("pointercancel", endDrag);
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
