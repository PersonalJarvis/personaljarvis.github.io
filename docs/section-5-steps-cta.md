# Section 5 — the steps, and the closing CTA

> Assumes [`layout.md`](layout.md).
> Position: **the last two blocks of the page**, directly on top of each other,
> no gap between them. Two blocks in one file because together they are the
> end of the page.

---

## Reference

Layout model: <https://www.meuze.ai> — the "Forward deployed" section and the
band beneath it.

The reference governs layout, proportion and the focus behaviour. Not copy, not
colour, not content.

Its rastered artwork is a **dead-on orthographic elevation** — no tilt, no
perspective. That is the viewpoint the mark uses (maintainer, 2026-08-29).

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
| Section height | `min-height: 100svh`, content vertically centred |
| Width | step `content` |
| Columns | 7/12 steps left, 5/12 artwork right |
| Step spacing | 48px between blocks |
| Number badge | 24×24px, radius 4px, `--font-mono` |
| Connecting line | 1px, `--hairline`, continuous through all badges |

Widths come from `<Container>` alone. The step names a `max-width` of its own
nowhere — `check-style.mjs` enforces that.

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

- Vertically centred, about 60% of the section's height, square
- The flat logo PNG is **not** enough
- It **turns** — a full revolution, so the recipe's real-time exception applies
  (maintainer, 2026-08-29)
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
| Width | step `content` |
| Height | 268px desktop, `auto` under 768px |
| Corners | **sharp**, `border-radius: 0` |
| Ground | the accent, full bleed |
| Padding | 56px, 32px under 768px |
| Space above | 0 to Block A |

## Build

- Headline left, two lines, in the colour that contrasts the band
- Under it one sentence, smaller, same colour at reduced opacity
- Button right, vertically centred, inverted: light ground, accent as type
- Under 768px: button under the text, full width

**The contrast is deliberate.** The band breaks with everything above it
because it marks the end of the page. No rounding, no transparency, no
gradient.

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
- Rounding, gradients or transparency on the CTA band
- A gap between Block A and Block B
- Rastering a flat, unshaded logo. See [`dither-relief.md`](dither-relief.md)
- A `max-width` of its own instead of step `content` from [`layout.md`](layout.md)
