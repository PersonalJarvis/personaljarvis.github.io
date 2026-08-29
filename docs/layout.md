# Layout — content widths

> **Internal name: "middle two quarters".**
> Also just "the middle" or "the centre column" — always the same thing.
>
> Divide a wide screen into four quarters: the outer two stay empty, the middle
> two carry the content.
>
> **This is the goal, and the widths below are built to hit it at every screen
> size** — including screens far wider than the one the design was drawn on.

This file governs every section of the site. It is binding, not advisory.

---

## Principle

Content never spans the full viewport, and it never collapses into a ribbon in
an empty field either. It sits centred in a column that keeps its *proportion*
as the screen grows.

---

## The three width steps

Every element belongs to exactly one step. There is no fourth.

| Step      | Width | For |
|-----------|-------|-----|
| `prose`   | `max(672px, 26vw)` | Headlines, body copy, CTAs, forms |
| `content` | `max(1280px, 50vw)` | Images, screenshots, cards, grids, demos |
| `full`    | `100%` | Background colours, gradients, dividers only |

Both bounded steps are additionally capped at `100% - 2 × gutter`, so they never
touch the screen edge, and centred with `margin-inline: auto`.

Use them as `<Container width="prose">`, `<Container width="content">`,
`<Container width="full">`. Nothing else decides a width.

**`full` never contains text or interactive elements.** When a section needs an
edge-to-edge background, the background sits on `full` and its content sits on
`prose` or `content` inside it.

---

## The formula, and why it is shaped like this

```
max(<floor>, <share of viewport>)   capped by   100% - 2 × gutter
```

Both halves are load-bearing, and each fails alone:

**A fixed pixel maximum alone** produces the middle two quarters at exactly one
screen width. `content: 1280px` is half of 2560px — and a quarter of 5120px, and
a sixth of 7680px. On anything wider than the screen it was drawn on, the page
degrades into a narrow strip surrounded by emptiness. This is not hypothetical:
it is what the first version of this file specified, and what it looked like on
the maintainer's own monitor (a browser at 50% zoom doubles the CSS viewport and
produces the same effect on ordinary hardware).

**A percentage alone** fails at the other end. `50vw` is 195px on a phone, which
no one can read.

**`max()` of the two** takes whichever is larger. Below roughly 2560px the floor
wins and protects small screens; above it the share wins and holds the
proportion. There is no breakpoint to maintain, and no width at which the layout
jumps.

| Viewport | `content` resolves to | Share of screen |
|---|---|---|
| 390px (phone) | 342px (viewport minus gutters) | 88% |
| 834px (tablet) | 770px | 92% |
| 1440px (laptop) | 1280px | 89% |
| 2560px | 1280px | 50% |
| 5120px | 2560px | 50% |

The middle two quarters appear from about 2560px up, and hold from there on.
Below that they are neither possible nor wanted — two quarters of a 390px phone
would be 195px wide.

---

## Type scales too

```css
:root { font-size: clamp(16px, 10px + 0.35vw, 22px); }
```

A wider screen should get a *bigger page*, not the same page with more empty
space around it. Because the root font size grows with the viewport, everything
sized in `rem` follows on its own.

Display type carries its own floor-plus-share, so a headline is not a 56px line
on a wall-sized monitor:

```css
font-size: clamp(2.25rem, 1.6rem + 2.4vw, 6rem);
```

That gives roughly 36px on a phone, 60px on a laptop, 92px at 2560px, and 132px
at 5120px — the same *apparent* size at every viewing distance.

---

## Horizontal padding

Padding lives in the container and nowhere else.

| Viewport | Gutter per side |
|---|---|
| `< 768px` | 24px |
| `>= 768px` | 32px |

`full` carries no padding at all — that is the point of it.

---

## The container

There is exactly one container, in two variants that share one width map
(`src/lib/widths.ts`) so they cannot drift apart:

- `Container.astro` — the default. Ships no JavaScript.
- `Container.tsx` — only inside a React island.

```ts
export const widths = {
  prose: "container-prose",
  content: "container-content",
  full: "container-full",
} as const;
```

These are plain classes rather than Tailwind `max-w-*` utilities, because the
widths are a formula, not a constant. The formula lives in
`src/styles/layout.css`:

```css
:root {
  --gutter: 24px;
  --content-share: 50vw;
  --prose-share: 26vw;

  --w-content: min(100% - 2 * var(--gutter), max(1280px, var(--content-share)));
  --w-prose:   min(100% - 2 * var(--gutter), max(672px,  var(--prose-share)));
}

@media (min-width: 768px) { :root { --gutter: 32px; } }

.container-content { width: 100%; max-width: var(--w-content); margin-inline: auto; padding-inline: var(--gutter); }
.container-prose   { width: 100%; max-width: var(--w-prose);   margin-inline: auto; padding-inline: var(--gutter); }
.container-full    { width: 100%; max-width: none;             margin-inline: auto; padding-inline: 0; }
```

---

## Optional: full-bleed grid

For layouts where individual children break out of the column without leaving
the container. The width logic then lives once in the grid instead of on every
element.

```css
.layout {
  --rail: calc((var(--w-content) - var(--w-prose)) / 2);

  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [content-start] minmax(0, var(--rail))
    [prose-start] minmax(0, var(--w-prose)) [prose-end]
    minmax(0, var(--rail)) [content-end]
    minmax(var(--gutter), 1fr) [full-end];
}

.layout > *           { grid-column: prose; }
.layout > .wide       { grid-column: content; }
.layout > .full-bleed { grid-column: full; }
```

Two properties of this grid matter:

- The outer columns have a **minimum** of one gutter, so content never touches
  the screen edge — the same guarantee the container's padding gives.
- `prose` is **centred inside** `content`, not flush left. The rail is computed
  from the two widths, so it stays centred as both grow. A left-aligned prose
  column inside a centred content column reads as a mistake, because the page
  then has two different centres.

`.full-bleed` obeys the same rule as the `full` step: backgrounds and dividers,
never text. An image that should look wide belongs on `.wide`.

---

## Responsive

| Viewport | Behaviour |
|---|---|
| `< 768px` | Full width minus 24px per side. The gutters vanish here on purpose. |
| `768–2560px` | 32px gutters; the pixel floors govern, so the column is nearly full width on a laptop. |
| `> 2560px` | The share governs: content holds at half the screen, prose at roughly a quarter. This is the "middle two quarters" state. |

---

## Typographic background

The 672px floor for `prose` is not arbitrary. The optimal measure is 45–75
characters; beyond that the eye stops reliably finding the start of the next
line when it wraps.

That is also why `prose` grows more slowly than `content` (26% against 50%): on
a very wide screen the line gets longer *and* the type gets bigger, so the
character count per line stays in range. Growing prose at 50% would push a line
past 120 characters and make it unreadable — a wider column is not a better one.

**Test:** open the page on the largest monitor you have. If a long headline runs
as a single line there, `prose` is too wide. Wrapping onto two or three lines is
part of the intended effect. (A three-word headline wraps nowhere and proves
nothing — test with a real one.)

---

## Forbidden

- A **bare** viewport unit for a content width — `width: 50vw`, `max-width: 50%`
  — with no pixel floor under it. The floor is what makes the share safe.
- A bespoke `max-width` on a single section instead of using one of the three steps
- Text, buttons, or forms that leave the `content` container
- Horizontal padding on a section on top of the container — padding lives in the container alone
- `100vh` for section-filling heights. Always `100svh`, or iOS pushes the address bar into the layout

`scripts/check-style.mjs` enforces this list. It runs as a pre-commit hook; a
violation fails the build. The two owner files — `src/styles/layout.css` and
`src/lib/widths.ts` — are exempt, because the formula has to live somewhere.

**What the gate covers, exactly:** source files under `src/`, `app/`, `pages/`,
`styles/` and `components/` **inside this repo only** — it roots itself at the
website folder and cannot see anything above it. The desktop app's frontend is a
different design system with its own scale and no `Container`; its `max-w-*`
utilities are correct there and must not be swept up by this contract. `docs/`
and `scripts/` are not scanned either, so a document may quote a retired class
name to explain why it was retired.

---

## The four numbers to tune

If the result looks too wide or too narrow, change only these, and only in
`src/styles/layout.css`:

| Variable | Now | Effect |
|---|---|---|
| `--prose-share` | `26vw` | How much of a wide screen the text column takes |
| `--content-share` | `50vw` | The "two quarters" itself — 50% is the definition |
| floor in `--w-prose` | `672px` | Text width on laptops and below |
| floor in `--w-content` | `1280px` | Media width on laptops and below |

A narrower prose makes the margins read as wider, because the headline wraps
sooner. Nothing else changes.
