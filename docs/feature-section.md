# Feature sections — copy left, demo right

> Builds on [`layout.md`](layout.md) (step `content`, 1280px) and
> [`design.md`](design.md). Sits **below** the hero and the logo strip.

**Three cards, one shape.** Plugins, Skills and CLIs — three parts of the app,
drawn in three windows that are deliberately the same window. Two cards that
are nearly alike read as a mistake; three that are exactly alike read as one
product.

| Section | Demo | Shows |
|---|---|---|
| `Plugins.astro` | `plugins-demo/` | connecting a service, and a connection noticing it died |
| `Skills.astro` | `skills-demo/` | a skill is a file with a switch, and what sets it off |
| `Clis.astro` | `clis-demo/` | asking in plain language, and the evidence of what ran |

Everything structural is shared, and that is enforced by code rather than by
care: `src/components/window-demo/` owns the stage, the fit-to-both-axes
scaler, the reduced-motion query, the looping frame script, the window frame,
the title bar and the window header. A card supplies only what is inside the
window. If a measurement has to change, it changes in one file for all three.

---

## Reference

Layout model: the section on <https://cursor.com> under the logo strip, headed
"Agents turn ideas into code".

**The reference governs layout, measurements, proportions and nesting.** Not
copy, not content, not brand material. See `design.md` § "What this is not" —
the same rule that kept another product's accent colour off this site keeps its
words off this section.

---

## Measurements

| Element | Value |
|---|---|
| Card width | step `content` (1280px) |
| Card height | `aspect-ratio: 16 / 9`, at least 560px |
| Card padding | 56px, 32px below `lg` |
| Outer radius | 16px (`--radius-xl`) |
| Columns | 5/12 copy, 7/12 demo, 48px gap |
| Space above | 96px |

**The section deliberately does not fill a viewport.** No `100svh`, no
`min-h-screen`. It is about half a screen tall. That is what separates it from
the hero and keeps the scroll moving.

---

## Two nested levels

Depth comes from two radii inside one another, never from a shadow — the site
has no shadow tokens and the style gate rejects one.

```
┌─ Card (radius 16, hairline) ────────────────────────┐
│                                                     │
│  Copy            ┌─ Well (painting, radius 12) ───┐ │
│  vertically      │ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │ │
│  centred         │   ┌─ Window (radius 8) ──────┐ │ │
│                  │   │                          │ │ │
│  Link →          │   └──────────────────────────┘ │ │
│                  │ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │ │
│                  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Card, recessed well, window floating in it. The well carries 24px of its own
padding so the window never touches its edge.

### The well is a painting, not a colour

The well used to be flat `--canvas`. A window is never as tall as the box it is
centred in — the canvas is sized for the tallest frame of the script, and a
filtered frame is shorter still — so on the dark page that flat floor read as a
hole punched in the card rather than as a background. The maintainer asked for
the hero's treatment here too (2026-08-29).

It is the **same painting as the hero**, at a smaller size:
`src/assets/hero/stage-backdrop-well.webp`, 1280×720, because these wells render
at roughly 600px wide against the hero frame's 1216. Same source image, so the
two surfaces cannot drift apart.

- It lives in `window-demo/Stage.tsx`, so all three feature cards get it from
  one place and a fourth would too. It is not a prop and must not become one —
  a well without the painting is the bug this fixed
- Plain `<img>`, not `astro:assets`: the stage is a React island and cannot
  reach Astro's `<Image />`. `loading="lazy"`, because all three sit below the
  fold, and `alt=""` under the well's own `aria-hidden`
- **Licence:** generated for this site (xAI `grok-imagine-image-2.0`), so
  nothing third-party is attached to it. A replacement must be public domain or
  explicitly licensed, and recorded here and in `hero.md`

**What this does not fix, on purpose.** The empty area *inside* the window —
below a short list — is still the window's own surface. Filling it would mean
inventing rows the app does not have.

---

## Copy column

- Vertically centred
- Heading and body read as **one block**: same size, heading in `--ink` at
  weight 500, body in `--body` at weight 400. No gap between them, no `<h2>`
  jump in size
- 24px below, a text link with a trailing `→`
- The link is a real `<a>`, not a button

**On the link colour.** The original spec asked for an accent colour. This site
has none — `design.md` retired the borrowed hue and made the ink-on-cream CTA
primary. The link is therefore `--ink` with an underline on hover, which is the
same weight of emphasis this system uses everywhere else. Introducing an accent
for one link would contradict the document that governs every other surface.

Below `1024px`: copy full width, demo underneath. Copy stays first.

---

## Demo stage

Same technique as [`hero.md`](hero.md):

- An inner `div` at a **fixed 1440×1340px**, `origin-top-left`, scaled by a
  `ResizeObserver`
- Every child measurement inside is in px. **No responsive styling inside the
  stage**
- `overflow: hidden` on the stage

**One deviation from the hero, and why.** The hero scales by width alone,
because its stage owns its own aspect ratio and may grow as tall as it likes.
Here the card's height is already fixed by `16/9`, so a width-only scale would
push the window through the card's bottom edge on narrow screens. This stage
uses `scale = min(width / 1440, height / 1340)` and centres the canvas. Same
principle — one canvas, one transform, no responsive styling inside — applied to
a box whose height is decided for it.

**One window, not two.** The two-window composition belongs to the hero. Here a
single, larger window puts the eye on the one feature the section is about.

---

## Content: the Plugins section

### Truth, and how it is checked

Every name, count, date, status word, command, pattern and label in all three
demos was read out of the running app or its catalogs, and then checked a
second time by an adversarial pass whose only job was to refute the first. That
pass was not ceremony. It caught, among others:

- **Skills:** a row with its switch off (nothing in this install is off — the
  prefs sidecar overrides the one skill whose frontmatter says `disabled` back
  to active); "3 matches" for a query that really returns 9; match scores above
  1.0, which the scorer caps at 1.0; and a row order the API cannot produce.
- **CLIs:** the risk badge `monitor` beside `gh pr list --state open`. `monitor`
  is that tool's *default* tier; the gate resolves per command, and the
  whitelist entry `gh pr list*` downgrades this one to `safe`. The demo would
  have misstated the product's own safety gate — and the truth is the better
  claim.

The rule that follows: **a demo may be smaller than the app, never different
from it.** Fewer rows, fewer columns, larger type — but no string, count or
state that the app cannot produce. Where a value is runtime state rather than a
catalog fact (which CLIs are connected on a given machine), the frame stages it
and says so here.

The single deliberate exception is the CLI result frame's spoken answer, which
is per-run by nature. It is written to assert no number.

### Where the view comes from — the same open debt as the hero

The original spec said: split the app's section into a pure `PluginsView` and a
container `PluginsPanel`, move the view to `packages/ui/`, and import it here.

**That import is not possible today**, for the reason already recorded in
`hero.md` § "Where the view comes from": the app and this site are separate
repositories with separate histories, and this site cannot import from the app
checkout it happens to sit inside without pulling a public repo's source into a
private site's build. There is no shared package to import, and creating one is
its own project — publishing, versioning, a release channel.

So the demo is a deliberate, slimmed-down rebuild. What the split *was for* is
kept anyway, on this side of the fence:

- `PluginsView.tsx` here is **pure** — props only. No fetch, no effect, no
  context, no router, no socket. It renders whatever state it is handed
- `PluginsDemo.tsx` is the container: the scaler, the frame script, the
  take-over flag
- `frames.ts` holds the script and nothing else

That is the same seam the app-side refactor would have produced, so if a shared
package is ever published, this file is replaced by an import and nothing else
moves.

**Never** import the app's views or any app-side container here. The same
applies to all three demos.

### Shortening

The demo is read from three metres, not at working distance. Against the real
app: fewer rows, fewer options, larger type. A 1:1 copy reads as clutter.

The real section has 24 plugins, eight categories, four connection statuses,
five sign-in methods and four dialogs. The demo keeps five rows, three
filters, three statuses and no dialogs at all.

### Interaction

- Autoplay steps through the frames and stops **permanently** on the first user
  click (`userTookOver`)
- Real hover states on rows and buttons
- After take-over the window is a small working toy: the round button connects
  and disconnects, the filter pills filter. Nothing in it reaches the network
- No tilt. That belongs to the hero

---

## Accessibility

- The stage gets `aria-hidden="true"`
- Beside it, a `<p class="sr-only">` describing what the demo shows
- Every interactive element inside the stage: `tabIndex={-1}`
- The text link on the left is exempt — it is real and must be focusable
- `prefers-reduced-motion`: no autoplay. The script loops, so there is no
  meaningful "last" frame — it renders the opening one, which is also the calm
  one

---

## Forbidden

- `min-h-screen` or `100svh` on this section
- Two or more windows in the stage
- A shadow instead of the two nested radii
- Responsive styling inside the 1440×1340 canvas
- Importing anything from the app checkout
- Screenshots, video, canvas or image sequences. Every word is DOM text
- Network requests from the demo — including a CDN icon URL. Brand marks are
  bundled in `src/assets/brands/`, see the ledger there
- A bespoke `max-width` instead of step `content`

---

## Skeleton

```astro
<section class="py-24">
  <Container width="content">
    <div class="grid items-center gap-12 rounded-[var(--radius-xl)]
                border border-hairline bg-card p-8 lg:aspect-[16/9]
                lg:grid-cols-12 lg:p-14">

      <div class="lg:col-span-5">
        <p class="text-[26px] leading-snug">
          <span class="font-medium text-ink">…</span>{" "}
          <span class="text-body">…</span>
        </p>
        <a href="…" class="mt-6 inline-flex text-ink hover:underline">… →</a>
      </div>

      <div class="lg:col-span-7">
        <PluginsDemo client:visible />
      </div>

    </div>
  </Container>
</section>
```

The demo is the section's one React island — `client:visible`, so its JavaScript
loads only when it scrolls into view; everything around it ships as plain HTML.
