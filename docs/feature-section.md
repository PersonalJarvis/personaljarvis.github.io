# Feature section — copy left, demo right

> Builds on [`layout.md`](layout.md) (step `content`, 1280px) and
> [`design.md`](design.md). Sits **below** the hero and the logo strip.
> The demo shows the app's **Plugins** section.

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
┌─ Card (white, radius 16, hairline) ─────────────────┐
│                                                     │
│  Copy            ┌─ Stage (cream, radius 12) ─────┐ │
│  vertically      │                                │ │
│  centred         │   ┌─ Window (white, radius 8)┐ │ │
│                  │   │                          │ │ │
│  Link →          │   └──────────────────────────┘ │ │
│                  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

White card, recessed cream well, white window floating in it. The stage carries
24px of its own padding so the window never touches its edge.

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

**Never** import the app's `PluginsView` or any app-side container here.

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
