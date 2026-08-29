#!/usr/bin/env python3
"""Render the section-3 photographs as one-bit pixel dither: ink dots on paper.

Run from the repo root with the two source photographs beside it:

    python scripts/dither-scene.py <manual-src.png> <jarvis-src.png>

It writes src/assets/scene/manual.png and jarvis.png at the dither grid's own
resolution. They are NOT scaled up here: the page scales them with
`image-rendering: pixelated`, so one source dot lands on a whole number of
device pixels instead of being resampled into mush.

Two decisions are worth reading before changing anything.

**The glass gets its own tone curve.** Lifting the room to paper white is what
makes the frame read airy, and it is also what erases the monitor: in the
source photographs the windows sit a few percent apart, pale grey on pale
grey. So everything outside the monitor takes the airy global curve, and the
glass is stretched on its own range.

**Both frames share ONE glass range, measured on the cluttered frame.** Taking
percentiles per frame would stretch the calm screen's sensor noise up to match
the busy one, and quietly erase the difference the whole section is about.

**Dots sit on the BRIGHT parts, not the dark ones.** The page floor is near
black and the dots are near white, so a dot has to mean light. Thresholding the
other way round would print a photographic negative: the window would go solid
and the person would glow.

The palette is baked in rather than left to CSS. A mask would let the page
recolour the dots, but a mask is resampled by the compositor and the crisp
pixel grid is the entire point of the treatment. Re-run this script if the
tokens ever change; that is why it is committed.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

CANVAS = (0x0A, 0x0A, 0x09)  # --canvas
INK = (0xF7, 0xF7, 0xF4)     # --ink

GRID_W = 640                 # dither resolution; the page scales it up
GAMMA = 7.0                  # the page is dark: only the genuinely bright parts get dots
CUTOFF = 4                   # autocontrast clip, percent
SCREEN_GAMMA = 3.0
GLASS_PCT = (4, 96)

#: Fractions of the frame. Both photographs share one camera, so one pair serves both.
GLASS = (0.3125, 0.3102, 0.6458, 0.6944)   # the monitor's glass, bezel excluded
SAMPLE = (0.3125, 0.3102, 0.5990, 0.6944)  # the part of it the head never covers


def bayer(n: int = 8) -> np.ndarray:
    """Ordered threshold matrix. Ordered, not Floyd-Steinberg: error diffusion
    gives an organic grain, and this treatment wants a regular grid."""
    m = np.array([[0, 2], [3, 1]], dtype=float)
    while m.shape[0] < n:
        m = np.block([[4 * m, 4 * m + 2], [4 * m + 3, 4 * m + 1]])
    return (m + 0.5) / m.size


def _box(frac, w: int, h: int):
    return int(frac[0] * w), int(frac[1] * h), int(frac[2] * w), int(frac[3] * h)


def _grey(path: Path):
    im = Image.open(path).convert("L")
    h = round(GRID_W * im.height / im.width)
    return im.resize((GRID_W, h), Image.LANCZOS), h


def glass_range(path: Path) -> tuple[float, float]:
    im, h = _grey(path)
    x0, y0, x1, y1 = _box(SAMPLE, GRID_W, h)
    patch = np.asarray(im, dtype=float)[y0:y1, x0:x1] / 255.0
    return tuple(np.percentile(patch, GLASS_PCT))


def render(path: Path, lo: float, hi: float) -> np.ndarray:
    im, h = _grey(path)
    raw = np.asarray(im, dtype=float) / 255.0
    tone = (np.asarray(ImageOps.autocontrast(im, cutoff=CUTOFF), dtype=float) / 255.0) ** GAMMA

    gx0, gy0, gx1, gy1 = _box(GLASS, GRID_W, h)
    glass = np.clip((raw[gy0:gy1, gx0:gx1] - lo) / max(hi - lo, 1e-6), 0, 1)
    tone[gy0:gy1, gx0:gx1] = glass ** SCREEN_GAMMA

    thr = np.tile(bayer(), (h // 8 + 1, GRID_W // 8 + 1))[:h, :GRID_W]
    return tone > thr


def to_png(ink: np.ndarray) -> Image.Image:
    h, w = ink.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    rgb[...] = CANVAS
    rgb[ink] = INK
    return Image.fromarray(rgb)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2
    manual_src, jarvis_src = Path(argv[1]), Path(argv[2])
    out = Path(__file__).resolve().parent.parent / "src" / "assets" / "scene"
    out.mkdir(parents=True, exist_ok=True)

    lo, hi = glass_range(manual_src)
    print(f"shared glass range {lo:.3f}..{hi:.3f}")
    for name, src in (("manual", manual_src), ("jarvis", jarvis_src)):
        ink = render(src, lo, hi)
        to_png(ink).save(out / f"{name}.png", optimize=True)
        print(f"  {name:7s} {ink.shape[1]}x{ink.shape[0]}  ink {ink.mean() * 100:.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
