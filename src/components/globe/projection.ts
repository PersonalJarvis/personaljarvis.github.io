/**
 * The maths behind the globe: a sphere seen from one fixed viewpoint.
 *
 * There is no 3D engine here and no WebGL. The globe is a few thousand squares
 * whose positions are worked out per frame and drawn onto an ordinary 2D
 * canvas, which is what gives the dots their hard pixel edges — a rasterised
 * WebGL sphere fights its own antialiasing to look this crisp, and loses.
 * It also means the section cannot fail the way a WebGL scene fails: there is
 * no context to lose.
 *
 * ## The projection
 *
 * Orthographic — parallel rays, no perspective taper. Same choice, and the
 * same reason, as the turning mark in `src/components/mark/`: a form drawn
 * with a perspective camera reads as a photograph of an object, and this is
 * meant to read as a diagram of one.
 *
 * ## The viewpoint
 *
 * The camera sits a little north of the equator and looks at the centre of the
 * sphere. That single number is what makes the globe look considered rather
 * than like a spinning icon: dead-on at the equator, the latitude rows come
 * out as straight lines and the sphere reads as a circle with a pattern on it.
 * Tilted, the rows curve, the pole comes into view, and the eye reads a ball.
 *
 * Above roughly 30° the north pole swings toward the middle of the picture and
 * the continents crowd into the lower half; below about 10° the curve is too
 * slight to register. 18° is measured off the reference the maintainer chose.
 */

/** Camera latitude, degrees north. The viewpoint, and the one number to tune. */
export const TILT_DEGREES = 18;

const DEG = Math.PI / 180;
const TILT = TILT_DEGREES * DEG;
const SIN_TILT = Math.sin(TILT);
const COS_TILT = Math.cos(TILT);

/**
 * Where the light is, in the same space as the sphere.
 *
 * Overhead, a little to the left, and toward the viewer. Fixed in the world
 * while the globe
 * turns beneath it, so the bright side stays where it is and the continents
 * travel through it — the same rule the dither-relief recipe sets out for the
 * mark. A light that turned with the globe would light every continent
 * identically and the sphere would flatten out.
 */
const LIGHT = normalise3(-0.25, 0.55, 0.8);

function normalise3(x: number, y: number, z: number) {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
}

export interface Projected {
  /** Screen x, in the same units as the radius passed in. */
  x: number;
  /** Screen y. */
  y: number;
  /** Depth toward the viewer, -1 to 1. Anything at or below 0 faces away. */
  z: number;
  /** How lit this point is, 0 to 1. */
  light: number;
}

/**
 * Put one lat/lon on the screen.
 *
 * `spin` is the rotation about the earth's own axis, in radians; feeding it a
 * clock is what makes the globe turn. The caller passes the sine and cosine of
 * the spin rather than the angle, because in the hot loop it is the same two
 * values for every one of several thousand points and computing them per point
 * is most of the frame.
 */
export function project(
  sinLat: number,
  cosLat: number,
  sinLon: number,
  cosLon: number,
  sinSpin: number,
  cosSpin: number,
  cx: number,
  cy: number,
  radius: number,
): Projected {
  // Rotate about the polar axis: the angle-addition identities, so the
  // per-point sines and cosines can be precomputed once and reused forever.
  const sl = sinLon * cosSpin + cosLon * sinSpin;
  const cl = cosLon * cosSpin - sinLon * sinSpin;

  const x = cosLat * sl;
  const y = sinLat;
  const z = cosLat * cl;

  // Tilt the whole world so the camera's latitude lands in the middle.
  const ty = y * COS_TILT - z * SIN_TILT;
  const tz = y * SIN_TILT + z * COS_TILT;

  return {
    x: cx + x * radius,
    y: cy - ty * radius,
    z: tz,
    // The surface normal of a unit sphere IS the point, so the diffuse term is
    // one dot product and no square roots.
    light: Math.max(0, x * LIGHT.x + ty * LIGHT.y + tz * LIGHT.z),
  };
}

/**
 * How opaque a land dot is: its lighting, plus a fade toward the rim.
 *
 * THE RIM FADE MUST REACH ZERO. Orthographic projection crowds a whole
 * hemisphere's worth of longitudes into the last few pixels before the
 * silhouette, so whatever value the dots hold there, they hold it hundreds of
 * times over in a very small space. Held at even a fifth of full strength —
 * which is what a floor term does, and the first version of this function had
 * one — that crowd fuses into a bright wire hoop around the globe, and the eye
 * takes the hoop for the subject. Removing the floor removed the hoop.
 *
 * The same fix settled a second thing that looked unrelated. A grid of one
 * cell per degree is one cell per 111 km at the equator and one per 2 km near
 * the pole, so the arctic came out as a solid white band and the globe wore a
 * hat. That looked like a sampling problem and was answered as one — stepping
 * longitude by 1/cos(latitude) to even the spacing out — which fixed the band
 * and left visible radial streaks where the step changed. It was never a
 * sampling problem. The arctic sits where z is falling and the crowd was only
 * bright for the same reason the rim was; with the fade reaching zero, the
 * plain grid reads as density, which is what the north of a globe should look
 * like. The stepping was deleted. Do not reintroduce it.
 */
export function dotAlpha(light: number, z: number): number {
  // The ambient term is high for a lighting model and low for a drawing. This
  // is a drawing: the unlit half of a real sphere is black, and a continent
  // that disappears because of where the sun is would be a map with a bug in
  // it. A third of full strength keeps every landmass legible, and the other
  // two thirds still carry the roundness.
  const lit = 0.3 + 0.7 * light;
  return lit * Math.pow(Math.max(0, z), 0.6);
}

/** Land cells, unpacked from the committed bitmask into a form the loop likes. */
export interface DotField {
  count: number;
  sinLat: Float32Array;
  cosLat: Float32Array;
  sinLon: Float32Array;
  cosLon: Float32Array;
  /** Grid coordinates, kept only so a small globe can draw every Nth cell. */
  row: Uint16Array;
  col: Uint16Array;
}

/**
 * Draw every Nth row and column, when the grid is finer than the pixels.
 *
 * The dot spacing is fixed in degrees and the globe's size is not, so on a
 * small screen the rows land closer together than a dot is wide and the map
 * fuses into a grey disc. This is NOT the polar thinning that was removed —
 * that varied by latitude and left radial streaks. This is uniform, it depends
 * only on how many pixels there are to draw into, and on any ordinary screen
 * it returns 1 and does nothing.
 *
 * A phone at device-pixel-ratio 3 has plenty of pixels and comes out at 1 as
 * well; it is the small, low-density displays that need it.
 */
export function strideFor(radius: number, latCells: number, dot: number) {
  const pitch = (2 * radius) / latCells;
  return Math.max(1, Math.ceil((dot + 1.2) / pitch));
}

/**
 * Turn the base64 land mask into flat arrays of trigonometry.
 *
 * Done once, at mount. Every value in here is constant for the life of the
 * page — only the spin changes — so the per-frame loop is four array reads and
 * a dozen multiplies per dot, and no calls to Math.sin at all.
 */
export function buildDotField(
  base64: string,
  lonCells: number,
  latCells: number,
): DotField {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Per row and per column, not per cell: 180 sines instead of 21 538.
  const rowSin = new Float32Array(latCells);
  const rowCos = new Float32Array(latCells);
  for (let row = 0; row < latCells; row++) {
    const lat = (90 - (row + 0.5) * (180 / latCells)) * DEG;
    rowSin[row] = Math.sin(lat);
    rowCos[row] = Math.cos(lat);
  }
  const colSin = new Float32Array(lonCells);
  const colCos = new Float32Array(lonCells);
  for (let col = 0; col < lonCells; col++) {
    const lon = (-180 + (col + 0.5) * (360 / lonCells)) * DEG;
    colSin[col] = Math.sin(lon);
    colCos[col] = Math.cos(lon);
  }

  let land = 0;
  for (let i = 0; i < lonCells * latCells; i++) {
    if ((bytes[i >> 3] >> (i & 7)) & 1) land += 1;
  }

  const field: DotField = {
    count: land,
    sinLat: new Float32Array(land),
    cosLat: new Float32Array(land),
    sinLon: new Float32Array(land),
    cosLon: new Float32Array(land),
    row: new Uint16Array(land),
    col: new Uint16Array(land),
  };

  let n = 0;
  for (let row = 0; row < latCells; row++) {
    for (let col = 0; col < lonCells; col++) {
      const i = row * lonCells + col;
      if (!((bytes[i >> 3] >> (i & 7)) & 1)) continue;
      field.sinLat[n] = rowSin[row];
      field.cosLat[n] = rowCos[row];
      field.sinLon[n] = colSin[col];
      field.cosLon[n] = colCos[col];
      field.row[n] = row;
      field.col[n] = col;
      n += 1;
    }
  }

  return field;
}

/** The sine and cosine of a lat/lon pair, ready for `project`. */
export function trigOf(latDeg: number, lonDeg: number) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return {
    sinLat: Math.sin(lat),
    cosLat: Math.cos(lat),
    sinLon: Math.sin(lon),
    cosLon: Math.cos(lon),
  };
}
