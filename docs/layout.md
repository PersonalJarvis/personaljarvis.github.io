# Layout — content widths

> **Internal name: "middle two quarters".**
> Also just "the middle" or "the centre column" — always the same thing.
>
> It describes the *impression* on a large screen: content sits centred, with
> generous empty margins left and right.
>
> **The name is a description, not a measurement.** It is implemented with
> fixed pixel max-widths, never viewport-relative values. See "Why no vw".

This file governs every section of the site. It is binding, not advisory.

---

## Principle

Content never spans the full viewport. It sits centred in a bounded column.
The gutters left and right grow with the viewport; the content does not.

---

## The three width steps

Every element belongs to exactly one step. There is no fourth.

| Step      | max-width | Tailwind    | For                                          |
|-----------|-----------|-------------|----------------------------------------------|
| `prose`   | 672px     | `max-w-2xl` | Headlines, body copy, CTAs, forms            |
| `content` | 1280px    | `max-w-7xl` | Images, screenshots, cards, grids, demos     |
| `full`    | 100%      | —           | Background colours, gradients, dividers only |

All three are centred with `margin-inline: auto`.

**`full` never contains text or interactive elements.** When a section needs an
edge-to-edge background, the background sits on `full` and its content sits on
`prose` or `content` inside it.

---

## Horizontal padding

Padding lives in the container and nowhere else.

| Viewport   | Padding per side |
|------------|------------------|
| `< 768px`  | 24px             |
| `>= 768px` | 32px             |

`full` carries no padding at all — that is the point of it.

---

## The container component

There is exactly one reusable component. No section defines its own width.

```tsx
// Each step carries its own padding. Never set padding outside the map and
// override it inside: two Tailwind classes of equal specificity resolve by
// stylesheet order, not by the order they appear in the class string, so
// `px-6 ... px-0` is a coin flip rather than an override.
const widths = {
  prose: "max-w-2xl px-6 md:px-8",
  content: "max-w-7xl px-6 md:px-8",
  full: "max-w-none",
} as const;

export function Container({
  width = "content",
  className = "",
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${widths[width]} ${className}`}>
      {children}
    </div>
  );
}
```

As plain CSS:

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 24px;
}

@media (min-width: 768px) {
  .container { padding-inline: 32px; }
}

.container--prose { max-width: 672px; }
.container--full  { max-width: none; padding-inline: 0; }
```

---

## Optional: full-bleed grid

For layouts where individual children break out of the column without leaving
the container. The width logic then lives once in the grid instead of on every
element.

```css
.layout {
  display: grid;
  grid-template-columns:
    [full-start] minmax(24px, 1fr)
    [content-start] minmax(0, 304px)
    [prose-start] minmax(0, 672px) [prose-end]
    minmax(0, 304px) [content-end]
    minmax(24px, 1fr) [full-end];
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns:
      [full-start] minmax(32px, 1fr)
      [content-start] minmax(0, 304px)
      [prose-start] minmax(0, 672px) [prose-end]
      minmax(0, 304px) [content-end]
      minmax(32px, 1fr) [full-end];
  }
}

.layout > *           { grid-column: prose; }
.layout > .wide       { grid-column: content; }
.layout > .full-bleed { grid-column: full; }
```

Two properties of this grid matter:

- The outer columns have a **minimum** of 24px (32px from `md`), so content
  never touches the screen edge on a narrow viewport — the same guarantee the
  container's padding gives.
- `prose` is **centred inside** `content` (304 + 672 + 304 = 1280), not flush
  left. A left-aligned prose column inside a centred content column reads as a
  mistake, because the page then has two different centres.

`.full-bleed` obeys the same rule as the `full` step: backgrounds and dividers,
never text. An image that should look wide belongs on `.wide`.

---

## Responsive

| Breakpoint  | Behaviour                                                     |
|-------------|---------------------------------------------------------------|
| `< 768px`   | Full width minus 24px padding per side. Gutters vanish here on purpose. |
| `>= 768px`  | Padding grows to 32px; the max-width starts to bite.          |
| `>= 1280px` | The margins become clearly visible. This is the target state. |

The "middle two quarters" impression only appears from roughly 1280px. Below
that it is neither possible nor wanted — two quarters of a 390px phone would be
195px wide.

---

## Why no vw

`width: 50vw` and `max-width: 50%` are forbidden. Why:

| Viewport | 50vw gives | Verdict              |
|----------|------------|----------------------|
| 390px    | 195px      | unreadable           |
| 1440px   | 720px      | fits by coincidence  |
| 2560px   | 1280px     | prose far too wide   |
| 3840px   | 1920px     | unusable             |

Fixed pixel max-widths give the same result on all four devices. The middle two
quarters appear on their own on large screens — they are the *result* of the
fixed width, not its cause.

---

## Typographic background

The 672px for `prose` are not arbitrary. The optimal measure is 45–75
characters. Beyond that the eye stops reliably finding the start of the next
line when it wraps.

Note that 672px is the *box*, and the box carries padding: the text itself is
624px wide below `md` and 608px from `md` up. That is what lands in the target
range at a 16–18px body size.

**Test:** open the page on the largest monitor you have. If a long headline
runs as a single line there, `prose` is too wide. Wrapping onto two or three
lines is part of the intended effect, not a side effect. (A three-word headline
wraps nowhere and proves nothing — test with a real one.)

---

## Forbidden

- `width: 50vw`, `max-width: 50%`, or any viewport-relative content width
- A bespoke `max-width` on a single section instead of using one of the three steps
- Text, buttons, or forms that leave the `content` container
- Horizontal padding on a section on top of the container — padding lives in the container alone
- `100vh` for section-filling heights. Always `100svh`, or iOS pushes the address bar into the layout

`scripts/check-layout.mjs` enforces this list. It runs in CI and as a
pre-commit hook; a violation fails the build.

---

## The two numbers to tune

If the result looks too wide or too narrow, change only these:

- `prose`: `max-w-2xl` (672px) → narrower is `max-w-xl` (576px)
- `content`: `max-w-7xl` (1280px) → wider is `max-w-[1440px]`

Everything else stays untouched. A narrower prose makes the margins read as
wider, because the headline wraps sooner.

Change them in **one** place — the width map in `src/components/Container.tsx`
and the custom properties in `src/styles/layout.css` — and nowhere else.
