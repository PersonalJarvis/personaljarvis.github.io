# Dither relief

> **Internal term.** The black-and-white, rastered 3D look of the mark: a form
> that reads as solid, dissolved into a fine grid of dots.
>
> Used by more than one section. This file is the only source for the recipe.

---

## What makes the effect

A dither turns **brightness into dot density**: dark areas get many dots, light
areas few.

The solidity therefore comes **not from the raster but from the brightness
gradient underneath it**. The raster only makes that gradient visible.

### Why the flat logo PNG is not enough

A single-colour logo has no gradient. Rastered, it gives a flat silhouette in
dots — no relief.

**An intermediate step is mandatory.** Without a shaded source the asset is
rejected, however cleanly the dither ran.

---

## Pipeline

### Step 1 — produce a shaded source

**Preferred: Blender.**

1. Import the logo as SVG, not PNG — the contour is what is needed
2. `Extrude` to about 0.2 of the form's height, with a light bevel
3. Camera **orthographic**, frontal to slightly turned
4. **One** area light from the upper left front, plus a weak fill from the
   right. No HDRI, no reflections
5. Material: matte white, high `Roughness`
6. Render as a greyscale PNG, at least 2000px on the long edge, transparent or
   white background

**Without 3D:** a linear gradient plus an inner shadow on the form in Figma.
Flatter, but usable.

The light must be **close**. Distance falloff is what lays a gradient across
the front face; a distant light returns one flat tone and the raster comes out
at constant density, which fails the acceptance list below. In a real-time
scene this is why the key is a spot or a point light and never a directional
one — parallel rays have no falloff at all.

### Step 2 — raster

```bash
# Standard — a fine dot grid
magick relief.png -colorspace gray -ordered-dither o8x8 dither-relief.png

# Coarser, more visible dots
magick relief.png -colorspace gray -ordered-dither o4x4 dither-relief.png

# A line screen instead of dots
magick relief.png -colorspace gray -ordered-dither h8x8a dither-relief.png
```

Produce all three, compare them side by side, choose one. The chosen variant
then governs **every** dither-relief asset on the site — no mixing.

**Chosen: `o4x4`, one cell per CSS pixel** (maintainer, 2026-08-29).

Two adjustments the bare command does not make, and both are load-bearing:

- **Raster at the display size.** A dither is a per-pixel pattern. Rastering at
  2400px and letting the browser scale it down destroys the pattern and
  produces exactly the moire this file forbids.
- **Negate first, and bake the dots as ink on transparency.** A dither puts
  dots where the image is dark, so an un-negated raster is black dots on white
  — a white block on a page whose floor is `--canvas`. Negated, the dots land
  where the relief is lit. A CSS `filter: invert()` is not an alternative; see
  *Forbidden*.

### Step 3 — store

- As PNG under `public/brand/`
- A 1-bit raster compresses excellently as PNG. **Never** save it as JPEG or
  lossy WebP — the compression destroys the grid
- A second resolution for `@2x`

---

## Acceptance

An asset is usable only when:

- [ ] at least three distinguishable brightness zones are readable (front face,
      edge, shadow side)
- [ ] dot density **varies** within a surface rather than being constant
- [ ] the dots are individually visible at display size, but not so coarse that
      the form falls apart
- [ ] the image is pixel-sharp at 1:1, not interpolated

If dot density is uniform across the whole form, the source was flat. Back to
step 1.

Measure the last one rather than eyeballing it: sample density in tiles that
lie wholly inside the silhouette and compare the spread. A flat source returns
one number repeated.

---

## Display

```css
.dither-relief {
  image-rendering: pixelated; /* no smoothing when scaled */
}
```

- Fixed `width`/`height`, never `fill`
- **Whole-number scale steps only** (100%, 50%). Fractional factors produce
  moire
- Keep it monochrome. No gradients, no glow, no colour filters
- Purely decorative: `aria-hidden="true"`

---

## Baked, not real time

Dither-relief assets are **finished PNGs**. No WebGL, no canvas shader, no
three.js.

Real time is justified in exactly one case: when the form has to move or react
to scroll. For a still image on a landing page it costs load time and a
dependency for nothing.

**That case is now live.** The mark in `Install.astro` turns, so it is a real
scene with the raster applied as a screen-space pass —
`src/components/mark/`. Everything else in this file still holds there: the
orthographic camera, one close key light with a weak fill, no environment map,
no colour in the raster, and the same `o4x4` matrix, read out of ImageMagick's
own `thresholds.xml` so the live raster is the same dither and not a lookalike.

Running the raster in **screen space** is what keeps the dot grid still while
the form turns underneath it. A grid that rotated with the object would read as
moving moire.

---

## Forbidden

- Rastering a flat, unshaded logo directly
- A dither on line art or text — thin lines fall apart (see
  [`section-3-voice.md`](section-3-voice.md))
- Lossy compression on a rastered asset
- Mixing threshold matrices on one page
- Colour inside the raster. Accents sit as a separate layer over it, never in
  the rastered image itself
- Smoothing through scaling without `image-rendering: pixelated`
- A directional light as the key. It has no distance falloff, so the front face
  comes back flat and the raster fails the acceptance list
