/**
 * The Jarvis mark as geometry, in the 256-unit viewBox the app draws it in.
 *
 * The outline, the eyes, the mouth and the arms are the same coordinates the
 * running app's mascot component uses, so the site and the product carry one
 * mark rather than two that drifted. `y` is negated throughout because SVG
 * counts downwards and three.js does not.
 *
 * Kept apart from the component so the numbers can be read without wading
 * through renderer setup, and so a change to the mark is one file.
 */

import {
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

/** How far the eyes and mouth stand out of the face. */
const PROUD = 0.5;

/**
 * The face sinks less than half way in. It is a front-only feature: the mark
 * has one face, so the back of the turn shows a blank body — which is what the
 * maintainer asked for and also how a real relief behaves.
 */
const ACCENT_DEPTH = 0.45 * DEPTH;

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

export interface MarkParts {
  /** Extruded body plus both arms — everything that takes the paper material. */
  paper: BufferGeometry[];
  /** Eyes and mouth — everything that takes the black material. */
  accent: BufferGeometry[];
  /** Where the body's own bounding box sits, for framing and normalising. */
  bodyIndex: number;
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
    // Mid-depth, so an arm grows out of the body's side rather than being
    // stuck to one of its faces.
    const zMid = (Z_BACK + Z_FRONT) / 2;

    const tube = new TubeGeometry(curve, 24, ARM_RADIUS, 16, false);
    tube.translate(0, 0, zMid);
    paper.push(tube);

    for (const end of [curve.v0, curve.v2]) {
      const cap = new SphereGeometry(ARM_RADIUS, 20, 14);
      cap.translate(end.x, end.y, zMid);
      paper.push(cap);
    }
  }

  const accent: BufferGeometry[] = [
    ellipseShape(102, 108, 10, 14),
    ellipseShape(154, 108, 10, 14),
    ellipseShape(128, 146, 7, 10),
  ].map((shape) => {
    const g = new ExtrudeGeometry(shape, {
      depth: ACCENT_DEPTH,
      bevelEnabled: false,
      curveSegments: 40,
    });
    g.translate(0, 0, Z_FRONT + PROUD - ACCENT_DEPTH);
    return g;
  });

  return { paper, accent, bodyIndex: 0 };
}
