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
 * range — `track.top` to `track.top + height - viewport` — rather than as a
 * fraction. The two cannot drift because they are the same two numbers.
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
export function spanProgress(rect: DOMRect, viewport: number): number {
  const span = rect.height > viewport ? rect.height - viewport : rect.height;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, -rect.top / span));
}
