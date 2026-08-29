#!/usr/bin/env python3
"""Print the section-3 photographs as a one-bit dither — one on paper, one in ink.

Run from the repo root with the two source photographs beside it:

    python scripts/dither-scene.py <manual-src.png> <jarvis-src.png>

It writes src/assets/scene/manual.png and jarvis.png at the dither grid's own
resolution. They are NOT scaled up here: the page draws them onto a canvas with
smoothing off, so one source dot lands on a whole number of device pixels
instead of being resampled into mush.

THE TWO FRAMES ARE INVERSES OF EACH OTHER, and that is the whole design.

  manual  daylight  -> dark dots on paper   (ground --ink,    dots --canvas)
  jarvis  night     -> light dots on ink    (ground --canvas, dots --ink)

The page floor is the second ground. So the wipe between them does not merely
swap two pictures: it settles the section onto the colour the rest of the site
already stands on, and the state the product is selling is the one that stops
fighting the page. Two tokens do all of it — there is no third colour anywhere
in the treatment.

WHY THE GAMMA IS SOLVED AND NOT SET. A photograph's tone curve decides how many
cells carry a dot, and the two sources here sit two and a half stops apart: the
daylight frame is nearly blown out, the night frame is nearly black. One
hand-tuned exponent cannot serve both, and a pair whose ink coverage differs is
a pair where the wipe reads as the picture getting heavier rather than as the
room changing. So the exponent is bisected per frame until the coverage lands on
COVERAGE, and both frames print at the same weight by construction. That also
means a re-generated photograph does not need the constant re-tuned by hand.

WHY THERE IS NO AUTOCONTRAST. Stretching each frame to the full range is the
obvious move and it destroys the pair: it lifts the night frame into a bright
picture of a dark room, and the section's entire claim is that one of these is
light and the other is not. The exposures are the difference. They are left
alone, and the solved gamma is what keeps the DOT WEIGHT matched without
touching the brightness.

WHY LOCAL CONTRAST. A global curve has nothing left to separate at the ends of
the range, which is exactly where the subject is: the lit monitor is the
brightest thing in both frames, so on the daylight frame it flattens to bare
paper and the windows piled across it — the picture's whole point — disappear.
Subtracting a blurred copy puts the edges back at every brightness, so the
screen keeps its clutter in one frame and its calm in the other. This replaces
an earlier version that carried hand-measured pixel boxes around the monitor
glass; those had to be re-measured every time a photograph was regenerated.

The palette is baked into the PNGs rather than left to CSS. A mask would let the
page recolour the dots, but a mask is resampled by the compositor and the crisp
pixel grid is the entire point. **If the tokens change, re-run this script** —
that is why it is committed.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CANVAS = (0x0A, 0x0A, 0x09)  # --canvas
INK = (0xF7, 0xF7, 0xF4)     # --ink

GRID_W = 720   # dither resolution; the page scales it up with smoothing off

#: Share of cells carrying a dot. Both frames are solved to this, so neither
#: reads as the heavier half of the pair.
#:
#: It is deliberately WELL under half. The mark is the minority on both grounds,
#: so the daylight frame stays a light picture and the night frame a dark one —
#: which is the difference the section is about. Push it toward 0.5 and both
#: frames converge on the same mid-grey mush.
COVERAGE = 0.22

#: Local contrast, as a fraction of the grid width and a gain on the difference.
#: The radius is wide enough to be a lighting gradient rather than an outline,
#: and the gain is under 1 so the result is a lift, not a solarisation.
LOCAL_RADIUS = 0.025
LOCAL_GAIN = 0.85

#: The five hues a coloured dot may take: the app's own agent-timeline tokens,
#: which are the colours the editor in the photograph is actually showing. This
#: is not a third colour smuggled into a two-token treatment — it is the SCREEN,
#: and the screen is the one thing in the room that has a colour of its own.
#:
#: Order is irrelevant; a dot takes whichever of these its own hue is nearest.
STAGE = (
    (0xDF, 0xA8, 0x8F),  # --stage-thinking  peach
    (0x9F, 0xC9, 0xA2),  # --stage-grep      mint
    (0x9F, 0xBB, 0xE0),  # --stage-read      blue
    (0xC0, 0xA8, 0xDD),  # --stage-edit      lavender
    (0xC0, 0x85, 0x32),  # --stage-done      gold
)

#: The scale a line of code lives at, as a fraction of the grid width, and the
#: size of the neighbourhood a screen fills.
#:
#: THESE TWO ARE THE WHOLE DETECTOR, and the pair is what makes it work.
#: `COLOUR_MICRO` is a second high-pass, on the colour STRENGTH this time: it
#: keeps colour that changes from one dot to the next and throws away colour
#: that holds over any distance. That is the difference between syntax colouring
#: and a person — skin, wood and a blue t-shirt are all saturated, but they are
#: saturated smoothly, and a smooth field high-passes to nothing. `COLOUR_REGION`
#: then asks where that micro-colour is DENSE. A compressed photograph rings
#: along every hard edge, so the bezel and the keys each carry a fringe of it;
#: a screen full of code carries an area.
#:
#: Measured against this pair of photographs: 98% of the dots this colours land
#: inside the monitor glass. Every simpler rule tried first put the majority of
#: them on the desk — a saturation threshold puts them on the man's forearm,
#: because skin and a code comment sit at the same saturation.
COLOUR_MICRO = 0.004
COLOUR_REGION = 0.05

#: Ceiling on the share of PRINTED DOTS that may carry a hue.
#:
#: A ceiling rather than a target, and it is usually not the binding constraint:
#: the micro-colour test above runs out of screen first, at about 3% of the dots
#: on the daylight frame and 5% on the night one. It is here so that a
#: photograph with no screen in it at all cannot end up with a coloured room —
#: the quantile would otherwise happily promote the noisiest 15% of anything.
COLOURED = 0.15

#: How far a coloured dot travels from the frame's own mark toward its hue.
#:
#: Not all the way. The mark colour is what makes the daylight frame dark ink on
#: paper and the night frame the exact inverse, and a dot painted in the raw
#: token abandons that: the tokens are all light, so on the paper ground they
#: turn to pastel mush and the screen reads as a hole rather than as a screen.
#: Mixing toward the mark keeps every dot on the right side of its ground and
#: lets the hue be unmistakable anyway.
TINT = 0.80

#: The speech bubble on the night frame, in fractions of the frame: box, then
#: the tail's three points. Empty, with three dots inside — no text, ever.
#:
#: It is DRAWN HERE rather than asked of the image model, for three reasons: a
#: model puts letters in a speech bubble whatever the prompt says, its outline
#: would be dithered into a fuzzy smudge along with everything else, and the
#: position would move every time a photograph is regenerated. Drawn into the
#: dot grid after the halftone, it is exactly two dots thick and lands on the
#: same lattice as the picture.
#:
#: These are measured against the photograph, so REGENERATING THE NIGHT FRAME
#: MEANS RE-MEASURING THEM. The box sits OFF THE MONITOR — top right, over the
#: dark wall above the person's head — with the tail reaching down-left to the
#: microphone. It used to sit on the glass, which was harmless while the screen
#: was a bright smudge and is not now that the screen is what the section is
#: about.
#:
#: The vertical placement has a second constraint that is easy to miss and was
#: measured, not guessed: the page crops this 16:9 frame into a box up to three
#: times as wide as it is tall, anchored at 0.42 of the height. At that crop
#: only rows 0.17..0.75 survive on the shortest window the sticky layout still
#: runs on, and a bubble at 0.15 loses its top edge — which is exactly what the
#: first version did. Keep the box inside 0.19..0.73.
BUBBLE = (0.790, 0.200, 0.952, 0.360)
BUBBLE_TAIL = ((0.815, 0.355), (0.862, 0.355), (0.778, 0.470))
BUBBLE_STROKE = 2  # dots


def bayer(n: int = 8) -> np.ndarray:
    """Ordered threshold matrix. Ordered, not Floyd-Steinberg: error diffusion
    gives an organic grain, and this treatment wants a regular grid — which is
    also what lets the page's wipe dissolve along the same matrix."""
    m = np.array([[0, 2], [3, 1]], dtype=float)
    while m.shape[0] < n:
        m = np.block([[4 * m, 4 * m + 2], [4 * m + 3, 4 * m + 1]])
    return (m + 0.5) / m.size


def solve_gamma(tone: np.ndarray, target: float) -> float:
    """The exponent that brings `tone` to `target` mean coverage.

    `tone ** g` falls monotonically with g, so a plain bisection is exact
    enough in forty steps and needs no derivative.
    """
    lo, hi = 0.05, 24.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if (tone**mid).mean() > target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def blur_grid(values: np.ndarray, radius: float) -> np.ndarray:
    """Gaussian blur of a plain float grid.

    Through 8 bits, because Pillow's Gaussian refuses an "F" image. Everything
    blurred here is compared only against a threshold solved from itself, so a
    256-step ladder loses nothing and the scale factor cancels out of the
    comparison entirely.
    """
    scale = max(float(values.max()), 1e-6)
    small = Image.fromarray(np.round(values / scale * 255).astype(np.uint8))
    return np.asarray(small.filter(ImageFilter.GaussianBlur(radius)), dtype=float) / 255.0 * scale


def local_chroma(path: Path, size: tuple[int, int]) -> np.ndarray:
    """The colour in the photograph that is LOCAL, as an RGB offset per pixel.

    Every photograph of a room has a cast — warm wood, warm skin, a warm lamp —
    and that cast is a smooth field across the whole frame. Subtracting a blurred
    copy of the colour leaves only the colour that changes from one dot to the
    next, which in this scene is the syntax colouring on the screen and nothing
    else. It is the same move `render` makes on tone, and for the same reason: a
    global saturation threshold has to choose between colouring the desk and
    colouring nothing, because the wood and the code sit at the same saturation.
    """
    im = Image.open(path).convert("RGB").resize(size, Image.LANCZOS)
    blur = im.filter(ImageFilter.GaussianBlur(LOCAL_RADIUS * size[0]))
    rgb = np.asarray(im, dtype=float) / 255.0
    low = np.asarray(blur, dtype=float) / 255.0
    return (rgb - rgb.mean(2, keepdims=True)) - (low - low.mean(2, keepdims=True))


def stage_hue(offset: np.ndarray) -> np.ndarray:
    """Index into STAGE for each pixel, by nearest hue.

    Matched as a DIRECTION rather than as an angle: the pixel's colour offset
    and each token's are unit-normalised and compared by dot product, so there
    is no wrap-around to handle at red and no conversion out of RGB. Brightness
    drops out of it, which is what makes a dim blue and a bright one land on the
    same token.
    """
    tokens = np.array(STAGE, dtype=float) / 255.0
    tokens = tokens - tokens.mean(1, keepdims=True)
    tokens /= np.linalg.norm(tokens, axis=1, keepdims=True)

    unit = offset / np.maximum(np.linalg.norm(offset, axis=2, keepdims=True), 1e-6)
    return np.argmax(unit @ tokens.T, axis=2)


def render(path: Path, *, invert: bool) -> tuple[np.ndarray, np.ndarray]:
    """Return two grids: where a dot is printed, and which hue each dot takes.

    The second is an index into STAGE, or -1 for a dot in the frame's own mark
    colour. Almost every dot is -1 — the screen is the exception, and that is
    the whole of the treatment's colour.

    `invert` flips which end of the tone range earns a dot. On the night frame
    dots sit on the LIGHT parts, because the ground is near black and a dot has
    to mean light. On the daylight frame the ground is paper and the same logic
    runs the other way: a dot means shadow. Getting this backwards prints a
    photographic negative — the window goes solid and the person glows.
    """
    im = Image.open(path).convert("L")
    height = round(GRID_W * im.height / im.width)
    im = im.resize((GRID_W, height), Image.LANCZOS)

    blur = im.filter(ImageFilter.GaussianBlur(LOCAL_RADIUS * GRID_W))
    flat = np.asarray(im, dtype=float) / 255.0
    tone = np.clip(flat + LOCAL_GAIN * (flat - np.asarray(blur, dtype=float) / 255.0), 0.0, 1.0)

    if invert:
        tone = 1.0 - tone

    tone = tone ** solve_gamma(tone, COVERAGE)

    threshold = np.tile(bayer(), (height // 8 + 1, GRID_W // 8 + 1))[:height, :GRID_W]
    dots = tone > threshold

    # Which of those dots are on the screen. Two tests, and both are needed —
    # see COLOUR_MICRO above for why neither finds it alone.
    #
    # The floor is solved against the PRINTED DOTS rather than the whole frame:
    # only a dot can carry a colour, so a cell with nothing in it has no vote in
    # where the threshold lands.
    offset = local_chroma(path, (GRID_W, height))
    strength = np.linalg.norm(offset, axis=2)
    micro = np.clip(strength - blur_grid(strength, COLOUR_MICRO * GRID_W), 0.0, None)
    region = blur_grid(micro, COLOUR_REGION * GRID_W)

    printed = region[dots]
    floor = float(np.quantile(printed, 1.0 - COLOURED)) if printed.size else np.inf

    hue = np.full(dots.shape, -1, dtype=int)
    coloured = dots & (micro > 0) & (region > floor)
    hue[coloured] = stage_hue(offset)[coloured]
    return dots, hue


def add_bubble(dots: np.ndarray, hue: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Draw the empty speech bubble into the dot grid.

    Two passes, and both are needed. The FILL clears its dots, so the bubble
    reads as a hole punched in the picture rather than as a shape floating on
    top of it; the STROKE then sets the outline and the three dots. Drawing only
    the outline leaves the room's own dots showing through the middle, and the
    bubble stops looking like a bubble.
    """
    h, w = dots.shape
    box = [BUBBLE[0] * w, BUBBLE[1] * h, BUBBLE[2] * w, BUBBLE[3] * h]
    tail = [(x * w, y * h) for x, y in BUBBLE_TAIL]
    radius = (box[3] - box[1]) * 0.28

    fill = Image.new("1", (w, h), 0)
    pen = ImageDraw.Draw(fill)
    pen.rounded_rectangle(box, radius=radius, fill=1)
    pen.polygon(tail, fill=1)

    stroke = Image.new("1", (w, h), 0)
    pen = ImageDraw.Draw(stroke)
    pen.rounded_rectangle(box, radius=radius, outline=1, width=BUBBLE_STROKE)
    pen.line([tail[0], tail[2], tail[1]], fill=1, width=BUBBLE_STROKE)

    # The three dots, on the box's own centre line.
    middle = (box[1] + box[3]) / 2
    spacing = (box[2] - box[0]) / 4
    size = max(1.0, (box[3] - box[1]) * 0.07)
    for i in (1, 2, 3):
        cx = box[0] + spacing * i
        pen.ellipse([cx - size, middle - size, cx + size, middle + size], fill=1)

    out = dots.copy()
    out[np.asarray(fill, dtype=bool)] = False
    out[np.asarray(stroke, dtype=bool)] = True

    # The bubble sits on top of the picture, so it takes the frame's own mark. A
    # speech bubble drawn in a syntax colour would read as part of the screen.
    plain = hue.copy()
    plain[np.asarray(fill, dtype=bool)] = -1
    plain[np.asarray(stroke, dtype=bool)] = -1
    return out, plain


def to_png(
    dots: np.ndarray,
    hue: np.ndarray,
    *,
    ground: tuple[int, int, int],
    mark: tuple[int, int, int],
):
    """Ground, mark, and the handful of dots that carry one of the five hues.

    A coloured dot is the frame's own mark mixed TINT of the way toward its
    token, so it stays on the right side of its ground — dark on the paper
    frame, light on the ink one — while reading unmistakably as a colour.
    """
    h, w = dots.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    rgb[...] = ground
    rgb[dots] = mark

    base = np.array(mark, dtype=float)
    for index, token in enumerate(STAGE):
        mixed = base + TINT * (np.array(token, dtype=float) - base)
        rgb[hue == index] = np.round(mixed).astype(np.uint8)
    return Image.fromarray(rgb)


#: name -> (source argv index, dots on the dark end, ground, dot colour, bubble)
FRAMES = (
    ("manual", 1, True, INK, CANVAS, False),
    ("jarvis", 2, False, CANVAS, INK, True),
)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2

    out = Path(__file__).resolve().parent.parent / "src" / "assets" / "scene"
    out.mkdir(parents=True, exist_ok=True)

    for name, index, invert, ground, mark, bubble in FRAMES:
        src = Path(argv[index])
        dots, hue = render(src, invert=invert)
        if bubble:
            dots, hue = add_bubble(dots, hue)
        to_png(dots, hue, ground=ground, mark=mark).save(out / f"{name}.png", optimize=True)
        print(
            f"  {name:7s} {dots.shape[1]}x{dots.shape[0]}"
            f"  dots {dots.mean() * 100:.1f}%"
            f"  coloured {(hue >= 0).mean() * 100:.2f}%"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
