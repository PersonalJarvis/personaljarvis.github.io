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
