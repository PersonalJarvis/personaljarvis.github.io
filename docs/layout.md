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
- **Account for the nav, which is now over every section and not just the
  hero.** It was `sticky` inside the hero until 2026-08-29 and had unstuck long
  before any pinned section arrived, so a child at `top: 0` met a clear window
  from the second section down. It is `fixed` now, so the top
  `var(--nav-height)` of the window has lettering across it wherever the reader
  is. What changed with it is the *kind* of failure: the nav has no ground any
  more, so it does not hide what runs under it — the two simply overlap, which
  is legible enough to look deliberate and wrong enough to read badly. Anything
  that has to be **read** at the very top of the window takes
  `var(--nav-height)` of clearance and gives the same figure back out of its
  height. A pinned frame that already holds its own content an inset down from
  the section's edge needs nothing extra, and should not have a nav-sized gap
  bolted on top of the inset — that asymmetry is what made this boundary look
  unlike every other one.
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
is read whole instead of being crossed halfway. Three declarations, all in
`src/styles/layout.css`, and nothing per section:

```css
html                   { scroll-snap-type: y proximity; }
body > section         { position: relative; }
body > section::before { scroll-snap-align: start; }  /* 1px, invisible, top edge */
```

**The snap point is a 1px marker at the section's top, not the section box.**
A snap area *taller than the window* is its own case in the spec: every scroll
position at which the area covers the window counts as a valid snap position,
and the browser holds the reader inside that range. The voice section's
covering range runs from its top to two screens further down, and the far end
of it is exactly where the pinned picture has finished — so a reader who
scrolls in short bursts and lets go anywhere in that section's last screen is
pulled straight back to that end. The gesture nets zero, the picture re-pins,
and the only way out is one gesture long enough to clear the whole magnet.
Measured in Chrome on 2026-08-29 at a 1249px window: three wheel notches from
the end of the pin travelled 1064px and landed back where they started, and the
same gesture with `scroll-snap-type: none` kept all 1064. A 1px pseudo-element
cannot be taller than the window, so it has one snap position and no covering
range, and its top edge *is* the section's top edge — the same boundary the
section box was offering, without the trap. It draws nothing and is out of
flow, so it is not a flex or grid item and no section's layout can see it. The
`position: relative` is what keeps it positioned against its own section rather
than escaping to the top of the document.

**`proximity`, never `mandatory`.** `mandatory` means the scroll position must
always be on a snap point. Three sections here are taller than the window — the
pinned voice section is three screens, stargazers nearly two, install just over
one — and the only snap point any of them has is its own top edge, so
`mandatory` drags the reader back to that edge every time they scroll *inside*
one and the rest of the section cannot be reached. It is not a value to tune
down; it is unusable on a page whose sections are not all one screen tall.

**No `scroll-snap-stop: always`.** It turns every boundary into a wall a single
gesture cannot cross. That is a full-page slideshow, which is a different thing
from a page read at the reader's own pace.

**One selector, not a class per section.** The snap points are the section
boundaries — a fact about the page's structure, not a decision each section
makes. A class is a hand-maintained copy of that fact, and the section that
forgets it is the one boundary the page runs past. The same argument rules out
marking the tall sections by hand to keep them out of the trap above: "taller
than the window" is a fact about a rendered page at one window size, not
something a section can declare.

**The footer is not a snap point**, and gets none because it is not a
`<section>`. It is a quarter-screen at the very bottom, so its top edge lies
past the document's last scroll position; a snap point there could only pull
the reader back off the end of the page.

**`scroll-padding-block-start: var(--nav-height)`, and it is not optional.**
This paragraph used to say the opposite and end with the condition that has now
happened: the nav left the hero on 2026-08-29 and is fixed over the whole
document. A snap point *is* the top of the window, so without this every
boundary the page rests on — and every heading a nav link sends the reader to —
arrives underneath the nav, the section's own opening rule included.

**It is `var(--nav-height)`, never a second `4rem` written out here.** The nav
is laid out at that variable and the variable is `round(4rem, 1px)` against a
root size that scales with the viewport, so a hand-written `4rem` in the
scroll padding is not the same number as the nav's height on any screen where
the root size has grown — it is off by the fraction `round()` takes away, and it
drifts further the wider the window gets. Two spellings of one height is the
kind of drift nothing reports: the page simply lands every clicked heading a
few pixels under the lettering.

**`scroll-behavior: smooth` lives here too, on `html` and not on the nav.** A
fragment jump is the browser scrolling the *document*, so the document is what
decides whether that scroll is instant or travelled; putting the declaration on
the thing that happens to hold the links would leave every other anchor on the
page jumping. Reduced motion turns it off along with the snap — a reader who
asked not to be moved did not exclude the one movement they started themselves,
but a page that vaults four screens in one animation is exactly what that
setting is about.

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

### The chrome arrives; it is not always drawn

**The hero has no edges.** No rule across its top, no rails down its sides, no
marker on them. The first screen is meant to read as open ground, and a framed
field is a form. Everything the page frames itself with therefore starts at
nothing and comes in as the reader leaves the hero — asked for on 2026-08-29.

**It is scrubbed, not switched.** Chrome flipped on at some scroll position is
worse than chrome that was always there: two full-height hairlines would snap
down both sides of the window in a single frame, which is precisely the abrupt
arrival being got rid of. Coupling the arrival to the gesture instead means the
chrome is simply somewhere between absent and present at every scroll position,
and it withdraws on the way back up at exactly the speed the reader is
returning — which no timed animation can do, because a transition does not know
the reader changed their mind.

**Two numbers, written by the nav's script (`SiteNav.astro`) off one
measurement:**

| | Runs over | Read by | Asks |
|---|---|---|---|
| `--chrome-reveal` | 0.7 of a screen of the hero's floor travelling up | the rails, and `.section-marker`'s opacity | *is the hero over* |
| `--nav-veil` | 0.12 of a screen of document scroll | the nav's veil alone | *is anything passing under the lettering* |

**They are two because they are two questions, and that is not an
inconsistency.** The rails belong to the page *below* the hero and have no
business being drawn across the first screen, so they wait most of a screen.
The veil is there to keep the nav's lettering legible over whatever has
travelled up under it, and something has from the very first pixel of scrolling
— the hero's own headline, before any other section exists. Put the veil on the
rails' timing and the headline slides through the links unshaded for most of a
screen. Arriving early costs the veil nothing, because it *is* the page's own
ground colour: over the hero, which is that colour, there is nothing to see
until something brighter reaches it, which is exactly when it is wanted.

**The rails grow rather than fade, and upwards.** Fading a 1px line in leaves it
momentarily grey, and a grey hairline reads as a rendering fault rather than as
a fade; growing gives the eye an edge to follow. Upwards because the content the
rails belong to is arriving from the bottom of the window — a rail drawn
downwards would be moving against everything else on screen. It is a
`mask-image` ramp and not a height or a `clip-path`: a height lays the page out
twice, and a clip ends the line on a hard horizontal cut, which is the sliced
hairline again. The ramp fades the line out over its last few per cent, so what
the reader sees is a line being drawn.

**The default is 1, not 0.** With no JavaScript nothing is ever written, and the
page gets its chrome from the first frame — the site as it was, rather than one
permanently missing its rails. `SiteNav.astro` stamps `data-chrome` on the root
element from an **inline** script before the first paint, and that attribute is
what switches the CSS to the driven `0`. Inline is the whole point: an Astro
`<script>` is a module and therefore deferred, so it would run after the first
frame and the reader would see the rails drawn across the hero for one frame and
then wiped.

**Reduced motion keeps the open hero and drops only the travel.** Both numbers
step between 0 and 1 at the middle of their ramp instead of being scrubbed
through every value on the way, so that reader gets the chrome switched on as
they leave the hero rather than assembled around them. Pinning both at 1 is the
obvious reading of the setting and the wrong one: the hero having no rails and
no top rule is a decision about what the first screen looks like, not an
animation, and pinning quietly hands the one reader who asked for less exactly
the framed hero nobody asked for. It is spelled in the script rather than in a
media query because a media query cannot beat an inline custom property the
script has written on the root element.

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
- **The block is a row of near-canvas cards standing on the rails.** Wrapping
  `--rule` around the end cards would bend the line around their radius, which
  still reads as an interruption. Redraw the rails on top of the row so the
  line runs straight through. `LogoStrip` does this.
- **The block is narrower.** Then it does not stand on a rail at all and needs
  nothing.

`VoiceSwitch`'s figures grid is the awkward middle case: its dividers are 1px
grid gaps on a coloured ground, so the ground has to stay `--hairline` for the
cells while the outer edge has to be `--rule` for the rails. It carries
`border-inline: 1px solid var(--rule)` and keeps the hairline ground. It used
`padding-inline: 1px` — letting a pixel of its own ground show at each edge —
which worked only while the rails and the dividers were the same colour.

### Horizontal rules

A rule goes on an element **inside** the container, never on the section and
never on the container itself: the container's border box is one gutter wider
than its padding box, so a border there overshoots both rails and the joint
reads as a cross instead of a corner. Inside, the line starts and ends exactly
on a rail.

**Every section draws its own two, and nothing else on the page draws one.**
That is the whole convention now — see "One boundary, one shape" below for the
shell that does it and for what it replaced.

**One exception, and it is on the section on purpose: `.section-run-rule`.** It
is not a rule *inside* a section, it *is* a section's bottom edge — the joint
between two blocks of the run that opts out of the shell, where the marker's
tracked box is the `<section>` itself and nothing inside the Container is on
that edge. It dodges the overshoot the other way, by taking the container's
padding box (`--w-content-inner`) as its width rather than a border box. See
"A run of sections may opt out — together".

**`.section-rule` is not how a section opens any more, and it now has no users
at all.** The last one was the line under the sticky nav in `Hero.astro` — the
nav band's bottom edge, never a section boundary — and that line went with the
band when the nav left the hero on 2026-08-29. Reaching for the class to open a
section is what produced the doubled and tripled boundaries the maintainer
reported that same day.

**The class is kept anyway, and deleting it would be the mistake.** "One
horizontal line spanning exactly the two rails, and stopping on them" is a thing
this page will want again, and there is exactly one way to draw it correctly —
on an element *inside* the container, for the overshoot reason at the top of
this section. Left in place it is four lines of CSS nobody has to rediscover;
deleted, the next line someone needs goes on the section or on the container and
overshoots both rails, which is the failure this whole subsection exists to
prevent. It is retired, not wrong.

**Why `--nav-height` is a rounded figure, which outlived the line.** The old
band was 4rem against a root size that scales with the viewport, so its bottom
edge landed on a fraction of a device pixel — 75.83px at 1.5x — and a sticky
*opaque* band is a composited layer whose bounds are snapped to whole device
pixels before it is painted. At 75.83 the snap ate the row the rule was on: the
line sat at y=74.83, 83% of it fell in the row the layer gave up, and it reached
the screen at a sixth of its colour. It was present in the DOM, correct in the
box model, and reported as a missing divider (2026-08-29). Moving the line
inside the band was only half the fix; `--nav-height` being `round(4rem, 1px)`
was the other half. The band is gone and the rule with it, but the variable is
still the height the nav is laid out at and still the figure the scroll padding
and every sticky child measure against, so it stays rounded — one whole number
of pixels that everything agrees on. `round()` only takes the fraction off the
end: this is **not** a return to a frozen 64px nav. A `@supports` fallback keeps
a browser without `round()` on plain `4rem`, because a dropped `height` would
collapse the nav's row altogether.

The general lesson survives its own bug and is in the Forbidden list below: a
hairline that begins exactly where a composited layer ends is a hairline the
layer paints over.

### Vertical dividers between columns

Optional, in two-column sections. Use `gap: 1px` on a grid with a coloured
ground, not `border-right` — the same technique as the logo cells.

### The section marker

A small square per section, walking that section's own perimeter. It says two
things at once: how far the reader is through **this** section, and how much of
it is left.

> The square and the schedule that moves it are in
> `src/components/SectionMarker.astro`, rendered once from `Base.astro`; each
> section declares its own perimeter with `src/components/SectionTrack.astro`;
> the path, the pacing and the schedule's arithmetic are in
> `src/lib/sectionTrack.ts`; the boxes are in `src/styles/layout.css`.

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
M 0 0 V 100           open section: down the left rail, and that is all
M 100 0 V 100         open section: down the right rail
```

The square is placed with `getPointAtLength(progress × totalLength)`, which
gives the corners for free.

**The side alternates down the page — the serpentine.** A marker that always
ran down the left rail would leave every section at the bottom-right corner and
enter the next one at the top-left: a jump the full width of the column at every
boundary. Mirrored, each section's exit corner sits directly above the next
section's entry corner, and the page reads as one line folded back and forth.
The side is assigned from **document order at runtime**, not from a prop — a
section inserted in the middle would otherwise break the chain silently.
Counted over the sections that carry a marker rather than over every section on
the page: a section without one is not a link in the chain.

**But the side is a running total, not `index % 2`.** A section that closes on a
rule flips the side for the one below it; a section with no rule under it —
`<SectionTrack open />` — keeps it, because there is no line to cross and the
square hands over on the rail it came down. `sidesForTracks` folds that down the
page, which is the one rule that holds for both kinds. Parity is the same answer
only while every section closes, and it breaks the chain silently the moment one
does not.

**That is what `open` is for**, and it is a prop precisely because it is the one
thing document order cannot tell you: whether a rule is drawn under a section is
a fact about that section's own markup. Two sections use it.

`Clis.astro` is the last block of the run that opts out of the shell, whose
neighbour below opens on a pinned frame an inset further down, so there is
nothing at that joint to cross. The two blocks above it close on
`.section-run-rule` and are ordinary closed sections.

`Hero.astro` is the other, and it was found by the defect it caused: **nothing
rail-to-rail is drawn at the hero's bottom edge.** What closes the hero is its
own stage frame, a rounded card 75px higher up, and the last
`--section-inset` of the section is the tail that pulls that card's line clear
of the fold. Closed, the square turned off the rail at the bottom of the box and
ran straight across bare ground to the other rail (maintainer, 2026-08-29: "er
ist nicht ganz auf der Linie"). Open, it comes down the rail and carries on into
the logo strip's opening rule, which is the next line that actually exists.

**A section that draws a rule must not be `open`**, or the square runs past a
line the reader can see; **a section that does not must not be closed**, or it
crosses one they cannot.

Track all three on the section rather than `nested` inside a band, and that part
is unchanged: the three `<section>` elements tile the document, so the marker's
progress is unbroken across them, whereas a band is held an inset inside its
section — the square would stop at the band's bottom, wait out
`2 × --section-inset` of air, and reappear at the top of the next one.

**The path length is the pacing.** A closed section is 100 + 100 = 200, so the
marker spends half its scroll coming down the entry rail and half crossing the
closing rule. An open section is 100, all of it on the rail. Nothing else times
it, and anything that has to line up with it reads its milestones back out of
that ratio rather than carrying its own numbers — `VoiceSwitch`'s wipe does
exactly this, and it is a closed section.

**The path ends ON the corner, with no tail.** It used to run 20% further down
the exit rail and fade out there, which was the right shape while every section
painted a square of its own: the overhang covered the seam. With a single
square (below) a tail is a defect — it walks past the corner into the section
below and then snaps back up to it at the hand-over. Ending on the corner is
what makes the hand-over invisible, because that corner *is* the next section's
first point.

#### One square, in a fixed layer

There is **exactly one square on the page** (maintainer, 2026-08-29: "nur einen
Punkt, der ständig von oben nach unten geht"), and it is a single element in a
`position: fixed` layer rendered once from the layout. The sections do not hold
it; they only declare where their perimeters are.

**It used to be one element per section**, revealed with `visibility` for
whichever section the reader was inside. That put each square's geometry inside
its own box, which sounded right and cost three separate defects, all three
reported on 2026-08-29:

- **it disappeared.** A pinned section's square is drawn in the frame but timed
  by the tall track behind it, and the track keeps it long after the frame has
  scrolled off the top of the window. There was no square at all over the first
  screen of `This is being built in public`, and the same again after the
  stargazers globe and after the install steps
- **it was clipped.** The square overhangs its own corners by half its width, on
  purpose, so that it sits centred on the hairline — and several of the boxes it
  walks hide their overflow. Half of it was cut off at exactly the corners it is
  there to mark
- **it could not keep up.** Deciding whose square to reveal meant asking every
  section every frame whether it had crossed the top of the window: a dozen
  forced layout reads a frame for an answer that only changes when the page is
  resized

A fixed layer has none of those. Nothing clips it, there is one transform to
write, and the question "whose perimeter is this" is a comparison against
numbers worked out once.

#### The schedule

Each tracked section gets three scroll positions, in document coordinates,
computed on load and on every resize — never per frame:

| | |
|---|---|
| `enter` | progress 0. The square is on this section's entry corner |
| `leave` | progress 1. The square is on its exit corner |
| `hand` | the next section's `enter` — where the square is handed on |

`enter`..`leave` is **the box's own passage for an ordinary section** — its top
edge to its bottom edge crossing the top of the window — and **the pinned
stretch for a section that holds a sticky child**: the track's top, to the point
`viewport` short of the track's bottom, which is the last moment the child is
still pinned. Those are the two shapes a section has, and they are the same two
`src/lib/scrollSpan.ts` branches on, so the marker and anything else scrubbing
on the same section agree to the pixel.

**Whether a section is pinned is read off computed style, not off the markup.**
`[data-scroll-span]` says a section *can* pin. `Install` carries a track at
every window size and drops the pin — `position: static` on the sticky child —
whenever the frame is too short for its four steps, and the stargazers and the
voice section drop theirs below their breakpoints. Believe the attribute and
that section's running length becomes `track − viewport`, which at the window
where it has just stopped pinning is about a dozen pixels: the square crosses
the whole section in one wheel notch and then sits in the corner. That was "it
does not work at all in How to install Jarvis".

**`leave` to `hand` is a gap, and the square walks it.** Boxes do not tile the
document, however much the old note here claimed they did: a band is held
`--section-inset` inside its section, a pinned frame stops a whole viewport
before its track does, and the hero's box ends 80px above the logo strip's
opening rule. Left alone the square reaches a corner, waits the gap out and then
jumps to wherever the next box starts. Instead it slides from one section's exit
corner to the next one's entry corner over exactly that stretch of scrolling.
Both ends are on the **same rail** — that is precisely what the serpentine
guarantees — so the slide is vertical, and it reads as the square carrying on
down a line that is already drawn there.

That is also what keeps it on the screen at the end of a pinned section: the
frame leaves upwards, the next section's box arrives from below, and the square
crosses from one to the other in view the whole way.

`hand` for the last tracked section is the end of the document. Its bottom edge
can never reach the top of the window — the page runs out first — so on its own
height the square would stop somewhere in the middle and never finish the page.

#### The box it walks

The tracked box is **what the reader sees the section as**, which is not always
the `<section>` element:

| Section | Box | Progress from |
|---|---|---|
| ordinary | the `<section>` — its top edge *is* its rule, its bottom edge the next one | itself |
| hero | the hero's own box, which since 2026-08-29 runs the **full** height of the section: the nav used to be the first row of this grid and the box began under it, and now the nav is fixed over the document, out of the flow, and pays for its space with a `padding-top` inside the box instead. Nothing is lost to an opaque band at the top of it any more — and the marker is held at nothing across the hero regardless, because `--chrome-reveal` is 0 there | itself |
| sticky (`VoiceSwitch`, `Stargazers`, `Install`) | the pinned frame, one viewport tall | the tall track — `[data-scroll-span]`, but only while it is really pinning its child |

The box is found as the element `SectionTrack` was dropped into, never as
`closest("section")`. They coincide for the hero again now that the nav is not a
row of its grid, which is exactly why the rule has to be spelled out rather than
inferred: it held for a reason that has since gone away, and a lookup written as
`closest("section")` would be correct today and wrong the next time a section
puts anything above the box the square actually walks. Measuring progress
against a box the square does not walk puts it off its own corners.

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
- **The corners come from `getBoundingClientRect()` on the current section,
  every frame — never a stored `offsetTop`.** An offset captured once is wrong
  after the first image that lands, island that hydrates or window that changes
  size, and a square placed from a stale one drifts off its rail with no event
  to blame. It is one box a frame, two while the square is crossing a gap, and
  never the whole page: **which** section it is comes from the schedule, and the
  schedule is arithmetic on `window.scrollY`
- **`transform`, never `top`/`left`** — a transform is a compositor move, `top`
  is a layout change on every frame of every scroll
- **No CSS transition on the position.** The movement *is* the scrolling; a
  transition makes the square chase the reader down the page and land after they
  have stopped, which reads as lag rather than as animation. This is also why
  `prefers-reduced-motion` needs no case here — there is no animation to reduce
- **A still page costs one comparison a frame.** Nothing that decides the
  square's position changes without the page scrolling or the layout going
  stale, so an unchanged `scrollY` writes nothing
- Rebuilt on `resize`, on `load` — the pinned sections settle their own pinning
  there — and through a `ResizeObserver` on every tracked box, every track, and
  the body: a section that grows makes the same scroll position a different
  fraction of it, and a section growing *above* another one moves it down the
  document without changing its size at all
- Centred on the 1px lines, which lie just *inside* the box on its left and
  right and just below it at the bottom. Both corrections are linear in the
  point's own coordinate — the x nudge runs +0.5 to −0.5 across the box, the y
  nudge is +0.5 everywhere — so they are one term each and not a case per corner
- **One rAF for the whole page**, and the measuring that forces layout happens
  outside it — `getBoundingClientRect` in a scroll handler ties the page's frame
  rate to the wheel
- `z-index: 20`: above the cards, which have surfaces of their own and would
  bury it, and below the nav at 30. **That order used to be about an opaque
  band** — the square would have passed *through* the nav's own ground, which
  reads as a bug rather than as chrome. The nav has no ground any more, so the
  square travels the top `--nav-height` of the rail in plain sight, and that is
  correct: the rail is drawn there too, and a square that vanished for the first
  4rem of every section would be the defect instead. The order still matters,
  for a smaller reason — the wordmark starts exactly on the left rail, so the
  two do meet, and when they do the lettering is what should be on top
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

## The nav — lettering over the page, not a bar across it

> `src/components/SiteNav.astro` holds the markup and the script,
> `src/lib/nav.ts` holds the one list of links, and the boxes are in
> `src/styles/layout.css` beside the height they are measured against.

**It is `position: fixed`, `z-index: 30`, and rendered once from
`Base.astro`.** Until 2026-08-29 it was a `sticky` band inside `Hero.astro`, and
sticky pins a child only for as long as its own parent is on screen: the nav
slid out of sight at the hero's bottom edge and the other ten sections had no
nav at all. Sticky cannot be made to do this job, because it positions inside
its own containing block and the containing block would have to be the whole
document. Fixed takes the nav out of flow entirely, which is what "stays where
it is while the page moves" actually means, and a nav that belongs to the whole
document has to be rendered by the thing that owns the whole document.

**It costs the page nothing.** The hero pays back the `--nav-height` the band
used to occupy as `padding-top` on its own box, so nothing underneath it moved
and every proportion in [`hero.md`](hero.md) is the figure it always was.

**There is no band: no ground, no border, no rule under it — lettering only.**
The ground and the line were two thirds of the frame the hero was asked to lose.
What keeps the words legible over what passes beneath them — a lit painting, a
globe, a wall of logos — is `.site-nav__veil`: a gradient from `--canvas` to
transparent, **twice the nav's height**, so it has no bottom edge anywhere for
the eye to read as the underside of a bar. What the reader sees is the top of
the page quietly deepening, with the wordmark sitting in it. A shadow was never
an option: [`design.md`](design.md) is hairlines only, and
`scripts/check-style.mjs` § no-shadow fails the build over one.

**The strip is `pointer-events: none` and the controls take them back.** A
transparent 4rem strip across the window still swallows every click that lands
in it, and the hero's stage frame reaches within a hair of it on a short screen.

**Wordmark left, section links centre, one CTA right.** The links are the six
places a reader might actually want to be sent to — Plugins, Skills, CLIs, What
changes, Open source, plus Docs — and not all eleven sections: a nav that lists
every band is a table of contents, and a table of contents in a 4rem row is
unreadable at any width. The logo strip, the stargazer count and the gallery are
things the reader passes *through*.

**The list lives in `src/lib/nav.ts`, and its order is load-bearing.** The nav
renders from it and the scroll-spy resolves against it, so a second hand-written
copy is a copy that goes stale the moment a section is renamed, reordered or
removed — silently, because a link to an id that no longer exists still renders
and simply does nothing. That is not hypothetical here: `#docs` was linked from
five places on this site and no element has ever carried that id. All five now
point at `DOCS_URL`, the docs folder in the repository, which is one constant to
change on the day this site grows a `/docs` route.

**A link whose section is not on the page takes itself off the nav.** The script
looks each id up on load and sets `hidden` on the ones it cannot find. This is
not defensive coding: this page is edited by several hands at once and sections
are added, renamed and retired constantly — `open-source` was pulled out from
under the nav and put back within the hour on the day the nav shipped. Nothing
else catches it. The markup stays valid, the link renders, the style gate and
the build both pass, and the only symptom is a reader pressing something and the
page not moving. `hidden` rather than a removal, so the element is still there
on a route that does have the section — and it needs `.site-nav__link[hidden] {
display: none }` spelled out, because the browser's own `[hidden]` rule loses to
the link's `display: inline-flex` at the same specificity.

### The scroll-spy's owner rule

**The current link is the last one whose section has passed under the NAV** —
`aria-current="true"`, plus a 3px square laid out at all times and revealed with
opacity, so nothing shifts sideways as the reader crosses a boundary. A square,
and not a dot or an underline, because the page already answers "where am I" in
that shape on the rails; a second indicator in a second shape reads as a second
system.

**That line is one `--nav-height` lower than `SectionMarker`'s own, and the
difference is deliberate.** The marker resolves its owner against the top of the
*window*, because it walks the corners of a box and the corners are where the
box is. A nav link is lit for the section the reader can actually **read**,
which begins under the lettering — and which is also exactly where
`scroll-padding-block-start` lands a section when its own link is clicked.
Resolve the link against the window's top edge instead and a freshly clicked
link goes dark for the 4rem it was itself responsible for.

**The line is measured off the nav element, never read out of `--nav-height`.**
A custom property is not resolved by `getComputedStyle` unless it has been
registered with `@property`, so what comes back is the literal string
`round(4rem, 1px)`; `parseFloat` of that is `NaN` and the fallback quietly puts
the line at the top of the window — which is the failure above, and it shipped
that way for an afternoon: clicking *Skills* scrolled Skills to 76px, the
comparison used 0, and the link the reader had just pressed stayed dark. Asked
of the element, the number is right by construction and follows the root font
size as the viewport scales it.

**No `requestAnimationFrame` loop.** `SectionMarker` runs one because it moves a
square every frame for the life of the page; this writes two numbers and an
attribute, and only when the document actually scrolls, so it hangs off a
passive scroll listener with a frame's worth of coalescing. A `ResizeObserver`
on the hero covers the case a scroll listener cannot see: the page grows as
islands hydrate and images land, which moves the hero's floor without a scroll
ever happening.

### Below 768px

**The section links are hidden; the wordmark and the Download button stay.**
Same breakpoint as the rails, spelled the same way.

**There is no hamburger, and that is a decision rather than an omission.** A
menu button opens a panel, a panel needs a ground, and a ground is the one thing
this nav is built not to have. The five sections it lists are five scroll
gestures apart on a phone, which is a shorter journey than opening a menu to
pick one.

---

## One boundary, one shape

**Every section on this page is a band framed by two rules, held
`--section-inset` inside its own top and bottom edges.** Empty space, line, the
section, line, empty space. Two sections therefore always meet the same way —
closing line, `2 x --section-inset` of air, opening line — and there is no
second arrangement for a section to pick.

### What it replaced, and why the rule is absolute

Until 2026-08-29 the shell was one of three, and a section chose:

| Shell | Sections | Opening | Air |
|---|---|---|---|
| `.section-rule` + padding | logo strip, plugins, skills, CLIs, footer | one line on the section's top edge, closed by the next section | `py-20`, `py-24`, or a pair of clamps of the footer's own |
| pinned frame | voice, install | a `.section-rule` **and** the frame's own two lines | `4rem`/`--space-xl`, or `--space-lg` |
| bounded band | stargazers, built in public | two lines, inset | `--section-inset` |

Measured on the built page, the gaps between one boundary line and the next
came out at 78, 113, 114, 114, 80, 160 and 303 pixels, and one joint — voice to
the section above it — had no line at all. Worse, the two sticky sections drew
their `.section-rule` **and** their frame's top line, 76px apart at voice and
33px at install; with the card border of the section above in the same view,
that is three horizontal lines at one joint. That is the screenshot the
maintainer sent, with `meuze.ai` as the reference: one framed sheet per
section, the same air around every one of them.

The reference's own numbers, measured rather than eyeballed: **80px outside the
frame, 72px inside it, 1px rule, no radius, and the section's ground changes
underneath it.** `--section-inset` was already 80 at the top of its clamp, so
only the inner figure was new.

### The two numbers

```css
--section-inset: clamp(32px, 7svh, 80px);   /* outside the rules */
--section-pad:   clamp(48px, 6svh, 80px);   /* inside them       */
```

`--section-inset` is 63px at a 900px viewport, the full 80px from about 1143px
up, and floors at 32px below about 457px. A fixed 80 is generous framing on a
desktop window and a sixth of the whole thing on a laptop in landscape; the
floor keeps the frame from vanishing on a short window and the ceiling keeps it
from eating a one-screen section's budget on a tall one.

**The gap between two sections is twice the inset**, and that is the point:
both neighbours pay the same, so the rhythm cannot depend on which two happen
to be adjacent. It is also the one number that tunes the page's pacing.

**It costs vertical budget, and a one-screen section pays for it twice.** At
1440x900 the band is 126px shorter than the section. Any cap computed from the
viewport — such as section 6's `--stage-cap` — must add `2 x --section-inset`
to its chrome figure, or the section overflows its screen.

### The markup

Two classes on two elements that are already there:

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
| `.section-bounds` | the block inside it | Draws both hairlines, spends `--section-pad` inside them, and **is the marker's tracked box** |
| `.section-bounds--fill` | the same block | Takes the section's leftover height — only for a section that has a height of its own, and it spends `--space-lg` inside the rules rather than `--section-pad` |

`--fill` spending less is not an inconsistency. An auto-height band grows to
fit, so padding above and below its content is breathing room the section
simply takes; a filling band's height is already fixed by the screen and its
content is centred in it, so the same padding is not air around the content, it
is content the section loses.

### A pinned section reaches the same shape from the other side

`VoiceSwitch` and `Install` cannot use those classes: the box the reader sees is
inside a sticky child, three or four screens down a track. They reproduce the
two measurements instead — `[data-viewport]` takes `--section-inset` as its
vertical padding, `[data-frame]` draws `border-block: 1px solid var(--rule)` —
and the joint comes out identical to every other one.

**What they must not also do is open with a `.section-rule`.** Both did, and
that is where two of the doubled lines came from.

`Install` is the one asymmetric case on the page, and it is asymmetric because
only one of its two ends is a section edge: the top is `--section-inset` like
everything else, the bottom is `--space-lg`, because what sits there is the
closing CTA band rather than a rule and the section carries on for three more
screens of track below it. Paying a second inset there would cost the four
steps 56px of screen for nothing — and 56px is enough to push the section past
the window height at which it gives up pinning, which is why that query moved
with this change.

### The last band closes the rails

The rails are fixed and the full height of the window, so nothing in the flow
can shorten them: at the bottom of the document they ran past the footer's
closing rule and out of the window under it. Dropping the footer's closing
inset puts that rule on the last row of the document, where the rails do end on
it — and where it is also the bottom edge of the window, so the page closes on
a line nobody can see.

So the last inset is **painted** instead of empty. The footer's Container takes
`.section-inset--close` (no bottom padding) and the same height comes back as
`.section-close`, filled with `--canvas`. An in-flow background paints above the
`z-index: -1` chrome layer, so the rails are covered for exactly that height:
down the page, into the closing rule, stop. The rhythm is untouched — same
inset, same rule, same air — the air is just opaque now.

**Only the last block on the page.** Anywhere else this is the defect
["One ground, no section tone"](#one-ground-no-section-tone) warns about: an
opaque ground over the rails takes a bite out of the middle of two lines meant
to run unbroken. At the end of the page there is no middle to take a bite out
of. See [`footer.md`](footer.md) § "The page closes on its last line".

### A run of sections may opt out — together

Plugins, skills and CLIs read as one run: no band, no frame, no ground of their
own (maintainer, 2026-08-29). That is allowed, and the condition is in the word
*together*: the run has exactly one boundary at each end, drawn by its
neighbours, so the property this shell protects still holds. **A single section
leaving the shell is the old bug back**, because it changes what one joint looks
like and nothing else. See `Plugins.astro`, which carries the reasoning and the
four things that are load-bearing about it.

**Inside the run, each joint is ONE hairline — `.section-run-rule`.** The run
first shipped with no lines at all between the three, and read as a single block
too long to tell apart; the maintainer asked the same day for the blocks to be
separated again, quietly. A divider, not a box:

- It is a `::after` on the `<section>`, at `top: 100%` — the section's own
  bottom edge, which is where a `border-bottom` would sit and where the marker's
  flat `+0.5px` correction expects the closing line. It is the one horizontal
  rule on this page that is *not* inside a Container, and it may be: it is not a
  rule inside a section, it *is* the section's edge, and nothing inside the
  Container is on that edge — the content stops `--section-inset` above it. It
  avoids the overshoot the usual convention guards against by taking
  `--w-content-inner`, the container's padding box, as its width.
- **Only the joints, never the ends.** The last block of the run draws no line;
  the run's outer boundaries are its neighbours'. A rule there as well is the
  doubled boundary this shell exists to prevent.
- **Both neighbours share it**, and each pays `--section-inset` on its side. A
  banded joint is closing line, `2 x --section-inset`, opening line; this one is
  the same rhythm with half the ink, which is the whole point.
- **The blocks that carry it are not `open`.** A drawn rule is a rule the marker
  crosses — see below.

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

## One ground, no section tone

**The page is one black from the nav to the footer — `--canvas`, painted once
by `body` in `global.css`.** Nothing else paints a ground. Section boundaries
are carried entirely by `--rule`, which is sized to be legible on the first
glance precisely so that tone does not have to help.

For one build each section painted its own near-black under itself
(`--tone-deep` `#060605`, `--tone-floor` `#0a0a09`, `--tone-raised` `#131210`,
set with a `data-tone` attribute), with a shallow gradient inside each one so a
single section was not flat either. It was meuze.ai's white/near-black
alternation dialled down to what a dark page can carry — and dialled down that
far, it did not read as alternation. It read as an uneven black: three values
within two points of each other, plus a visible step at every joint where one
section's gradient ended dark and the next one's began light. The maintainer
asked for a single background black on 2026-08-29 and named the deep sections'
ground as the one to keep, so `--canvas` is `#060605` now.

**Do not give a section a background to bring the separation back.** Two
reasons, and the second one bites hardest:

1. It reintroduces the uneven black. Separation is `--rule`'s job.
2. The rails are a **fixed** layer at `z-index: -1`, between the page
   background and the content. An opaque background on an in-flow section
   paints *above* that layer, so the rails come out in pieces — one gap per
   section, the exact failure `global.css` warns about. It is why the retired
   tone layer had to be a `z-index: -2` pseudo-element rather than a plain
   `background`.

A block with a surface of its own — a card, the CTA band, an app mockup — is
still free to interrupt a rail. That is a surface, not a ground.

**One thing the single ground makes safe.** `--surface-card` lifts 15 points
off `--canvas`, and while the tones existed a section could spend that range: a
card on `--tone-raised` had only 6 points of lift left and read as a slightly
darker hole rather than a surface. The logo strip shipped that way for one
build. With one ground, nothing can eat the card step.

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
- A row of near-canvas cards standing on both rails without redrawing the
  rails on top of them (the line stops in mid-air; wrapping `--rule` around
  the end cards would still bend it)
- A one-viewport section closed by a rule flush with its bottom edge. That line
  lands on the edge of the window and is never seen with the opening one — the
  shell holds both lines an inset inside the section for exactly this reason.
  (`.section-run-rule` *is* flush with a bottom edge and is not this: those
  blocks are about half a screen, so the joint sits in the middle of the window
  with the block above it and the block below it both in view, which is the
  whole reason it reads as a divider between two things)
- **A section that opens with a `.section-rule` and also draws a framed body.**
  Two lines at one boundary, and with the block above them in view, three. It
  is the defect this shell exists to make unrepresentable
- **A vertical figure of a section's own** between a boundary rule and the
  content under it. There is one inset and one inner pad on the whole page;
  `py-20` beside a neighbour's `py-24` is invisible in review and obvious on
  the built page
- **A single section leaving the shell.** A run of sections may opt out
  together, because a run still has one boundary at each end; one section
  opting out just changes what one joint looks like
- **A `background` on a section** for its ground. The page has one ground
  (`--canvas` on `body`); a section background paints over the fixed rail
  layer and the rails come out in pieces, one gap per section
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
- **A layout figure read out of an unregistered custom property** with
  `getComputedStyle`. Nothing resolves it, so what comes back is the literal
  declaration — `round(4rem, 1px)` — and `parseFloat` of that is `NaN`, which
  falls through to whatever the fallback was and puts the measurement silently
  in the wrong place. Measure the element instead
- **The nav's veil driven off `--chrome-reveal`.** That number waits for the
  hero to be over, and the veil is answering the other question — whether
  anything is passing under the lettering, which is true from the first pixel of
  scrolling. On the rails' timing the hero's own headline slides through the
  links unshaded for most of a screen
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

## The numbers to tune

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

Two more govern the page's vertical pacing rather than its width, and they live
in the same file:

| Variable | Now | Effect |
|---|---|---|
| `--section-inset` | `clamp(32px, 7svh, 80px)` | Air outside a section's two rules. The gap between two sections is twice it |
| `--section-pad` | `clamp(48px, 6svh, 80px)` | Air inside them, in an auto-height band |
