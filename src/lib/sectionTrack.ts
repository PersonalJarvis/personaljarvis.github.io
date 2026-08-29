/**
 * The path the section marker walks, and the milestones on it.
 *
 * THE PATH IS THE SECTION'S OWN PERIMETER, in percent of the tracked box. A
 * CLOSED section — one whose bottom edge is drawn, which is the ordinary case —
 * comes in two mirror images, because consecutive closed sections alternate:
 *
 *      closed, side "left"                 closed, side "right"
 *
 *   (0,0) ┌────────────────┐              ┌────────────────┐ (100,0)
 *         │                │              │                │
 *         ▼                │              │                ▼
 * (0,100) └───────────────►● (100,100)    ●◄───────────────┘ (0,100)
 *
 *                    ● = the exit corner, which is also the next
 *                        section's entry corner, one pixel below
 *
 * WHY IT ALTERNATES — "the serpentine". A marker that always crossed and then
 * started the next section on the far rail would jump the full width of the
 * column at every boundary. Mirroring the section that follows a crossing one
 * puts each section's exit corner directly above the next section's entry
 * corner, so the square hands itself over without moving sideways and the whole
 * page reads as one line folded back and forth rather than as one gadget
 * repeated per section.
 *
 * AN OPEN SECTION IS THE OTHER CASE, and it is why the side is not `index % 2`.
 *
 *      open, side "left"                   open, side "right"
 *
 *   (0,0) ┌ ─ ─ ─ ─ ─ ─ ─ ─               ─ ─ ─ ─ ─ ─ ─ ─ ┐ (100,0)
 *         │                                               │
 *         ▼                                               ▼
 * (0,100) ●  no closing rule to cross                     ● (100,100)
 *
 * One section of this page is open: CLIs, the last of the three blocks that opt
 * out of the section shell. Its neighbour below opens on a pinned frame held an
 * inset further down, so nothing is drawn at that joint for the square to cross
 * and it walks its entry rail and nothing else, handing over on the SAME rail.
 * Draw the crossing leg anyway and the square would trace a line that is not
 * there. The other two blocks of that run close on a hairline of their own
 * (`.section-run-rule`, added 2026-08-29 when the maintainer asked for the
 * three to be told apart again) and are ordinary closed sections.
 *
 * WHICH MAKES THE SIDE A RUNNING TOTAL, NOT A PARITY. A closed section flips
 * the side for the one below it; an open section keeps it. `sidesForTracks`
 * folds that down the page, which is the only rule that holds for both kinds —
 * `index % 2` is the same answer only as long as every section closes, and it
 * silently breaks the chain the moment one does not.
 *
 * WHY A PATH AND NOT THREE SUMS. `getPointAtLength` on a real `<path>` gives
 * the position and the corner handling for free, in percent, so the same few
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
 * path, so a closed section's two legs split its scroll distance evenly,
 * 100 : 100, and an open section spends all of it coming down the rail. Nothing
 * else sets the pacing, and the milestones below are read back out of those
 * numbers rather than tuned by hand.
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

/** Which rail a section's marker walks DOWN. */
export type TrackSide = "left" | "right";

/**
 * Whether a section's bottom edge is a drawn rule the marker crosses.
 *
 * `"closed"` is the ordinary section: it ends on a horizontal rule, the square
 * runs along it to the opposite rail, and the section below starts there.
 * `"open"` is a section with no rule under it — the square reaches the bottom
 * of its entry rail and the section below carries straight on down the same
 * one.
 */
export type TrackEnd = "closed" | "open";

/**
 * The side each tracked section walks down, folded over document order.
 *
 * Takes how every section ENDS, in order, and returns where each one STARTS.
 * The first square starts on the left; after that, a closed section flips the
 * side and an open one keeps it, which is exactly the statement "the exit
 * corner and the next entry corner are the same pixel".
 *
 * Counted over the sections that actually carry a marker, not over every
 * section on the page: the chain only has to be unbroken between neighbouring
 * MARKERS, and a section without one is not a link in it.
 */
export const sidesForTracks = (ends: readonly TrackEnd[]): TrackSide[] => {
  let side: TrackSide = "left";
  return ends.map((end) => {
    const entry = side;
    if (end === "closed") side = side === "left" ? "right" : "left";
    return entry;
  });
};

/**
 * The `d` attribute for one section, in the 0..100 box the SVG stretches over
 * it. Enter at the top of one rail; a closed section leaves along its bottom
 * rule, an open one stops where the rail does.
 */
export const trackPath = (side: TrackSide, end: TrackEnd = "closed"): string => {
  const enter = side === "left" ? 0 : 100;
  const exit = side === "left" ? 100 : 0;
  const down = `M ${enter} 0 V ${RAIL}`;
  return end === "closed" ? `${down} H ${exit}` : down;
};

/**
 * Progress at which the marker leaves the rail and turns onto the rule.
 *
 * A CLOSED section's milestone. An open section has no such turn: it is on its
 * rail for the whole of its progress.
 */
export const TURN_ACROSS = RAIL / TOTAL;

/**
 * Progress at which the marker reaches the exit corner — the end of the path,
 * and the point the next section starts from. It is 1 now that the tail is
 * gone; it is still exported by name because what depends on it depends on the
 * MEANING ("the section is done"), not on the number, and `VoiceSwitch` times
 * its picture wipe to land exactly here.
 */
export const TURN_DOWN = (RAIL + CLOSING_RULE) / TOTAL;

/**
 * Progress at a point `t` (0..1) of the way down the entry rail of a CLOSED
 * section — the only kind that reads its milestones back out (`VoiceSwitch`).
 */
export const downTheRail = (t: number): number => (t * RAIL) / TOTAL;
