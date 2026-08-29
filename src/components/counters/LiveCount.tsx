/**
 * One number in section 6's stat row, counted up from zero and — where the
 * platform allows it — corrected to the live figure.
 *
 * ## Why the real number is in the markup
 *
 * The component's initial state is the built-in figure, so the server renders
 * `31`, not `0`. A crawler, a reader with JavaScript off, and the frame before
 * hydration all see the true number. A stat that reads "0" to a crawler is a
 * worse bug than a missing animation, and it is the failure that a
 * naive `useState(0)` produces silently — it only shows up in view-source,
 * which nobody checks.
 *
 * The zero is set in a LAYOUT effect instead, which React runs after hydration
 * but before the browser paints, so the number never flickers from 31 to 0 on
 * screen. From there the count-up starts when the element scrolls into view.
 *
 * ## Why the animation waits for the viewport
 *
 * A counter that has already finished by the time you scroll to it is a
 * counter nobody saw. One IntersectionObserver per cell, fired once, then
 * disconnected — this is a decoration that runs a single time per page load,
 * not a scroll effect.
 *
 * `prefers-reduced-motion` skips all of it: no observer, no zero, no frames.
 * The built-in figure is on screen from the first paint and a live answer,
 * if one arrives, replaces it without a tween.
 *
 * ## Which cells are live, and why the others are not
 *
 * GitHub and Discord answer an anonymous browser request with a permissive
 * `access-control-allow-origin`, so those two cells re-ask on every visit and
 * are correct to the minute. YouTube sends no CORS header at all and its API
 * needs a key; X has no keyless route left. Those two show the committed
 * figure from `scripts/fetch-social-counts.mjs`, which explains the whole
 * measurement. Passing no `live` prop is the ordinary, supported case — that
 * cell simply counts up to what it was given.
 *
 * Every live failure path — offline, rate-limited, blocked by an extension,
 * the platform having a bad morning — returns null and leaves the built-in
 * figure standing. The number is never blank and never zero.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Where a cell may re-check its own number from the browser.
 *
 * A closed union rather than a URL, because the endpoints are not
 * interchangeable: each has its own response shape and its own reason for
 * being safe to call anonymously. A free-form URL prop would invite a fourth
 * caller to point this at something that needs a key.
 */
export type LiveSource =
  | { kind: "github"; repo: string }
  | { kind: "discord"; invite: string };

export interface LiveCountProps {
  /** The figure baked in at build time. Rendered as-is on the server. */
  value: number;
  /** Omit for a build-time-only cell; it still counts up. */
  live?: LiveSource;
  /** Count-up length in ms. The default is a glance, not a performance. */
  durationMs?: number;
  /** Passed straight to the `<span>`; tabular figures are added for you. */
  className?: string;
}

/**
 * Ten minutes, matching `StarCount` in the globe.
 *
 * A reader moving around the page spends one request per platform, not one per
 * cell per visit. GitHub gives an anonymous IP sixty requests an hour and this
 * page would otherwise be able to burn several of them by scrolling.
 */
const CACHE_MS = 10 * 60 * 1000;

/** Long enough for a slow network, short enough to never hold a cell hostage. */
const FETCH_TIMEOUT_MS = 8_000;

/** Correcting an already-settled number. Short; it is information, not decoration. */
const CORRECTION_MS = 700;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ------------------------------------------------------------------ live */

function cacheKey(source: LiveSource) {
  return source.kind === "github" ? `pj:count:gh:${source.repo}` : `pj:count:dc:${source.invite}`;
}

/**
 * The current figure straight from the platform, or null.
 *
 * Null on every failure, deliberately: the caller's only correct response to
 * "I could not check" is to keep showing what it already has, so there is
 * nothing for an error branch to do differently.
 */
async function fetchLive(source: LiveSource): Promise<number | null> {
  const key = cacheKey(source);
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
    let n: number;
    if (source.kind === "github") {
      const res = await fetch(`https://api.github.com/repos/${source.repo}`, {
        headers: { accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      n = Number((await res.json())?.stargazers_count);
    } else {
      // `with_counts=true` is the whole point of the call — without it Discord
      // returns the guild and no numbers. The endpoint sets
      // `access-control-allow-credentials`, so credentials must stay omitted
      // or the browser rejects the wildcard-free CORS answer.
      const res = await fetch(
        `https://discord.com/api/v10/invites/${source.invite}?with_counts=true`,
        { credentials: "omit", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
      );
      if (!res.ok) return null;
      n = Number((await res.json())?.approximate_member_count);
    }

    if (!Number.isFinite(n) || n < 0) return null;
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

/* ---------------------------------------------------------------- island */

export default function LiveCount({
  value,
  live,
  durationMs = 900,
  className,
}: LiveCountProps) {
  // The built-in figure, so the server-rendered HTML carries the real number.
  const [shown, setShown] = useState(value);
  const hostRef = useRef<HTMLSpanElement>(null);

  /**
   * The best figure known right now. A live answer that lands mid-count-up
   * moves this, and the running animation re-aims at it on the next frame
   * instead of a second animation fighting the first.
   */
  const targetRef = useRef(value);
  const rafRef = useRef(0);
  const aliveRef = useRef(true);
  /** True once the count-up has finished, so a later correction tweens instead. */
  const settledRef = useRef(true);

  // Before the first paint, so the drop to zero is never on screen. A plain
  // effect here would let the browser paint the real number first and the row
  // would visibly flinch on every load.
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    settledRef.current = false;
    setShown(0);
  }, []);

  useEffect(() => {
    aliveRef.current = true;

    const tween = (from: number, duration: number) => {
      cancelAnimationFrame(rafRef.current);
      const started = performance.now();
      const step = () => {
        if (!aliveRef.current) return;
        const t = Math.min(1, (performance.now() - started) / duration);
        // Ease out cubic: fast off the mark, gently into the figure. The last
        // digits settling is the part that reads as a counter rather than a
        // number swap.
        const eased = 1 - Math.pow(1 - t, 3);
        const to = targetRef.current;
        setShown(Math.round(from + (to - from) * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(step);
        else {
          // Land exactly on the target; rounding an eased fraction can stop a
          // digit short.
          setShown(targetRef.current);
          settledRef.current = true;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    // The live check runs regardless of motion preference and regardless of
    // whether the cell is on screen — it is one cached request, and having the
    // answer ready before the count-up starts is what lets a single animation
    // land on the CURRENT number rather than on the committed one.
    if (live) {
      fetchLive(live).then((n) => {
        if (!aliveRef.current || n === null || n === targetRef.current) return;
        const from = targetRef.current;
        targetRef.current = n;
        if (reducedMotion() || !settledRef.current) {
          // Reduced motion snaps; a count-up still running simply re-aims,
          // which the running tween does by reading targetRef each frame.
          if (reducedMotion()) setShown(n);
          return;
        }
        tween(from, CORRECTION_MS);
      });
    }

    // One observer, or none under reduced motion. Declared out here so the
    // single cleanup below covers both paths — an early `return` before the
    // cleanup is registered would leave `aliveRef` true and let a resolved
    // fetch call `setShown` on an unmounted island.
    let observer: IntersectionObserver | null = null;
    const host = hostRef.current;

    if (!reducedMotion() && host) {
      // Fire once. `disconnect()` on the first intersection is what keeps this
      // a one-shot decoration instead of a counter that replays on every
      // scroll past, which is the version that gets called annoying.
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          observer?.disconnect();
          tween(0, durationMs);
        },
        // The moment any part of the cell is on screen, with no margin of its
        // own. The section hydrates these with `client:visible`, which already
        // waits for the viewport; a stricter threshold here would leave a
        // visible zero sitting in the row between hydration and the count.
        { threshold: 0 },
      );
      observer.observe(host);
    }

    return () => {
      aliveRef.current = false;
      observer?.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
    // Keyed on the descriptor's identity as a string, not the object: `live`
    // is written as a literal at the call site, so a new object arrives on
    // every render of the section and an object dependency would re-fetch on
    // each one.
  }, [live ? cacheKey(live) : "", durationMs]);

  return (
    <span ref={hostRef} className={className ? `tabular-nums ${className}` : "tabular-nums"}>
      {shown.toLocaleString("en-US")}
    </span>
  );
}
