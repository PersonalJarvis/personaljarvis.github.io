/**
 * The raster, as a screen-space pass.
 *
 * A dither turns brightness into dot density. Running it in screen space —
 * rather than baking it into the mark's texture — is what keeps the dot grid
 * still while the form turns underneath it, which is the whole look. A grid
 * that rotated with the object would read as a moving moire.
 *
 * The threshold matrix is ImageMagick's own, read out of its thresholds.xml,
 * so the live raster is the same dither as `magick -ordered-dither o4x4` and
 * not a lookalike. See docs/DITHER-RELIEF.md.
 */

import {
  DataTexture,
  NearestFilter,
  RGBAFormat,
  RepeatWrapping,
  type Texture,
} from "three";

/** Ordered 4x4 (dispersed). Values run 1..16; the threshold is v / 17. */
const O4X4 = {
  size: 4,
  divisor: 17,
  values: [1, 9, 3, 11, 13, 5, 15, 7, 4, 12, 2, 10, 16, 8, 14, 6],
} as const;

/**
 * A repeating texture rather than a uniform array: the cell lookup is then one
 * sample with no dynamic indexing, which every WebGL target supports.
 */
export function thresholdTexture(): Texture {
  const { size, divisor, values } = O4X4;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Flip the row order: gl_FragCoord counts up from the bottom while the
      // matrix is written top row first.
      const v = values[(size - 1 - y) * size + x] / divisor;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(v * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export const MATRIX_SIZE = O4X4.size;

export const DITHER_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Ink where the shaded scene is brighter than this pixel's threshold, nothing
 * anywhere else. The scene's own alpha is carried through, so the silhouette
 * keeps the multisampled edge instead of being cut to a staircase.
 */
export const DITHER_FRAGMENT = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uMatrix;
  uniform float uMatrixSize;
  uniform float uCell;
  uniform vec3 uInk;
  varying vec2 vUv;

  void main() {
    vec4 src = texture2D(uScene, vUv);
    if (src.a < 0.02) discard;

    float lum = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));
    float threshold = texture2D(uMatrix, gl_FragCoord.xy / (uCell * uMatrixSize)).r;
    if (lum < threshold) discard;

    gl_FragColor = vec4(uInk, src.a);
  }
`;
