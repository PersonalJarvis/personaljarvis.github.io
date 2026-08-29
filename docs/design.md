# Design — the visual system

Binding for every surface of this site. Widths are governed by
[`layout.md`](layout.md); this file governs everything else. Where the two
appear to disagree, `layout.md` wins — it is the older contract and the hero
spec already builds on it.

Tokens live in `src/styles/tokens.css`. Never inline a hex value.

---

## Overview

An editorial, quietly-confident developer-tools voice. The page floor is **warm
near-black**, not pure black; the type on it is **warm off-white**, not pure
white. Display type sits at **weight 400** with negative tracking — a magazine
voice rather than a bombastic tech one. Depth comes from **hairlines only**: no
drop shadows, no elevation tiers. Sections breathe at an **80px rhythm**.

The floor is the running app's own dark theme, value for value, so the site and
the product it sells stand on the same ground. **There is no light mode** — the
page is dark at every system setting, which is why the tokens are defined once
on bare `:root` rather than split across a media query.

Key characteristics:

- Near-black canvas (`--canvas`), never `#000000` as the page floor.
- Warm off-white ink (`--ink`), never `#ffffff`.
- **The primary CTA is paper on ink.** This system has no borrowed accent hue.
- Display weight stays 400 — never bold.
- Hairline-only depth; no shadows.
- Five pastel stage colours, scoped to agent-timeline visualisations only.
- Mono on every code surface, and code surfaces are roughly half the page.

## What this is not

The reference document this system was adapted from described **another
product's brand** — its accent colour, its licensed typeface, its wordmark, even
its navigation labels. None of that is carried over, for three reasons:

1. **It is not ours.** A site wearing another company's accent colour and
   typeface reads as that company's site. Visitors would recognise them, not us.
   Copying trade dress this closely is also a legal exposure, not just a
   creative one.
2. **The typeface is licensed** and unavailable to us. The reference itself
   names Inter as the substitute; that is what we use, at weight 400 with
   negative tracking.
3. **It contradicts our own rebrand.** The app dropped its brand hue in favour
   of ink and paper. An accent-coloured site next to a colourless app makes the
   two read as different products.

What *is* carried over is the part that belongs to nobody: the scale, the
rhythm, the hairline-depth approach, and the editorial restraint. The reference
already contained an ink-on-cream CTA; promoting that to primary is what lets
this system work without a borrowed colour. The floor was later inverted to the
app's own dark theme, which leaves that CTA as paper on ink — the same one
action colour, read the other way round.

---

## Colour

### Surface
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#0a0a09` | Warm near-black page floor |
| `--canvas-soft` | `#21201c` | Row hover and toolbar wells inside a card |
| `--surface-card` | `#191815` | Card surface — a small lift off the floor |
| `--surface-strong` | `#282620` | Badges, tag pills |

The scale runs the opposite way from a light theme: further from the floor means
**lighter**, not darker. A card lifts by moving toward the ink.

### Ink and text
| Token | Value | Use |
|---|---|---|
| `--ink` | `#f7f7f4` | Display, emphasis, **primary CTA background** |
| `--ink-active` | `#e0dfd8` | CTA press state |
| `--body` | `#b4b1a7` | Running text |
| `--muted` | `#9a978c` | Sub-titles |
| `--muted-soft` | `#6d6a62` | Disabled text |
| `--on-ink` | `#0a0a09` | Dark text on a pale CTA |

Against the canvas: `--ink` 18.5:1, `--body` 9.2:1, `--muted` 6.8:1 — all past
AA, the first two past AAA. `--muted-soft` sits at 3.7:1 and is for disabled
text only, never for anything a visitor has to read.

### Hairlines
`--hairline` `#2b2925` (1px divider) · `--hairline-soft` `#201f1b` (lighter) ·
`--hairline-strong` `#46433b` (panel outline).

"Strong" still means more contrast, which on this ground means lighter. The
three keep their order; only the direction flipped.

### Agent timeline — the one coloured signature
`--stage-thinking` peach · `--stage-grep` mint · `--stage-read` blue ·
`--stage-edit` lavender · `--stage-done` gold.

These mark agent stages inside timeline visualisations. They are **not** status
colours, **not** decoration, and never appear outside a timeline.

### Semantic
`--success` `#3fb98d` · `--error` `#ea5e7e`. Validation and confirmation only.

Both were lifted off their light-theme values, which were mixed for cream and go
muddy here — the old `#1f8a65` lands at 2.4:1 against a card. These clear 5:1.

---

## Typography

**Inter** for display and body, **JetBrains Mono** for every code surface.

Sizes are **rem**, shown here with the px they render at the 16px base. The
root font size grows with the viewport (`layout.md`), so these travel with it;
a px token here would freeze while the rem utilities around it grew.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| display-mega | 4.5rem (72px) | 400 | 1.1 | -2.16px | Hero h1 |
| display-xl | 3.25rem (52px) | 400 | 1.1 | -1.3px | A section head that carries the argument |
| display-lg | 2.25rem (36px) | 400 | 1.2 | -0.72px | Section heads |
| display-md | 1.625rem (26px) | 400 | 1.25 | -0.325px | Sub-section heads |
| display-sm | 1.375rem (22px) | 400 | 1.3 | -0.11px | Card group titles |
| title-md | 1.125rem (18px) | 600 | 1.4 | 0 | Component titles |
| title-sm | 1rem (16px) | 600 | 1.4 | 0 | List labels |
| body | 1rem (16px) | 400 | 1.5 | 0 | Default body |
| body-sm | 0.875rem (14px) | 400 | 1.5 | 0 | Footer body |
| caption | 0.8125rem (13px) | 400 | 1.4 | 0 | Captions |
| caption-upper | 0.6875rem (11px) | 600 | 1.4 | 0.88px | Section labels, pill labels |
| code | 0.8125rem (13px) | 400 | 1.5 | 0 | Code — JetBrains Mono |
| button | 0.875rem (14px) | 500 | 1.0 | 0 | CTA labels |
| nav-link | 0.875rem (14px) | 500 | 1.4 | 0 | Top nav |

**Principles**

- Display weight stays 400. Dropping to 700 is the single fastest way to lose
  this look.
- Negative tracking on display only, never on body.
- Mono on every code surface, inline and block.
- **`display-lg` is the section head; `display-xl` is the exception.** It is for
  a section whose headline carries the argument on its own — set beside its
  standfirst rather than above it, where `display-lg` reads as a caption next to
  the picture below. It is half a step down from the hero, so the page still has
  exactly one largest line. Two sections at `display-xl` means one of them
  should not be. Currently: `VoiceSwitch.astro` only.

---

## Rhythm and layout

4px base unit. Tokens: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · **80 (section)**.

Vertical section padding is 80px. Cards inside a band sit close together
(16–24px gap) — the space belongs between sections, not inside them.

**Widths come from [`layout.md`](layout.md)**, not from this file: `prose` is
`max(672px, 26vw)`, `content` is `max(1280px, 50vw)`, `full` is 100% — via the
one `Container`. They are a formula, not a constant, so the column keeps its
share of a wide screen. The reference system named a flat 1200px; that is
exactly the shape of constant this site had to move away from.

Grids inside `content`: 3-up for benefit cards at desktop, 2-up for splits,
5-column footer.

---

## Depth

**Hairlines only.** No shadow tokens exist, and none should be added.

| Level | Treatment | Use |
|---|---|---|
| Flat | `--canvas` | Body bands, footer |
| Card | `--surface-card` + 1px `--hairline` | Content cards |
| Well | `--canvas-soft` | Row hover, toolbars inside a card |
| Mockup | app values + 1px `--hairline-strong` | The product window |

The product mockup is still the one element that reads as elevated, but it is
read by its **edge** rather than its fill. It carries the app's own near-black,
which on this floor is within a shade of the page, so the hero gives it
`--hairline-strong` instead of the usual hairline. That is the honest move in a
dark theme; a `box-shadow` would flatten it into a generic SaaS page, and
retuning the app values to fake a lift would stop the demo being a clone.

---

## Shape

`--radius-xs` 4px (inline tags) · `--radius-sm` 6px (compact rows) ·
`--radius-md` 8px (**buttons, inputs**) · `--radius-lg` 12px (**cards, panes**) ·
`--radius-xl` 16px (rare) · `--radius-pill` (pills, badges, avatars).

The compact 8px button radius is deliberate — a developer dialect, not a
consumer one.

---

## Components

**Top nav** — `--canvas` background, ink text, 64px tall. Wordmark left,
horizontal menu centre, one primary CTA right. Hamburger below 768px.

**Primary CTA** — ink background, dark text, 14px/500, 12×20px padding, 44px
tall, `--radius-md`. On this floor that is a pale button — the brightest thing
on the page, which is what makes it the one action worth taking.

**Secondary CTA** — card-coloured pill on the floor, ink text, 1px
`--hairline-strong`, 40px tall.

**Tertiary** — inline ink text link.

**Cards** — card surface, 1px `--hairline`, `--radius-lg`, 24px padding.

**Product mockup card** — a card holding a multi-pane mockup, `--radius-lg`,
1px `--hairline-strong`, no padding (panes fill it edge to edge). Panes use
`--canvas-soft` and mono type. See [`hero.md`](hero.md) for how the hero builds
this.

**Timeline pill** — `--radius-pill`, 4×10px padding, caption-upper type,
background from the stage tokens.

**Code block** — card surface, 1px hairline, `--radius-lg`, 20px padding, mono.

**Pricing** — card surface, `--radius-lg`, 32px padding. The featured tier
inverts to ink — a pale panel — instead of wearing a coloured ribbon.

**Inputs** — card surface, ink text, `--radius-md`, 12×16px padding, 44px tall.

**Pre-footer CTA band** — canvas, centred display-lg headline, one primary CTA,
96px vertical padding.

**Footer** — canvas, body text, 5-column links, 64×48px padding.

---

## Do

- Keep the primary CTA as paper on ink. One action colour, used scarcely.
- Keep display at weight 400.
- Use the near-black canvas as the page floor — never pure black.
- Render every code surface in mono.
- Confine the stage pastels to timeline visualisations.

## Don't

- **Don't add a second action colour.** If everything is emphasised, nothing is.
- Don't set display type to 700+.
- **Don't add drop shadows.** Hairlines and the card-off-floor step carry the
  depth.
- **Don't reach for a light-theme value** because it "looks about right". The
  semantic pair and the hairlines were re-mixed for this ground; a colour that
  worked on cream usually fails here.
- Don't use the stage pastels for status, decoration, or charts.
- Don't inline a hex value. Add a token or use one.
- Don't reintroduce another product's accent colour or typeface.

---

## Responsive

| Name | Width | Changes |
|---|---|---|
| Mobile | `< 640px` | Hero h1 → 32px; mockup collapses to one pane; grids 1-up; nav hamburger |
| Tablet | `640–1024px` | Hero h1 56px; mockup compresses; grids 2-up |
| Desktop | `1024–1280px` | Hero h1 72px; full multi-pane mockup; grids 3-up |
| Wide | `> 1280px` | Content caps at 1280px (`layout.md`), margins become visible |

**Touch targets:** primary CTA 44px, secondary 40px minimum.

---

## Known gaps

- There is no light mode, and none is planned. If one is ever wanted, add it as
  `:root[data-theme="light"]` overrides — never move a colour's only definition
  into a block, or the page loses that colour wherever the block does not apply.
- Animation timings are out of scope, except the hero's, which
  [`hero.md`](hero.md) pins down.
- Hover states are documented per component as they are built, not here.
