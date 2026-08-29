# Section 5 — the steps, and the closing CTA

> Assumes [`layout.md`](layout.md).
> Position: **the last two blocks of the page, inside ONE section that is one
> screen tall.** Two blocks in one file because together they are the end of
> the page — and in one `<section>` because together they are one screen.

---

## Reference

Layout model: <https://www.meuze.ai> — the "Forward deployed" section and the
band beneath it.

The reference governs layout, proportion and the focus behaviour. Not copy, not
colour, not content.

Its rastered artwork is a **dead-on orthographic elevation** — no tilt, no
perspective. That is the viewpoint the mark uses (maintainer, 2026-08-29).

Three things were read off the reference rather than guessed at, so nobody has
to squint at it again:

| What | The reference | Here |
|---|---|---|
| Block A's boundary | a rule above **and** below, between the two rails | the same |
| Space between the blocks | one gap, not a join | **none** — the band hangs off the rule (maintainer, 2026-08-29) |
| Seconds per revolution | 15 (its own bundle: `-(2π)/(1000 · secondsPerRevolution)`, default 15, never overridden) | 14 |

---

# Block A — "How to install Jarvis"

## What it says

Four steps from installing to the first spoken command. The reader should see
that getting in is small and reversible.

**Source of the content:** `README.md`, sections "Install" and "Run it".
Steps are never invented. Every one carries a comment in `Install.astro`
naming what proves it.

| # | Step | Source |
|---|------|--------|
| 1 | One command | README "Install" |
| 2 | Pick a wake word | README "Install", `jarvis.toml.example` |
| 3 | Add a key, or skip it | README "Install", "Runs on your own hardware" |
| 4 | Say it | README "Run it" |

---

## Measurements

| Element | Value |
|---|---|
| Section height | `min-height: 100svh` — **both blocks together**, not Block A alone |
| Block A's height | whatever the band and the gaps leave over (`flex: 1`) |
| Block A's padding | `clamp(1.5rem, 2.6svh, 3rem)`, a floor rather than a fixed amount |
| Width | step `content` |
| Columns | **6/12 steps left, 6/12 artwork right** |
| Step spacing | 40px between blocks |
| Number badge | 24×24px, radius 4px, `--font-mono` |
| Connecting line | 1px, `--hairline`, one segment per gap |
| Boundary | `.section-rule` above the steps **and** below them |

Widths come from `<Container>` alone. The step names a `max-width` of its own
nowhere — `check-style.mjs` enforces that.

### The section is one screen, and the band is what makes it one

Block A alone used to be the `100svh` section, with its content centred in it
and the band a sibling underneath. On a tall monitor that put ~800px of steps
in the middle of a 1250px screen and dropped the whole surplus — roughly 220px
— as dead space between the last step and the band. It read as a hole, and it
was the first thing the maintainer pointed at (2026-08-29).

The band moving *inside* the section is the fix. The surplus is then spent
rather than wasted: `flex: 1` on Block A absorbs it, the band lands at the foot
of the screen, and the reader gets the steps and the close in one view.

The padding is a floor and the height is a `min-height`, so the failure
direction is safe. On a short laptop where the steps plus the band cannot fit,
the section simply grows past one screen and the page scrolls. Nothing is
clipped and nothing is squeezed.

**One screen is the target, not a constraint to enforce against the content**
— and that is the settled reading, because the first attempt enforced it and
was rejected for it (maintainer, 2026-08-29: *"the viewport doesn't do it for
me; go by the section instead"*). Measured: 1305×2560 lands at exactly one
screen, 1249 at 23px over, a 1440×900 laptop at 89px over. The section is
proportioned first and lands near a screen second.

### The connecting line stops at the last badge

One segment per **gap**, on each step but the last: from that step's badge
bottom edge (`top: 24px`) down through the 48px gap to the next badge's top
(`bottom: -48px`).

Not one line spanned against the `<ol>`. The list's box ends at the bottom of
the last step's *body*, several lines below the last badge, so a single line
overshot the final number and ran on into empty space — visible in the
maintainer's screenshot of 2026-08-29. A line that has to stop at an element it
is not anchored to cannot be given the right length in CSS; a segment that
knows both of its own ends can.

---

## The focus behaviour (the signature)

**Exactly one step is active.** The active step stands at full opacity, the
other three at `opacity: .35`.

- Only the active step shows its button. The others show none — not greyed out,
  absent
- The active badge is filled (`--surface-strong` ground, `--ink` digit), the
  inactive ones outlined only
- 300ms transition on `opacity`

### How the active step is decided

An `IntersectionObserver` with `rootMargin: "-45% 0px -45% 0px"` is the
trigger; which step is active is then decided by **measuring**, because a 10%
band in the middle of the screen can hold two steps at once or none at all.
Active is whichever step's centre sits closest to the middle of the viewport.

**No scroll hijacking, no sticky pinning.** The reader scrolls normally and the
focus follows. Sticky variants break on mobile and feel sluggish.

Hovering an inactive step also brings it to full opacity, without taking over
the active state.

---

## The artwork

The Jarvis mark as a **dither relief**. Recipe, pipeline and acceptance live in
[`dither-relief.md`](dither-relief.md); this file does not repeat them.

- Sized from its GRID CELL: its column's width, its row's height, centred in
  both. Never from the viewport
- The flat logo PNG is **not** enough
- It **turns** — a full revolution, so the recipe's real-time exception applies
  (maintainer, 2026-08-29)
- **Fourteen seconds per revolution.** Six was tried and rejected: at a
  one-pixel cell the raster crawls rather than turns, and the mark reads as
  restless (maintainer, 2026-08-29). Fourteen is also within a second of the
  reference's own rate
- **The camera is fitted to the form, not to a hand-picked number.** The frame
  clears the mark's RADIUS about the turn axis — `max sqrt(x² + z²)` over every
  vertex, measured at build time — and the frustum is then the canvas expressed
  in those units. A square canvas with a square frustum, which is what stood
  here before, wastes the taller half of a non-square cell and draws the mark
  smaller than its box allows at every angle
- **It fills its cell.** A grid item with a fixed `aspect-ratio` cannot stretch,
  so the old square sat at the TOP of a row the steps ran on past, and the mark
  read as floating in the upper corner over a hole. Drawn size went up about
  45% between the two
- Purely decorative: `aria-hidden="true"`
- Below 1024px it is dropped, not shrunk. `client:media` means the bundle is
  never fetched there

Three things about the mark are decisions, not defaults:

- **The face is on the front only.** The back of the turn is a blank body
  (maintainer, 2026-08-29)
- **Eyes and mouth are black**, which in this raster means *no dots*: they fall
  under every threshold in the matrix and the page floor shows through
- **The arms reach further than the drawing does.** In 2D they are legible
  because nothing sits in front of them; in 3D the body's own bevelled edge
  eats a stub that short

---

# Block B — the closing CTA

## Measurements

| Element | Value |
|---|---|
| Width | step `content` — rail to rail, exactly like Block A |
| Height | 220px desktop, `auto` under 768px |
| Corners | **sharp**, `border-radius: 0` |
| Ground | the accent, full bleed |
| Padding | 40px, 32px under 768px |
| Space above | **0** — the band hangs off the rule that closes Block A |
| Space below | `clamp(1.25rem, 2.75svh, 2rem)` — the tail off the screen edge, and the distance to the legal foot |

## Build

- Headline left, two lines, in the colour that contrasts the band
- Under it one sentence, smaller, same colour at reduced opacity
- Button right, vertically centred, inverted: light ground, accent as type
- Under 768px: button under the text, full width

**The contrast is deliberate.** The band breaks with everything above it
because it marks the end of the page. No rounding, no transparency, no
gradient.

**And it touches the rule above it.** The reference leaves a gap there; ours
was given one and the maintainer struck it out on sight (2026-08-29). The
difference is what the two bands ARE: theirs is a coloured card floating on the
page, which needs air around it, and ours is a filled block that closes the
section. Air above a closing block reads as a hole between the last step and
the end of the page, not as breathing room.

The band is not the last element on the page — the legal foot follows it, below
the fold. See [`footer.md`](footer.md).

### The accent on this palette

There is no `BRAND.md` in this repository and no borrowed accent hue —
[`design.md`](design.md) keeps exactly one action colour, "paper on ink". So
the band is `--ink` and its type is `--on-ink`: 18.5:1, well past AA. Inverted,
the button is therefore dark on the pale band.

---

## Accessibility

- Block A is an `<ol>`. The order is part of the content
- The focus behaviour is purely visual. All four steps stay equally readable to
  a screen reader, dimmed ones included
- The active step's button is not removed with `display: none`; it is present
  in the DOM only on the active step, so a screen reader never announces four
  buttons where one is offered
- `prefers-reduced-motion`: no opacity transitions. Every step at full opacity,
  every button visible. The same state is what a visitor without JavaScript
  gets, because the dimming is opted into by script

---

## Forbidden

- Scroll hijacking or sticky pinning for the focus behaviour
- More than four steps
- Buttons on every step at once
- Invented steps that README or the repo cannot prove
- Sizing the artwork from the VIEWPORT — an `svh` cap, a fixed aspect ratio.
  It is framed against the section it sits in, and nothing else
- A shadow map in the turning scene. See [`dither-relief.md`](dither-relief.md)
  § "Two rules a moving relief adds"
- A gap between the rule that closes Block A and the band
- Rounding, gradients or transparency on the CTA band
- Block B outside the section, or any other arrangement that lets Block A's
  leftover height fall as dead space between the last step and the band
- A band narrower or wider than Block A. Both stand on the rails, or the end of
  the page has two different edges
- Rastering a flat, unshaded logo. See [`dither-relief.md`](dither-relief.md)
- A `max-width` of its own instead of step `content` from [`layout.md`](layout.md)
