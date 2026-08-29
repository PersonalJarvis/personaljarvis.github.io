/**
 * How far the reader is through one element's own scroll span, as 0..1.
 *
 * ONE formula, shared by everything that scrubs on scroll — the section marker
 * in SectionTrack.astro and the wipe in VoiceSwitch.astro. They draw the same
 * section, and two copies of this arithmetic would eventually disagree about
 * where the section starts, which is exactly the defect a reader notices: the
 * picture finishes changing before the marker reaches the corner.
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

/**
 * How far the window's top edge has travelled through one ordinary section, as
 * 0..1. For a section the reader simply scrolls PAST, as opposed to one that
 * pins a child for a while.
 *
 * WHY THIS IS NOT `spanProgress`. That function subtracts a viewport from the
 * height once the element is taller than the screen, which is exactly right for
 * a sticky TRACK — the pinned stretch is the only part that means anything
 * there. Applied to an ordinary section it falls off a cliff: a section 40px
 * taller than the window gets a span of 40px, so the marker races its whole
 * perimeter in 40 pixels of scrolling and then sits in the corner for the rest
 * of the section. `Install` is that section on this page, and the effect is
 * plainly visible.
 *
 * Here the span is simply the section's own height, which is also what makes
 * the hand-over between sections exact: this reaches 1 at the moment the
 * section's bottom edge touches the top of the window, which is the same moment
 * the section below reaches 0. Neighbouring sections therefore agree on where
 * one ends and the next begins, with no gap and no overlap.
 *
 * `reach` is how much scrolling is left in the document once this section's top
 * has arrived at the top of the window, and it exists for the LAST section. Its
 * bottom edge can never touch the top of the window — the page runs out first —
 * so on its own height it would stop somewhere in the middle and the marker
 * would never finish the page. Taking whichever of the two is smaller costs
 * nothing anywhere else, because every section that has another one below it
 * has more scrolling left than its own height, and gives the last section the
 * only ending it can have: done exactly when the reader hits the bottom.
 */
export function sectionProgress(rect: DOMRect, reach: number): number {
  const span = Math.min(rect.height, reach);
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, -rect.top / span));
}
