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
 * Adapted from the design reference the maintainer supplied on 2026-08-29,
 * whose section marker walks the same alternating path.
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

/**
 * One tracked box, measured in DOCUMENT coordinates.
 *
 * `pinTop` is null for a section that simply scrolls past. It is a number for a
 * section that PINS its box — a tall track carrying a `position: sticky` child
 * — and then it is the track's own top, because the track is what the reader
 * spends scrolling on while the box itself stands still.
 *
 * WHETHER A SECTION IS PINNED IS A RUNTIME FACT, NOT A MARKUP ONE. `Install`
 * carries a track at every window size and drops the pin — `position: static`
 * on the sticky child — whenever the frame cannot hold its content. Read the
 * pin off computed style rather than off `[data-scroll-span]`, or the schedule
 * gives that section a running length of `track - viewport`, which at the
 * window where it just stopped pinning is a dozen pixels: the square crosses
 * the whole section in one wheel notch and sits in the corner for the rest of
 * it. That was the "it does not work at all in How to install Jarvis" the
 * maintainer reported on 2026-08-29.
 */
export interface TrackMeasure {
  /** Document y of the drawn box's top edge. Read only while it is NOT pinned. */
  boxTop: number;
  boxHeight: number;
  /** Document y of the pinning track, or null when the section flows. */
  pinTop: number | null;
  /** The pinning track's height. Meaningless when `pinTop` is null. */
  pinHeight: number;
  /**
   * Where the pinned child comes to REST, in viewport pixels from the top of
   * the window, and how tall it is while it is held there.
   *
   * THESE TWO USED TO BE `0` AND `window.innerHeight`, and that was true only
   * while every pinned child was `top: 0; height: 100svh`. The sections stand
   * under the fixed nav now — `top: var(--nav-height)`, `--section-height`
   * tall, see layout.css § "Section heights" — so the pin STARTS one nav
   * further down the page and lasts `2 x --nav-height` longer than the window
   * would say. Assume the window and the square walks a section 152px shorter
   * than the one the reader is scrolling: it reaches the closing corner at 94%
   * and stands there for the rest, which is precisely the "not keeping up" the
   * schedule was written to fix.
   *
   * Both are meaningless when `pinTop` is null.
   */
  pinRest: number;
  pinBox: number;
  /** Whether a rule closes this section — which line it hands over on. */
  end: TrackEnd;
  /**
   * Document y of the DRAWN line this section hands the square over on, or
   * null when the page draws nothing at that joint.
   *
   * It is not always this box's own bottom edge, and that is the whole point.
   * The joint between two sections carries exactly one line, and either side
   * may be the one drawing it: an ordinary section closes on its own rule, but
   * `Clis` draws nothing under itself and the voice section below opens on its
   * pinned frame's rule an inset further down. Measured against the box's own
   * bottom, the square turned the corner 80px above a line the reader can see
   * and then walked straight past the line itself — "da sollte es eigentlich
   * nach links abbiegen, man geht dann einfach geradeaus weiter" (maintainer,
   * 2026-08-29).
   */
  cross: number | null;
}

/**
 * The middle of the band the square lives in, as a share of the window's
 * height.
 *
 * THE SQUARE MARKS THE READER, NOT THE TOP OF THE WINDOW. Everything used to be
 * measured against `scrollY` alone, which is the same as measuring against the
 * window's top edge — so every hand-over from one section to the next happened
 * on the first row of pixels on the screen, behind the fixed nav, with half the
 * square cut off by the edge. The maintainer's ask on 2026-08-29 was plain:
 * "du machst halt, dass es mit dem User ungefähr immer auf einer Höhe ist".
 *
 * A little above the middle of the window is where the eye sits while reading a
 * screen, and it leaves room on both sides for the band below.
 */
export const READING_SHARE = 0.42;

/**
 * What crossing a rule costs in scrolling, as a share of the window's height —
 * which is also, exactly, how tall the band is.
 *
 * THE TWO ARE THE SAME NUMBER AND THEY CANNOT BE SEPARATED. While the square is
 * crossing it is ON the rule, and the rule travels one pixel up the window for
 * every pixel the reader scrolls — so a crossing that lasts N pixels of scroll
 * moves the square N pixels up the screen, and the rail before it has to have
 * spent those same N pixels drifting down to meet it. Ask for a crossing that
 * costs nothing and you get one that is over in a single wheel notch; ask for
 * one that never leaves a fixed height and you get no crossing at all.
 *
 * IT IS A THIRD OF THE WINDOW BECAUSE THE COLUMN IS ABOUT FOUR TIMES THAT WIDE.
 * At 0.32 the square travels roughly three pixels across for every pixel the
 * reader scrolls, which the eye can follow. The first version of this spent a
 * eleven-hundredths of the window on it, and 1216px of column in 112px of
 * scroll is one wheel notch for the whole width: "auf der Linie TPt einfach
 * dieses komische Ding komplett fast rüber" (maintainer, 2026-08-29).
 *
 * AND THE DRIFT DOWN THE RAIL IS SPREAD OVER THE WHOLE SECTION, not over a
 * short approach before the corner. Same distance, a tenth of the speed, and
 * the whole movement reads as one line rather than as a hop onto the rule and
 * a flick across it — "es hebt ab von der Linie und dann kippt es um".
 *
 * Capped at half a section's own scrolling, so the two legs of a short band
 * stay in proportion to each other.
 */
export const CROSSING_SHARE = 0.32;

/**
 * When one section owns the square, and when it hands it on.
 *
 * `enter`..`leave` is the stretch of scrolling the square spends on this
 * section. `hand` is where the NEXT one takes over, and it is never earlier
 * than `leave`: what lies between the two is dead scrolling that belongs to no
 * section's box, and the square crosses it rather than parking in a corner.
 *
 * `pinned` says which of the two shapes this section has, because they are read
 * differently and a reader can tell them apart on sight. A FLOWING section
 * scrolls past: the square holds the reading line on this section's rail and
 * only leaves it to turn the corner. A PINNED one stops under the reader: the
 * page stands still, so the square walks the frame's whole perimeter over the
 * scrolling the pin costs — which is the one the maintainer signed off on
 * ("bei einer Sektion, wo man stehen bleibt, da funktioniert es perfekt",
 * 2026-08-29) and which is left exactly as it was.
 */
export interface TrackSpan {
  enter: number;
  leave: number;
  hand: number;
  pinned: boolean;
  /** What this section's corner costs in scrolling, and how tall its band is. */
  crossing: number;
  /** Document y of the line this section turns the corner on, or null. */
  cross: number | null;
}

/**
 * The whole page's schedule for the square: who owns it, and from where to
 * where, in document scroll positions.
 *
 * WHY A SCHEDULE AND NOT A TEST PER FRAME. The old loop asked every section
 * every frame whether it had crossed the top of the window. That is a dozen
 * forced layout reads a frame for an answer that only changes when the page is
 * resized. Computed once, the schedule is read with a comparison instead.
 *
 * EVERY POSITION IS MEASURED AGAINST THE READING LINE, not against the top of
 * the window. A flowing section takes the square when its opening edge reaches
 * that line and hands it on when the line it closes over reaches it — so what
 * the square marks is the section the reader is LOOKING at, and every hand-over
 * happens in plain sight in the middle of the screen instead of on the first
 * row of pixels behind the nav.
 *
 * WHY THE SPANS ARE FORCED TO TILE. Boxes do not: a band is held
 * `--section-inset` inside its section, a pinned frame stops a whole viewport
 * before its track does, and the hero's box ends 80px above the logo strip's
 * opening rule. Left alone, the square reaches a corner, waits out the gap and
 * then jumps to wherever the next box starts. Handing over on `hand` — the next
 * section's `enter` — is what makes the square move continuously all the way
 * down the page. Both ends of every gap sit on the SAME rail at the SAME
 * height, because that is what the serpentine and the reading line together
 * guarantee, so there is nothing to see at the joint at all.
 *
 * `maxScroll` is the document's own last scroll position, and it closes the
 * last section: its rule can never reach the reading line, because the page
 * runs out first.
 */
export const scheduleTracks = (
  measures: readonly TrackMeasure[],
  viewport: number,
  maxScroll: number,
): TrackSpan[] => {
  const bounded = (value: number) => Math.max(0, Math.min(maxScroll, value));
  const reading = viewport * READING_SHARE;

  /* The pin lasts until the track's BOTTOM reaches the line the child rests on
   * plus the child's own height — so it is the track minus the child, not the
   * track minus the window, and it starts one `pinRest` before the track
   * reaches the top of the window.
   *
   * Worked out FIRST and without the band, because how much room a section has
   * for its corner depends on where the section below starts, and that cannot
   * be answered while every `enter` is still being decided. */
  const base = measures.map((measure) => {
    const pin = measure.pinTop === null ? 0 : measure.pinHeight - measure.pinBox;
    const pinned = measure.pinTop !== null && pin > 0;
    const closes = measure.cross ?? measure.boxTop + measure.boxHeight;
    return {
      pin,
      pinned,
      closes,
      boxTop: measure.boxTop,
      cross: measure.cross,
      opens: pinned ? (measure.pinTop as number) - measure.pinRest : measure.boxTop - reading,
    };
  });

  const spans = base.map((at, i): TrackSpan => {
    /* THE CORNER GETS WHICHEVER IS THE MORE GENEROUS: half of the section's own
     * scrolling, or half of everything until the next section takes over. The
     * second is what saves a short band — the logo strip is 331px tall and the
     * column is 1216px wide, so on its own height alone the square would still
     * be crossing the whole width in a wheel notch and a half. The dead
     * scrolling between two sections costs nothing to spend. */
    const next = base[i + 1];
    const room = (next ? next.opens : maxScroll) - at.opens;
    const own = at.closes - at.boxTop;
    const crossing = at.pinned
      ? 0
      : Math.min(viewport * CROSSING_SHARE, Math.max(own, room) / 2);
    /* The band is the crossing, so the square starts each section half a
     * crossing ABOVE the reading line, drifts down to half a crossing below it
     * over the rail, and comes back up the same distance riding the rule. The
     * band is therefore centred on the reading line rather than hanging off it. */
    const rides = reading - crossing / 2;
    const enter = at.pinned ? at.opens : at.boxTop - rides;
    const leave = at.pinned ? enter + at.pin : at.closes - rides;
    return {
      enter: bounded(enter),
      leave: bounded(leave),
      hand: bounded(leave),
      pinned: at.pinned,
      crossing,
      cross: at.cross,
    };
  });

  /* IN ORDER, WHATEVER THE MEASUREMENTS SAY. A pinned section's `enter` is its
   * track's, a flowing one's is its box's less the reading line, and the two
   * are not the same yardstick — so the sequence has to be made monotonic here
   * rather than assumed. Out of order, the scan that names the owner ("the last
   * section the reader has entered") would skip one entirely. */
  for (let i = 1; i < spans.length; i++) {
    spans[i].enter = Math.max(spans[i].enter, spans[i - 1].enter);
  }

  for (let i = 0; i < spans.length; i++) {
    const next = spans[i + 1];
    /* The last section hands over to the end of the document, and nothing
     * overlaps: a box that starts before its predecessor's own span is done
     * shortens that span rather than fighting it for the square. */
    const hand = next ? Math.max(spans[i].enter, next.enter) : maxScroll;
    spans[i].leave = Math.min(Math.max(spans[i].enter, spans[i].leave), hand);
    spans[i].hand = hand;
  }

  return spans;
};
