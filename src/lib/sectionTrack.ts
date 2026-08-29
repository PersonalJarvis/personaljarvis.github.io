/**
 * The path the section marker walks, and the milestones on it.
 *
 * THE PATH IS THE SECTION'S OWN PERIMETER, in percent of the tracked box — and
 * it comes in two mirror images, because consecutive sections alternate:
 *
 *      odd section — side "left"          even section — side "right"
 *
 *   (0,0) ┌────────────────┐              ┌────────────────┐ (100,0)
 *         │                │              │                │
 *         ▼                │              │                ▼
 * (0,100) └───────────────►● (100,100)    ●◄───────────────┘ (0,100)
 *
 *                    ● = the exit corner, which is also the next
 *                        section's entry corner, one pixel below
 *
 * WHY IT ALTERNATES — "the serpentine". A marker that always ran down the left
 * rail would leave every section at the bottom-RIGHT corner and enter the next
 * one at the top-LEFT: a jump the full width of the column, at every single
 * section boundary. Mirroring every second section puts each section's exit
 * corner directly above the next section's entry corner, so the square hands
 * itself over without moving sideways and the whole page reads as one line
 * folded back and forth rather than as one gadget repeated per section.
 *
 * WHY A PATH AND NOT THREE SUMS. `getPointAtLength` on a real `<path>` gives
 * the position and the corner handling for free, in percent, so the same two
 * strings work for a section of any height without a single pixel being
 * computed anywhere. The SVG carries `preserveAspectRatio="none"`, so the
 * square 0..100 box above stretches to whatever the section actually is.
 *
 * THERE IS NO TAIL, AND THAT IS DELIBERATE. The path used to run 20% further
 * down the exit rail, past the corner and over the top of the section below.
 * That only made sense while every section painted a marker of its own: the
 * overhanging tail covered the seam between one square stopping and the next
 * one starting. The page now shows exactly ONE square (see SectionTrack.astro),
 * and for a single square a tail is a defect — it walks past the corner into
 * the next section and then snaps back up to it when the hand-over happens.
 * Ending the path exactly on the corner is what makes the hand-over invisible,
 * because that corner IS the next section's first point. Maintainer's call,
 * 2026-08-29: "nur einen Punkt, der ständig von oben nach unten geht".
 *
 * THE PATH LENGTH IS THE TIMING. The marker moves at a constant speed along the
 * path, so the two legs split the section's scroll distance evenly, 100 : 100.
 * Nothing else sets the pacing, and the milestones below are read back out of
 * those numbers rather than tuned by hand.
 *
 * Adapted from <https://www.meuze.ai>, whose section marker walks the same
 * alternating path and which the maintainer asked for by name on 2026-08-29.
 * The geometry is a rectangle's perimeter and belongs to nobody — nothing
 * brand-bearing is carried over. Its tail is the one thing not taken: that site
 * draws a square per section, and this one draws a single square for the whole
 * page. See docs/layout.md § "The section marker".
 */

/** Down one rail, from the section's opening rule to its closing one. */
const RAIL = 100;

/** Across the rule that closes the section, to the opposite rail. */
const CLOSING_RULE = 100;

const TOTAL = RAIL + CLOSING_RULE;

/** Which rail a section's marker walks DOWN. It exits on the other one. */
export type TrackSide = "left" | "right";

/**
 * The side for the n-th tracked section, counted from 0 in document order.
 *
 * Odd sections (the 1st, 3rd, 5th) run down the left rail, even ones down the
 * right. Counted over the sections that actually carry a marker, not over every
 * section on the page: the chain only has to be unbroken between neighbouring
 * MARKERS, and a section without one — the hero — is not a link in it.
 */
export const sideForIndex = (index: number): TrackSide =>
  index % 2 === 0 ? "left" : "right";

/**
 * The `d` attribute for one side, in the 0..100 box the SVG stretches over the
 * section. Enter at the top of one rail, leave down the other.
 */
export const trackPath = (side: TrackSide): string => {
  const enter = side === "left" ? 0 : 100;
  const exit = side === "left" ? 100 : 0;
  return `M ${enter} 0 V ${RAIL} H ${exit}`;
};

/** Progress at which the marker leaves the rail and turns onto the rule. */
export const TURN_ACROSS = RAIL / TOTAL;

/**
 * Progress at which the marker reaches the exit corner — the end of the path,
 * and the point the next section starts from. It is 1 now that the tail is
 * gone; it is still exported by name because what depends on it depends on the
 * MEANING ("the section is done"), not on the number, and `VoiceSwitch` times
 * its picture wipe to land exactly here.
 */
export const TURN_DOWN = (RAIL + CLOSING_RULE) / TOTAL;

/** Progress at a point `t` (0..1) of the way down the entry rail. */
export const downTheRail = (t: number): number => (t * RAIL) / TOTAL;
