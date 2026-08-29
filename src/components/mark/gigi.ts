/**
 * The Jarvis mark as geometry, in the 256-unit viewBox the app draws it in.
 *
 * Every coordinate here is lifted from the running app's mascot component, so
 * the site and the product carry one mark rather than two that drifted: the
 * outline, the arms, the eyes and mouth, the pupils inside them, the two
 * scanlines, the displacement slices beside the eyes and the loose glitch
 * pixels either side of the body. `y` is negated throughout because SVG counts
 * downwards and three.js does not.
 *
 * Kept apart from the component so the numbers can be read without wading
 * through renderer setup, and so a change to the mark is one file.
 *
 * ## Ink and paper invert the drawing, on purpose
 *
 * The raster turns brightness into dot density, so on this page black is not a
 * colour — it is absent ink, a hole in the dots. The drawing has a black body
 * with light eyes and a light pupil dot; the relief has a paper body with the
 * eyes cut into it as holes. Reading a feature across therefore means swapping
 * which side is which: what the drawing paints light on dark becomes a raised
 * paper detail inside a dark socket. The face keeps its structure — socket,
 * pupil, mouth — while the page keeps one material logic.
 */

import {
  BoxGeometry,
  ExtrudeGeometry,
  QuadraticBezierCurve3,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from "three";

/** The body spans y 36..208 in the source drawing. */
export const SVG_HEIGHT = 172;

/**
 * Deep enough that the mark still reads as a solid object when the turn
 * carries it past its own edge. A shallower slab flickers into a line there.
 */
const DEPTH = 0.3 * SVG_HEIGHT;
const BEVEL = 0.026 * SVG_HEIGHT;

/**
 * ExtrudeGeometry with a bevel spans z from -bevelThickness to
 * depth + bevelThickness, not from zero. Everything placed inside or across
 * the body measures from these two.
 */
const Z_BACK = -BEVEL;
const Z_FRONT = DEPTH - BEVEL;

/** Mid-depth: where anything that grows out of the body's side belongs. */
const Z_MID = (Z_BACK + Z_FRONT) / 2;

/** How far the eyes and mouth stand out of the face. */
const PROUD = 0.5;

/**
 * The face sinks less than half way in. It is a front-only feature: the mark
 * has one face, so the back of the turn shows a blank body — which is what the
 * maintainer asked for and also how a real relief behaves.
 */
const ACCENT_DEPTH = 0.45 * DEPTH;

/** The face of every sunk accent, and the floor they are sunk to. */
const ACCENT_FRONT = Z_FRONT + PROUD;
const ACCENT_FLOOR = ACCENT_FRONT - ACCENT_DEPTH;

/**
 * How far a pupil stands out of the socket around it. Less than `PROUD`: it is
 * a bead sitting in a hole, not a second slab, and the ring of black left
 * around it is what makes the eye read as an eye rather than a dot.
 */
const PUPIL_PROUD = 0.35;

/**
 * Wider than the drawing's 5.5 stroke. A flat stroke and a round bar do not
 * read at the same weight: the bar loses half its width to its own shading, so
 * matching the drawing literally would give the mark two wires.
 */
const ARM_RADIUS = 4.6;

function bodyShape(): Shape {
  const s = new Shape();
  s.moveTo(58, -90);
  s.quadraticCurveTo(58, -36, 128, -36);
  s.quadraticCurveTo(198, -36, 198, -90);
  s.lineTo(198, -208);
  s.lineTo(180, -186);
  s.lineTo(160, -208);
  s.lineTo(140, -186);
  s.lineTo(120, -208);
  s.lineTo(100, -186);
  s.lineTo(80, -208);
  s.lineTo(58, -186);
  s.closePath();
  return s;
}

function ellipseShape(cx: number, cy: number, rx: number, ry: number): Shape {
  const s = new Shape();
  s.absellipse(cx, -cy, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
}

/** A rectangle from the drawing's own top-left origin, width and height. */
function rectShape(x: number, y: number, w: number, h: number): Shape {
  const s = new Shape();
  s.moveTo(x, -y);
  s.lineTo(x + w, -y);
  s.lineTo(x + w, -(y + h));
  s.lineTo(x, -(y + h));
  s.closePath();
  return s;
}

/**
 * Reaching further out than the drawing does. In 2D the arms are legible
 * because nothing sits in front of them; in 3D the body's own bevelled edge
 * eats a stub that short, and at any angle of turn the arm disappears behind
 * the silhouette. The extra reach is what keeps them arms rather than slivers.
 */
const ARMS: [number, number, number, number, number, number][] = [
  [58, 138, 26, 148, 30, 170],
  [198, 138, 230, 148, 226, 170],
];

/**
 * The body's flat front face is narrower than its outline by the bevel on each
 * side: the bevel is the roll from the face down to the flank, so anything laid
 * on the face and taken all the way to the outline hangs off the roll into
 * open air. Only the scanlines are wide enough to care — the eyes, mouth and
 * slices all sit well inside — but they span the full width in the drawing, so
 * they are the ones that get inset.
 */
const FACE_LEFT = 58 + BEVEL;
const FACE_RIGHT = 198 - BEVEL;

/**
 * The two bars across the body, at the drawing's own heights and weights. They
 * read as grooves rather than stripes here: sunk with the rest of the face,
 * they lose their dots entirely and cut the raster into bands, which is the
 * same reading the light bars give on the dark drawing.
 */
const SCANLINES: [number, number][] = [
  [132, 2.4],
  [160, 1.4],
];

/**
 * The pair of blocks flanking the eyes — the drawing calls them chromatic
 * displacement slices, and they are most of what makes the face read as a
 * screen rather than a smiley.
 */
const SLICES: [number, number, number, number][] = [
  [64, 118, 18, 10],
  [170, 118, 18, 10],
];

/**
 * The loose pixels either side of the body, and the one place the drawing's
 * numbers are not copied exactly: `[197, 168]` kisses the body's edge at x 198.
 * Flat on a page that reads as a pixel breaking off the silhouette; at mid
 * depth in a solid it is a chip buried inside the body with a corner poking
 * out. It is moved three units clear, to 200.
 *
 * They take the PAPER material, not the accent. A black chip on a page whose
 * floor is also unprinted would be invisible — these are the drawing's light
 * pixels, so here they are the ones that keep their dots.
 */
const GLITCH: [number, number, number, number][] = [
  [200, 104, 6, 6],
  [208, 128, 4, 4],
  [202, 146, 9, 3],
  [200, 168, 3, 5],
  [206, 176, 5, 3],
  [44, 96, 6, 4],
  [48, 124, 4, 6],
  [40, 148, 8, 3],
  [50, 170, 3, 5],
];

/**
 * Chips, not plates. A glitch pixel extruded as thin as it is small vanishes
 * to a hairline every time the turn brings it side-on, which reads as a
 * flicker rather than as a shape; a chunk this deep stays a chip all the way
 * round.
 */
const GLITCH_DEPTH = 6;

/**
 * The beads inside the two sockets and the mouth. Off-centre in the drawing —
 * down and slightly out — and left that way: a pupil dead in the middle of its
 * socket is a button, an off-centre one is a look.
 */
const PUPILS: [number, number, number, number][] = [
  [104, 112, 4, 6],
  [156, 112, 4, 6],
  [128, 146, 3, 5],
];

export interface MarkParts {
  /** Body, arms, pupils and glitch chips — everything on the paper material. */
  paper: BufferGeometry[];
  /** Eyes, mouth, slices and scanlines — everything on the black material. */
  accent: BufferGeometry[];
  /** Where the body's own bounding box sits, for framing and normalising. */
  bodyIndex: number;
}

/** Sink a face feature into the front of the body, proud by `PROUD`. */
function sunkAccent(shape: Shape): BufferGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth: ACCENT_DEPTH,
    bevelEnabled: false,
    curveSegments: 40,
  });
  g.translate(0, 0, ACCENT_FLOOR);
  return g;
}

/**
 * Build every piece of the mark. Positions are baked into the geometry rather
 * than set on meshes, so the caller has one list to centre, scale and dispose.
 */
export function buildMark(): MarkParts {
  const body = new ExtrudeGeometry(bodyShape(), {
    depth: DEPTH - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    // Ten, not four. The bevel is the roll between the front face and the
    // flank, and it is where the turn is read — four segments render it as
    // four flat facets, which at the size the mark is drawn now come out as a
    // panel with straight edges pasted onto the corner. Ten reads as a roll.
    // It costs vertices once, at build time, and nothing per frame.
    bevelSegments: 10,
    curveSegments: 32,
  });

  const paper: BufferGeometry[] = [body];

  for (const [x0, y0, cx, cy, x1, y1] of ARMS) {
    const curve = new QuadraticBezierCurve3(
      new Vector3(x0, -y0, 0),
      new Vector3(cx, -cy, 0),
      new Vector3(x1, -y1, 0),
    );

    const tube = new TubeGeometry(curve, 24, ARM_RADIUS, 16, false);
    tube.translate(0, 0, Z_MID);
    paper.push(tube);

    for (const end of [curve.v0, curve.v2]) {
      const cap = new SphereGeometry(ARM_RADIUS, 20, 14);
      cap.translate(end.x, end.y, Z_MID);
      paper.push(cap);
    }
  }

  // Sockets first, then the bars — order is only for reading; every one of
  // them takes the same material and the same depth.
  const accent: BufferGeometry[] = [
    ellipseShape(102, 108, 10, 14),
    ellipseShape(154, 108, 10, 14),
    ellipseShape(128, 146, 7, 10),
    ...SLICES.map(([x, y, w, h]) => rectShape(x, y, w, h)),
    ...SCANLINES.map(([y, h]) => rectShape(FACE_LEFT, y, FACE_RIGHT - FACE_LEFT, h)),
  ].map(sunkAccent);

  /**
   * The pupils, standing on the floor of their own sockets rather than
   * floating in them. It costs nothing — the extrusion simply starts deeper —
   * and it is the difference between a bead in a hole and a disc hanging in
   * mid-air once the turn lets the viewer see into the socket from the side.
   */
  for (const [cx, cy, rx, ry] of PUPILS) {
    const g = new ExtrudeGeometry(ellipseShape(cx, cy, rx, ry), {
      depth: ACCENT_DEPTH + PUPIL_PROUD,
      bevelEnabled: false,
      curveSegments: 32,
    });
    g.translate(0, 0, ACCENT_FLOOR);
    paper.push(g);
  }

  for (const [x, y, w, h] of GLITCH) {
    const chip = new BoxGeometry(w, h, GLITCH_DEPTH);
    chip.translate(x + w / 2, -(y + h / 2), Z_MID);
    paper.push(chip);
  }

  return { paper, accent, bodyIndex: 0 };
}
