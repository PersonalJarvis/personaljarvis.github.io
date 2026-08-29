/**
 * How far the reader is through one element's own scroll span, as 0..1.
 *
 * ONE formula, shared by everything that scrubs on a PINNED section — the wipe
 * in VoiceSwitch, the step focus in Install, the globe's turn in StarGlobe.
 * They draw the same section, and two copies of this arithmetic would
 * eventually disagree about where the section starts, which is exactly the
 * defect a reader notices: the picture finishes changing before the square
 * reaches the corner.
 *
 * THE SECTION MARKER IS NOT A CALLER ANY MORE, AND STILL AGREES WITH ALL OF
 * THEM. It needs the same question answered for every section on the page at
 * once and in DOCUMENT coordinates, so that it can tile the answers and walk
 * the gaps between them; `scheduleTracks` in src/lib/sectionTrack.ts is that,
 * and its pinned branch is this function's pinned branch written as a scroll
 * range — `track.top - pinRest` to `track.top + height - pinBox` — rather than
 * as a fraction. The two cannot drift because they are the same two numbers.
 *
 * ITS OTHER BRANCH USED TO LIVE HERE TOO, as `sectionProgress`, and it went
 * with the marker on 2026-08-29: an ordinary section's span is simply its own
 * height, and the one caller that wanted it now states that as a scroll range
 * beside the pinned one.
 *
 * The branch is not a special case, it is the two shapes a section can have:
 *
 *   taller than the screen   the reader scrolls THROUGH it. 0 when its top
 *                            reaches the top of the window, 1 when its bottom
 *                            reaches the bottom — the span a sticky child is
 *                            pinned for, which is the only span that means
 *                            anything for a scroll-driven section
 *   shorter than the screen  there is no "through" to scroll. 0 when its top
 *                            reaches the top of the window, 1 when its BOTTOM
 *                            does — so the sweep happens as the section leaves
 *
 * Both are `-top / span`, so the value is continuous as a window is resized
 * past the point where one becomes the other.
 */
export function spanProgress(rect: DOMRect, viewport: number, pinTop = 0): number {
  const pinned = rect.height > viewport;
  const span = pinned ? rect.height - viewport : rect.height;
  if (span <= 0) return 0;
  /* `pinTop` is where the child comes to REST, not where it is now: the pinned
   * span starts when the track's top reaches that line and ends when its bottom
   * does, so both ends move down by it and the travelled distance is measured
   * from it. It is 0 for a child pinned flush with the window, which is what
   * every caller passed before the sections started pinning under the nav.
   * The short-section branch has no pin and so has nothing to offset. */
  const travelled = pinned ? pinTop - rect.top : -rect.top;
  return Math.min(1, Math.max(0, travelled / span));
}

/**
 * The same figure for a track that pins a `[data-viewport]` child — measured,
 * not assumed.
 *
 * WHY THE CALLERS DO NOT PASS `window.innerHeight` ANY MORE. They did while
 * every pinned child was `top: 0; height: 100svh`, and then the window WAS the
 * pinned box. It is not since the sections started standing under the fixed nav
 * (`top: var(--nav-height); height: var(--section-height)` — see layout.css
 * § "Section heights"): the box is `2 x --nav-height` shorter than the window
 * and comes to rest one of those below its top, so a span measured against the
 * window runs out `2 x --nav-height` of scrolling before the pin lets go. On
 * the voice section that is 152px of 2650 — the wipe finishes, and the picture
 * then stands still for the last 6% of the section. Which is the defect the
 * note above says this file exists to prevent, arrived at from the other side.
 *
 * Reading it off the child rather than off the tokens is what keeps it true
 * through the guards: `Install` and `Stargazers` drop the pin at their own
 * window sizes, and a `static` child measures as the whole track — no pin, no
 * offset, and the short-section branch takes over on its own.
 */
export function trackProgress(track: HTMLElement): number {
  const child = track.querySelector<HTMLElement>("[data-viewport]");
  if (!child) return spanProgress(track.getBoundingClientRect(), window.innerHeight);
  const style = getComputedStyle(child);
  const top = style.position === "sticky" ? parseFloat(style.top) || 0 : 0;
  return spanProgress(
    track.getBoundingClientRect(),
    child.getBoundingClientRect().height,
    top,
  );
}
