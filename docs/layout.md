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

## A section that is one viewport and still scrolls

When a section has to be exactly one screen tall *and* the scroll has to drive
something inside it, the height is a **track** and what the reader sees is a
sticky child:

```css
[data-track]     { height: 300svh; }                 /* the running length */
[data-viewport]  { position: sticky; top: 0;
                   height: 100svh; overflow: hidden; }
```

The reader scrolls `track - viewport` of distance and sees one screen. That
distance is the animation's timeline: `-track.top / (track.height -
innerHeight)` is a clean 0..1, measured inside a `requestAnimationFrame` like
every other scroll figure on this site.

Three rules come with it, and each one has already cost a defect:

- **Every height between the sticky box and the element that gives carries
  `min-height: 0`.** A flex item refuses to shrink below its content by default,
  so one missing link and the content leaves the bottom of the screen instead of
  the picture getting shorter.
- **Subtract the nav.** It is `4rem`, sticky and opaque; a sticky child at
  `top: 0` starts underneath it.
- **Have a floor, and fall out of the pattern below it.** The element that gives
  gets whatever height is left, and on a short window that is a letterbox slot
  nothing survives. Below the floor the track collapses to `auto`, the child
  goes `static`, and the section is an ordinary block. So do a narrow screen —
  a three-screen scroll trap on a phone is worse than no animation — and
  `prefers-reduced-motion`. **Spell the conditions identically in the CSS and in
  the script**, or a scrub ends up driving a section that no longer has a track.

`VoiceSwitch.astro` is the worked example; the reasoning behind its numbers is
in [`section-3-voice.md`](section-3-voice.md). `Install.astro` is the second,
and shows the other thing a track is good for: not a scrub but a sequence —
four steps, a quarter of the track each. Its numbers are in
[`section-5-steps-cta.md`](section-5-steps-cta.md).

---

## The scroll rests on a section boundary

The page snaps. Let go of the wheel near a boundary and it settles with that
section's top edge on the top of the window — a beat of a pause, so a section
is read whole instead of being crossed halfway. Two declarations, both in
`src/styles/layout.css`, and nothing per section:

```css
html          { scroll-snap-type: y proximity; }
body > section { scroll-snap-align: start; }
```

**`proximity`, never `mandatory`.** `mandatory` means the scroll position must
always be on a snap point. Two sections here are taller than the window — the
pinned voice section is three screens, install is four — and the only snap
point either has is its own top edge, so `mandatory` drags the reader back to
that edge every time they scroll *inside* one and the rest of the section
cannot be reached. It is not a value to tune down; it is unusable on a page
whose sections are not all one screen tall.

**No `scroll-snap-stop: always`.** It turns every boundary into a wall a single
gesture cannot cross. That is a full-page slideshow, which is a different thing
from a page read at the reader's own pace.

**One selector, not a class per section.** The snap points are the section
boundaries — a fact about the page's structure, not a decision each section
makes. A class is a hand-maintained copy of that fact, and the section that
forgets it is the one boundary the page runs past.

**The footer is not a snap point**, and gets none because it is not a
`<section>`. It is a quarter-screen at the very bottom, so its top edge lies
past the document's last scroll position; a snap point there could only pull
the reader back off the end of the page.

**No `scroll-padding-top` — today.** A snap point *is* the top of the window,
so a bar pinned there would cover the very edge the reader was sent to, rule
included. The nav is `sticky` inside the hero and stops at the hero's bottom
edge, so every boundary below it meets a clear window. Move the nav out of the
hero and this becomes `scroll-padding-block-start: 4rem`.

`prefers-reduced-motion: reduce` turns the snap off altogether: that reader has
asked for exactly this — the page does not move on its own once their gesture
has finished.

---

## Page chrome: rails and the scroll marker

The gutters are made visible. Two vertical lines stand on the edges of the
`content` step and run **the whole page**, not one segment per section.

### The colour of a boundary: `--rule`, not `--hairline`

Every line in this section is `var(--rule)`. That is a separate token from
`--hairline`, and the two are not interchangeable.

| | `--hairline` `#2b2925` | `--rule` `#a8a59b` |
|---|---|---|
| Draws | the edge of an **object** — a card, a logo cell, a table divider | the **structure of the page** — the rails, and every section boundary |
| Contrast on the canvas | 1.4:1 | 8.1:1 |
| Found | once the eye is already on the thing it bounds | on the first glance, from across the room |

The rails and the section rules were `--hairline` until 2026-08-29. At 1.4:1 a
1px line is below the threshold where it survives a screen at all: it was
visible in the design and invisible on the maintainer's monitor, and the page
had no legible structure. The reference system draws its own rails at 9.6:1 —
almost exactly `--body`. `--rule` stops one shade short of that, because this
page carries far more text per section than the reference does and a rule as
bright as the prose competes with it.

**Do not collapse the two back into one token.** Raised to `--rule`, every card
and every logo cell becomes a wireframe; lowered to `--hairline`, the page loses
its structure. They are two jobs.

**A block that stands on both rails takes `--rule` on its outer edge**, because
that edge *is* the rail at that height — see "Blocks that cross a rail" below.

### Rails

- `position: fixed`, full viewport height, `pointer-events: none`
- They sit on the edges of the `content` step and get there through the
  `Container` component itself — never a recomputed pixel value, or they drift
  from the formula the moment one of the four numbers changes
- 1px, `var(--rule)`
- **`z-index: -1`.** The layer between the page background and the content. A
  fixed element at `z-index: 0` paints in the positioned layer, which is *above*
  ordinary in-flow content, and the rails would be drawn over the cards instead
  of behind them. The page colour lives on `<body>` and propagates to the
  canvas underneath, so negative z still leaves them visible; sections are
  **transparent by default** so they do not cover them
- Hidden below 768px — there are no gutters left to draw in

This layer holds the **rails only**. The marker has one of its own, in front of
the content — see below.

### Blocks that cross a rail

A block that is clearly **its own surface** — the CTA band on paper, the hero's
demo on its painted ground — may paint over the rails and interrupt them. That
is intended, not a defect: the reader sees one thing end and another begin.

A block filled in something **close to the page colour** is the case to watch.
It hides the rail without reading as a surface, and what is left is a bright
line that stops in mid-air for no visible reason. Since the rails became
legible this is no longer subtle — it reads as a rendering fault. Two fixes,
and the choice is about what the block is:

- **The block is as wide as the `content` column.** Then its left and right
  edges *are* the rails at that height, and they take `var(--rule)`. The line
  runs down the rail, around the block's corner, along its side and out the
  bottom — unbroken. The section cards in `Plugins`/`Skills`/`Clis`,
  `BuiltInPublic`'s video card and `VoiceSwitch`'s picture all do this.
- **The block is narrower.** Then it does not stand on a rail at all and needs
  nothing.

`VoiceSwitch`'s figures grid is the awkward middle case: its dividers are 1px
grid gaps on a coloured ground, so the ground has to stay `--hairline` for the
cells while the outer edge has to be `--rule` for the rails. It carries
`border-inline: 1px solid var(--rule)` and keeps the hairline ground. It used
`padding-inline: 1px` — letting a pixel of its own ground show at each edge —
which worked only while the rails and the dividers were the same colour.

### Horizontal rules

Every section gets `border-top: 1px solid var(--rule)` on an element
**inside** the container — the `.section-rule` class. Not on the section, and
not on the container either: the container's border box is one gutter wider
than its padding box, so a border there overshoots both rails and the joint
reads as a cross instead of a corner. Vertical padding moves onto the same
element, so the line marks the boundary rather than floating below it.

**One rule per boundary, drawn by the section below it.** A section opens with
its own rule and is closed by the next section's. That holds everywhere except
above a **bounded** section: a bounded section's two lines stand an inset inside
its own edges, so neither of them lands on that boundary and the section above
it is left open at the bottom.

The section above a bounded one therefore closes itself. Two ways, and they are
not equivalent:

- **Be bounded too** — the right answer when the section is **exactly one
  viewport**. A closing rule flush with the bottom edge is structurally correct
  and changes nothing the reader sees: it sits on the bottom edge of the
  *window*, never in the same view as the opening line, and one line alone at
  the top of the screen does not read as a boundary. Framed, both lines stand
  inside the screen at once. `Stargazers.astro` was converted for exactly this
  (2026-08-29).
- **A second `.section-rule` as the last child** — enough when the section is
  taller or shorter than a screen, so the reader passes both lines anyway.
  `Install.astro` does this. An empty element's `border-top` and `border-bottom`
  occupy the same pixel, so the closing line needs no class of its own.

**The hero's rule is the line under the nav**, and it is the nav's only bottom
edge — the band itself carries no `border-b`. It used to, and that border was
the one horizontal line on the page running the full width of the window
instead of rail to rail, which also left the hero with no corner for the marker
to start from. One line, drawn like every other boundary, does both jobs.

**That line is drawn INSIDE the nav band, not at the top of the hero's box.** It
is the one rule on the page whose position is not its section's own top edge,
and it has to be: `h-16` is 4rem against a root size that scales with the
viewport, so the band's bottom edge lands on a fraction of a device pixel
(75.83px at 1.5x), and a sticky opaque band is a composited layer that snaps its
own edge up to the next whole pixel — straight over a hairline beginning exactly
where it ends. The line is present in the DOM, correct in the box model, and
invisible on screen. Inside the band the same layer paints it and nothing can
round over it. A vertical rail never shows this because its blur is spread down
its whole length; a 1px horizontal line at a layer boundary is swallowed whole.

Every section below gets its own, the strip under the hero included.

### Vertical dividers between columns

Optional, in two-column sections. Use `gap: 1px` on a grid with a coloured
ground, not `border-right` — the same technique as the logo cells.

### The section marker

A small square per section, walking that section's own perimeter. It says two
things at once: how far the reader is through **this** section, and how much of
it is left.

> Implemented in `src/components/SectionTrack.astro`; the path and its timing
> in `src/lib/sectionTrack.ts`; the box in `src/styles/layout.css`.

**It replaced a single marker that rode the left rail for the whole document**
(2026-08-29). That one answered "how far through the page", which is a question
the reader is not asking while they are inside a section, and it said nothing
about the section they were actually in. Two markers on one rail disagreeing
about what "how far" means is worse than either alone, so there is now exactly
one kind and `PageChrome` draws only the rails.

#### The path

An SVG `<path>` in a `viewBox="0 0 100 100"` with `preserveAspectRatio="none"`,
so the box stretches to whatever the section is and no pixel is ever computed:

```
M 0 0 V 100 H 100     enter top-left,  leave at the bottom-right corner
M 100 0 V 100 H 0     enter top-right, leave at the bottom-left corner
```

The square is placed with `getPointAtLength(progress × totalLength)`, which
gives the corners for free.

**The side alternates down the page — the serpentine. Odd sections — the 1st,
3rd, 5th — run down the LEFT rail, even ones down the RIGHT**, counted over the
sections that carry a marker rather than over every section on the page: the
hero has none and is not a link in the chain. A marker that always ran
down the left rail would leave every section at the bottom-right corner and
enter the next one at the top-left: a jump the full width of the column at every
boundary. Mirrored, each section's exit corner sits directly above the next
section's entry corner, and the page reads as one line folded back and forth.
The side is assigned from **document order at runtime**, not from a prop — a
section inserted in the middle would otherwise break the chain silently.

**The path length is the pacing.** 100 + 100 = 200, so the marker spends half
the section's scroll coming down the entry rail and half crossing the closing
rule. Nothing else times it, and anything that has to line up with it reads its
milestones back out of that ratio rather than carrying its own numbers —
`VoiceSwitch`'s wipe does exactly this.

**The path ends ON the corner, with no tail.** It used to run 20% further down
the exit rail and fade out there, which was the right shape while every section
painted a square of its own: the overhang covered the seam. With a single
square (below) a tail is a defect — it walks past the corner into the section
below and then snaps back up to it at the hand-over. Ending on the corner is
what makes the hand-over invisible, because that corner *is* the next section's
first point.

#### One square, not one per section

Every section carries a marker element — that is what keeps each square's
geometry inside its own box, on its own two rails — but **only the section the
reader is inside ever paints it.** Without that, each section parks a square in
its entry corner and waits there, and the page shows a dot sitting in every
corner at once with the moving one lost among them (maintainer, 2026-08-29:
"nur einen Punkt, der ständig von oben nach unten geht").

The owner is the **last section whose box has crossed the top of the window**,
and the first section before any has. Sections tile the document, so that names
exactly one at every scroll position — no gap between two of them, and no moment
when two qualify.

It also puts the hand-over on a single pixel. A section reaches progress 1 — its
exit corner — at the moment its bottom edge touches the top of the window, which
is the same moment the section below crosses that line and takes over at *its*
progress 0, the entry corner directly beneath. The square goes out on one corner
and comes back on the same one.

**Progress is the box's own height, not the pinned-track formula.** `spanProgress`
subtracts a viewport once an element is taller than the screen, which is right
for a sticky track and wrong for an ordinary section: one 40px taller than the
window would get a 40px span, and the square would race its whole perimeter in
40 pixels and then sit in the corner. Ordinary sections use `sectionProgress`.
Its one extra term is `reach`, the scrolling the document has left — the **last**
section's bottom can never touch the top of the window, so on its own height the
square would stop halfway and never finish the page.

#### The box it walks

The tracked box is **what the reader sees the section as**, which is not always
the `<section>` element:

| Section | Box | Progress from |
|---|---|---|
| ordinary | the `<section>` — its top edge *is* its rule, its bottom edge the next one | itself |
| hero | everything **under the nav**, not the section: the section's top edge is the top of an opaque sticky band, and a square starting there starts out of sight | itself |
| sticky (`VoiceSwitch`) | the pinned frame, one viewport tall | the tall track, `[data-scroll-span]` |

The box is found as the element `SectionTrack` was dropped into, never as
`closest("section")` — those differ for the hero, and measuring progress against
a box the square does not walk puts it off its own corners.

A three-screen section would otherwise put the marker's halfway point a screen
and a half below the fold. A section that pins a child therefore has to **close
its own box** with a hairline top and bottom — the rails give it the other two —
or the square crosses an edge that is not drawn.

`SectionTrack` reaches the rails through a `Container`, so pass **`nested`**
when the host box is already on the `content` column. A `content` Container
inside another one applies *both* of its jobs twice — the gutter, and a
max-width that is itself "100% minus two gutters" — and the marker ends up a
gutter inside the rail, which reads as a rendering fault rather than as a
missing prop. With `nested` the layer takes the `full` step, which is the step
that means "whatever the parent is".

#### The rest

- 8×8px, filled `var(--ink)`, no rounding, moved with `translate3d`
- **Position from `getBoundingClientRect()` every frame, never a stored
  `offsetTop`.** An offset captured once is wrong after the first image that
  lands, island that hydrates or window that changes size, and a marker placed
  from a stale one drifts off its rail with no event to blame
- **`transform`, never `top`/`left`** — a transform is a compositor move, `top`
  is a layout change on every frame of every scroll
- **No CSS transition on the position.** The movement *is* the scrolling; a
  transition makes the square chase the reader down the page and land after they
  have stopped, which reads as lag rather than as animation. This is also why
  `prefers-reduced-motion` needs no case here — there is no animation to reduce
- Recomputed on `resize`, and through a `ResizeObserver` on the driver: a resize
  moves every corner at once, and a section that grows makes the same scroll
  position a different fraction of it
- Centred on the 1px lines, which lie just *inside* the box on its left and
  right and just below it at the bottom. Both corrections are linear in the
  point's own coordinate — the x nudge runs +0.5 to −0.5 across the box, the y
  nudge is +0.5 everywhere — so they are one term each and not a case per corner
- Progress comes from `spanProgress` in `src/lib/scrollSpan.ts`, shared with
  everything else that scrubs on scroll, measured inside a
  `requestAnimationFrame` — `getBoundingClientRect` forces layout, and doing
  that per scroll event ties the page's frame rate to the wheel
- **One rAF for the whole page**, and nothing measures while its section is off
  screen
- `z-index: 20`: above the cards, which have surfaces of their own and would
  bury it, and below the nav at 30, which is opaque — a marker passing *through*
  the nav would read as a bug rather than as chrome
- `aria-hidden="true"` — decorative, with no navigation function
- Hidden below 768px, where the rails are

**The path is never stroked.** The rails and the rules already draw this
rectangle; a second line on top would either double the hairline or sit half a
pixel beside it and read as a rendering fault.

**The CSS is in `layout.css`, not in a scoped block in the component.** The
layer's edges come from a `Container`, and `Container` does not spread the rest
of its props onto its root element, so Astro's scope attribute never reaches it:
a scoped `.section-track__column { height: 100% }` silently fails to match, the
box collapses to zero height, and the marker parks in a corner forever.

`PageChrome` is rendered **once**, in the root layout. A rail assembled from one
segment per section is a rail with seams, and the seams are the first thing the
eye finds on a long page.

---

## A bounded section

The default boundary is one line per section: `.section-rule` opens a section
flush with its top edge and the next section's rule closes it. A **bounded**
section draws both of its own lines instead and holds them a fixed distance
inside its own edges, so it reads as a framed band — empty space, line, the
section, line, empty space.

Reach for it when a section is meant to stand apart from its neighbours as a
single framed object. Everything else keeps the plain rule; `.section-rule` is
shared by five sections and is not to be redefined for one of them.

```astro
<section id="…" class="relative flex min-h-svh flex-col">
  <Container width="content" class="section-inset flex min-h-0 flex-1 flex-col">
    <div class="section-bounds section-bounds--fill">
      <SectionTrack nested />
      …the section…
    </div>
  </Container>
</section>
```

| Class | Element | Job |
|---|---|---|
| `.section-inset` | the `Container` | Holds the band `--section-inset` inside the section's top and bottom edges |
| `.section-bounds` | the block inside it | Draws both hairlines; **is the marker's tracked box** |
| `.section-bounds--fill` | the same block | Takes the section's leftover height — only for a section that has a height of its own |

### The inset is a share

```css
--section-inset: clamp(32px, 7svh, 80px);
```

63px at a 900px viewport, the full 80px from about 1143px up, and a 32px floor
below about 457px. A fixed 80px is generous framing on a desktop window and a
sixth of the whole thing on a laptop in landscape; the floor keeps the frame
from vanishing on a short window and the ceiling keeps it from eating a
one-screen section's budget on a tall one.

**It costs vertical budget, and a one-screen section has to pay for it twice.**
At 1440×900 the band is 126px shorter than the section. Any cap that is
computed from the viewport — such as section 6's
`--stage-cap: clamp(190px, calc(100svh - 548px), 460px)` — must add `2 ×
--section-inset` to its chrome figure, or the section overflows its screen.

### The marker has to be re-pointed at the band

`SectionTrack` walks the perimeter of the positioned box it is dropped into.
Leave it on the `<section>` while the rules move inward and the square rides an
inset *above* the top line and the same distance *below* the bottom one, which
reads as a rendering fault rather than as a wrong prop. So the track layer goes
inside `.section-bounds`, and because that block already sits on the content
column it takes **`nested`** — a `content` Container inside another one applies
its gutter and its max-width a second time and puts the marker 32px inside the
rail.

Two things follow, and both are silent when they are broken:

- **`.section-bounds` carries no inline padding and no inline border.** The
  track layer is `position: absolute; inset: 0`, so it is laid against that
  block's *padding* box, and the rails stand on the Container's content edges.
  Inline padding pulls the tracked box off the rails. Vertical padding is free —
  the padding box keeps its full height between the two rules — so the
  section's own breathing room goes there as usual.
- **The two lines are drawn by different means, and that is deliberate.** The
  marker is placed by its top-left corner with a flat +0.5px correction in y,
  which assumes the closing line lies just *below* the tracked box and the
  opening line just *inside* its top — exactly how an ordinary section is
  built. So the bottom line is a `border-bottom` (a border sits outside the
  padding box, at `[height, height+1]`, and the marker's centre lands on it) and
  the top line is a 1px `::before` at `[0, 1]` inside it. A `border-top` would
  sit one pixel higher and the marker would enter the section a pixel below its
  own opening line. The two are identical for the line and only the marker can
  tell them apart.

`VoiceSwitch.astro`'s pinned frame is the same idea arrived at from the other
direction: it is a framed box because the section is three screens tall, and it
hosts `<SectionTrack nested />` for exactly this reason.

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
- Rails per section instead of once in the root layout
- A rail or a section rule in `var(--hairline)`. At 1.4:1 on this canvas the
  line is invisible on a real screen; page boundaries are `var(--rule)`
- `var(--rule)` on the edge of an ordinary object — a small card, a logo cell,
  a table divider. It is the page's structure, not an object's outline, and
  used everywhere it turns the page into a wireframe
- A block as wide as the `content` column whose outer edge is `--hairline`
  while it is filled near the page colour, which stops both rails dead for its
  own height
- A one-viewport section closed by a rule flush with its bottom edge. That line
  lands on the edge of the window and is never seen with the opening one — such
  a section is bounded instead
- A section marker in the rails' own `z-index: -1` layer, where every card
  with a surface paints over it
- A second scroll indicator alongside the section markers — one page-long
  marker and one per section disagree about what "how far" means
- `SectionTrack` without `nested` inside a box that is already on the `content`
  column, which stands the marker a gutter inside both rails
- A sticky section that pins a child without closing its own box top and
  bottom, leaving the marker to cross an edge that is not drawn
- A section marker whose path does **not** alternate side, which jumps the full
  width of the column at every boundary
- More than one square painted at a time — a dot parked in every corner buries
  the one that is moving
- A tail on the path, which with a single square walks past the exit corner and
  then snaps back to it
- `spanProgress` for an ordinary section: it is the pinned-track span, and on a
  section barely taller than the window it collapses to a few pixels
- A hairline that begins exactly where a sticky opaque layer ends. The layer
  snaps its edge to a whole device pixel and paints over the line
- A CSS transition on the marker's position, which makes it lag the scroll
- Marker positions from stored `offsetTop` values, which go stale on every
  layout change
- Rail positions from recomputed pixel values instead of the `Container`
- An opaque background on a section, which paints over the rails. The page
  colour belongs on `<body>`
- Scroll maths in the scroll handler with no `requestAnimationFrame`
- A bounded section whose `<SectionTrack />` still sits on the `<section>`.
  The marker then walks a box the reader cannot see, an inset outside both
  drawn lines
- Inline padding or an inline border on `.section-bounds`, which takes the
  marker's tracked box off the rails

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
