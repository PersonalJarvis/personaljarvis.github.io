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
 * (0,100) └───────────────►┤ (100,100)    ├◄───────────────┘ (0,100)
 *                          │              │
 *                          ▼ (100,120)    ▼ (0,120)
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
 * WHY THE TAIL RUNS PAST THE BOX. A marker that stops dead in the exit corner
 * reads as the page ending there. Running it 20% further down the rail hands
 * the reader off to the next section instead. That tail lies on the SAME rail
 * the next section enters on, which is the second half of what makes the
 * hand-off continuous — and also why the tail fades out as it goes, since the
 * next section's own marker is already standing on that rail.
 *
 * THE PATH LENGTH IS THE TIMING. The marker moves at a constant speed along
 * the path, so the three legs divide the section's scroll distance in the ratio
 * of their lengths: 100 : 100 : 20. Nothing else sets the pacing, and the
 * milestones below are read back out of it rather than tuned by hand.
 *
 * Adapted from <https://www.meuze.ai>, whose section marker walks the same
 * alternating three-leg path — its own sections carry `M 0 0 V 100 H 100 V 120`
 * and `M 100 0 V 100 H 0 V 120` in exactly this rhythm; the maintainer asked
 * for that behaviour by name on 2026-08-29. The geometry is a rectangle's
 * perimeter and belongs to nobody — nothing brand-bearing is carried over.
 * See docs/layout.md § "The section marker".
 */

/** Down one rail, from the section's opening rule to its closing one. */
const RAIL = 100;

/** Across the rule that closes the section, to the opposite rail. */
const CLOSING_RULE = 100;

/** On down that opposite rail, over the top of the section below. */
const TAIL = 20;

const TOTAL = RAIL + CLOSING_RULE + TAIL;

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
  return `M ${enter} 0 V ${RAIL} H ${exit} V ${RAIL + TAIL}`;
};

/** Progress at which the marker leaves the rail and turns onto the rule. */
export const TURN_ACROSS = RAIL / TOTAL;

/** Progress at which it leaves the rule and turns down the tail. */
export const TURN_DOWN = (RAIL + CLOSING_RULE) / TOTAL;

/** Progress at a point `t` (0..1) of the way down the entry rail. */
export const downTheRail = (t: number): number => (t * RAIL) / TOTAL;
