# Design — the visual system

Binding for every surface of this site. Widths are governed by
[`layout.md`](layout.md); this file governs everything else. Where the two
appear to disagree, `layout.md` wins — it is the older contract and the hero
spec already builds on it.

Tokens live in `src/styles/tokens.css`. Never inline a hex value.

---

## Overview

An editorial, quietly-confident developer-tools voice. The page floor is **warm
cream**, not white; the ink is **warm near-black**, not pure black. Display type
sits at **weight 400** with negative tracking — a magazine voice rather than a
bombastic tech one. Depth comes from **hairlines only**: no drop shadows, no
elevation tiers. Sections breathe at an **80px rhythm**.

Key characteristics:

- Cream canvas (`--canvas`), never `#ffffff` as the page floor.
- Warm ink (`--ink`), never `#000000`.
- **The primary CTA is ink on cream.** This system has no borrowed accent hue.
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
this system work without a borrowed colour.

---

## Colour

### Surface
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#f7f7f4` | Warm cream page floor |
| `--canvas-soft` | `#fafaf7` | Pane background inside mockups |
| `--surface-card` | `#ffffff` | Card surface — slight lift against cream |
| `--surface-strong` | `#e6e5e0` | Badges, tag pills |

### Ink and text
| Token | Value | Use |
|---|---|---|
| `--ink` | `#26251e` | Display, emphasis, **primary CTA background** |
| `--ink-active` | `#3a382e` | CTA press state |
| `--body` | `#5a5852` | Running text |
| `--muted` | `#807d72` | Sub-titles |
| `--muted-soft` | `#a09c92` | Disabled text |
| `--on-ink` | `#f7f7f4` | Cream text on ink |

### Hairlines
`--hairline` `#e6e5e0` (1px divider) · `--hairline-soft` `#efeee8` (lighter) ·
`--hairline-strong` `#cfcdc4` (panel outline).

### Agent timeline — the one coloured signature
`--stage-thinking` peach · `--stage-grep` mint · `--stage-read` blue ·
`--stage-edit` lavender · `--stage-done` gold.

These mark agent stages inside timeline visualisations. They are **not** status
colours, **not** decoration, and never appear outside a timeline.

### Semantic
`--success` `#1f8a65` · `--error` `#cf2d56`. Validation and confirmation only.

---

## Typography

**Inter** for display and body, **JetBrains Mono** for every code surface.

Sizes are **rem**, shown here with the px they render at the 16px base. The
root font size grows with the viewport (`layout.md`), so these travel with it;
a px token here would freeze while the rem utilities around it grew.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| display-mega | 4.5rem (72px) | 400 | 1.1 | -2.16px | Hero h1 |
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
| Pane | `--canvas-soft` | Inside product mockups |

The product mockup is the only element that reads as elevated — a white card on
cream with internal pane structure. That contrast is the whole effect; a
`box-shadow` would flatten it into a generic SaaS page.

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

**Primary CTA** — ink background, cream text, 14px/500, 12×20px padding, 44px
tall, `--radius-md`. This is the download/install action.

**Secondary CTA** — white card pill on cream, ink text, 1px
`--hairline-strong`, 40px tall.

**Tertiary** — inline ink text link.

**Cards** — white surface, 1px `--hairline`, `--radius-lg`, 24px padding.

**Product mockup card** — white card holding a multi-pane mockup,
`--radius-lg`, 1px hairline, no padding (panes fill it edge to edge). Panes use
`--canvas-soft` and mono type. See [`hero.md`](hero.md) for how the hero builds
this.

**Timeline pill** — `--radius-pill`, 4×10px padding, caption-upper type,
background from the stage tokens.

**Code block** — white surface, 1px hairline, `--radius-lg`, 20px padding, mono.

**Pricing** — white card, `--radius-lg`, 32px padding. The featured tier
inverts to ink instead of wearing a coloured ribbon.

**Inputs** — white, ink text, `--radius-md`, 12×16px padding, 44px tall.

**Pre-footer CTA band** — cream, centred display-lg headline, one primary CTA,
96px vertical padding.

**Footer** — cream, body text, 5-column links, 64×48px padding.

---

## Do

- Keep the primary CTA as ink on cream. One action colour, used scarcely.
- Keep display at weight 400.
- Use cream as the page floor — never pure white.
- Render every code surface in mono.
- Confine the stage pastels to timeline visualisations.

## Don't

- **Don't add a second action colour.** If everything is emphasised, nothing is.
- Don't set display type to 700+.
- **Don't add drop shadows.** Hairlines and ink-on-cream carry the depth.
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

- Dark mode is not defined. When it is, follow the note at the foot of
  `tokens.css`: redefine tokens in both the media query and the `data-theme`
  block, never define a colour only inside one.
- Animation timings are out of scope, except the hero's, which
  [`hero.md`](hero.md) pins down.
- Hover states are documented per component as they are built, not here.
