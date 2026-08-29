# Hero — layout and interactive demo

> Builds on [`layout.md`](layout.md). The width steps (`prose`, `content`,
> `full`) and the `Container` component apply here unchanged. Colour, type and
> rhythm come from [`design.md`](design.md).

---

## Vertical budget

The hero fills exactly one viewport: `min-height: 100svh`. **Not `100vh`** — on
iOS the address bar slides in on scroll and the section changes height mid-
animation. The section has `overflow: hidden`.

The section is a **three-row grid**, `grid-rows-[auto_auto_1fr]`:

1. Nav — 64px, sticky, `full` step for the background
2. Copy — headline on `prose`, CTAs 32px under it
3. Demo stage — `content` step, takes the remaining row, **cropped** at the bottom

**Not a flex column with `justify-end`.** That pushes the whole block to the
bottom of the viewport and leaves a dead field above the headline — the copy
ends up past the middle of the screen, which is what this layout is for.

Spacing above the copy is in `svh`, so the proportions hold on a short laptop
and a tall monitor alike.

### Target proportions

Measured at 1440x900. These are the numbers to check a change against:

| Element | Top edge |
|---|---|
| Headline | ~13% of viewport height |
| CTAs | ~31% |
| Stage top | ~37% |

The stage runs past the bottom edge; about a quarter of it is never visible.

### The crop

The stage deliberately overruns the section's bottom edge and is clipped by
`overflow: hidden`. Its lower border is never visible.

This is not a bug, it is the scroll cue: a cut-off edge tells the visitor the
page continues. Roughly a fifth of the stage should disappear under the edge.

---

## Headline

- Centred, `text-balance`, `prose` step
- Wraps to 2–3 lines on desktop. A single line means `prose` is too wide
- **Exactly one headline, no subline.** If a subline feels necessary, the
  headline is too weak — fix the headline
- `line-height: 1.05`, size via `clamp()`

## CTAs

- Two buttons side by side, centred, 12px gap
- First filled (ink on cream, per `design.md`), second outline or ghost
- Below 640px they stack, each at full `prose` width

**Shape:** pill (`rounded-full`), at least 44px tall, at least 24px of
horizontal padding, at least 15px type. The hero is the one place that overrides
`design.md`'s 8px button radius — a hero CTA is read from across the room, and
the maintainer chose the pill here deliberately (2026-08-28). Everywhere else
on the site the 8px radius still applies.

---

## Demo stage

`content` step. No video, no canvas, no image sequence. **Everything is DOM.**
Every word in the mockup is real text in the markup — it is selectable,
searchable, and legible to a screen reader that ignores our `aria-hidden`.

```
position: relative
aspect-ratio: 16/10
border-radius: var(--radius-lg)
overflow: hidden
border: 1px solid var(--hairline)
```

Any background image goes through Astro's `<Image />` from `astro:assets` with
an explicit width and `loading="eager"` — this is above the fold.

### Scaling

An inner `div` of **fixed 1440×900px**, `origin-top-left`, then
`transform: scale(containerWidth / 1440)` driven by a `ResizeObserver`.

Every child measurement inside is in px. **No responsive styling inside the
stage.** Otherwise the mockup looks different at every viewport instead of
scaling like a real screenshot does.

```tsx
<div ref={wrap} className="relative w-full" style={{ aspectRatio: "16/10" }}>
  <div
    className="absolute left-0 top-0 origin-top-left"
    style={{ width: 1440, height: 900, transform: `scale(${scale})` }}
  >
    {/* windows live here, everything in px */}
  </div>
</div>
```

---

## Window composition

**One window.** Never two.

This was two overlapping windows — a chat with a voice panel tucked under its
lower right — until 2026-08-29. It made a better picture than the product. The
app's front page is a SINGLE section with a single `Voice | Chat` switch at the
top of its sidebar, and the app's own source says why in as many words
(`lib/homeSurface.ts`): "not two sections: both talk to the same assistant and
share one history". Two floating windows told a visitor there were two things.

So the window IS the front page, and the switch inside it is what moves between
the halves. The depth the overlap used to carry now comes from the backdrop
behind the window.

| Piece | Size |
|---|---|
| Window | 80% of stage width, centred, equal air above and below |
| Sidebar | 244 design px, the switch at its top |
| Reading column | 700 design px, centred in the stage area |

The window: `--radius-lg`, 1px hairline, a title bar with three circles left and
a centred title, `overflow: hidden`.

Both surfaces show the END of a conversation, so its beginning runs off the top
of the column. That edge is **faded, not cut** — the app fades a thought that
has outgrown its window the same way, and it is the difference between reading
as "scrolled" and reading as "broken".

---

## Interaction

**The `Voice | Chat` switch is the one live control.** Everything else inside
the window is real markup that does nothing, the way a screenshot does nothing.

- Left alone, the stage plays the voice rerun, hands over to the chat one, and
  comes back. A visitor sees both without touching anything
- The first press of the switch stops the **hand-over** for good. From then on
  the chosen surface loops, and the stage never changes surface by itself again
- Real hover states on rows and tabs
- Optional: stage tilt on `mousemove`, at most 6 degrees, spring-damped. More
  reads as cheap

The rule this obeys is still "the demo must not move out from under the
visitor's hand" — applied where it actually bites. **Freezing the rerun on the
first click would be the wrong reading of it:** pressing "Chat" is a request to
watch the chat rerun, and answering it with a still frame looks broken.

```tsx
useEffect(() => {
  if (reduced) return;
  const id = setTimeout(() => {
    const next = step + 1;
    if (next < script.length) return setStep(next);
    setStep(0);
    if (!tookOver) setSurface((s) => (s === "voice" ? "chat" : "voice"));
  }, script[step].duration);
  return () => clearTimeout(id);
}, [step, script, tookOver, reduced]);
```

---

## The two reruns

Each surface replays a conversation that already happened, continuing into one
live turn. Both are written down in `demoScript.ts` and nowhere else.

- One `Frame[]` per surface, each frame with a `duration`. A frame describes
  only the LIVE turn — its phase, how many tool rows are on screen, whether the
  answer is being written. The turns before it are always finished
- **Both show the reasoning.** The thinking streams in a scratchpad while it
  runs and folds to "Thought for Ns" over its own tool rows once it is done,
  which is what the app does and what makes an answer trustworthy rather than
  magical. A rerun without it is a demo of a chat box
- Waveform from a fixed amplitude array. **No `getUserMedia`**, no audio input,
  no permission prompt. A microphone prompt in the hero is a conversion killer
  and is usually blocked without a user gesture anyway
- Words arrive as a typewriter, ~22ms per character
- Content is **shorter** than the real app's: fewer rows, fewer options, larger
  type. The demo is read from three metres away, not at working distance

**The two are deliberately different jobs.** Voice is the thing you say while
your hands are busy — move the meeting, tell the team. Chat is the thing you
type because it ends in something written down — a summary, a page, a post. A
visitor who watches both should come away knowing they are one assistant with
two ways in, not two products. Giving both halves the same errand wastes the
second rerun.

The bar's state words and hints are the app's own locale strings, verbatim
(`voice_state.*`, `home.hint_*`). Colour comes from the `--app-*` tokens, which
are the running app's dark-theme variables. Never a literal in the component:
the clone is supposed to drift only when the app drifts.

### Where the view comes from — an open debt

The original spec said: import the voice view from a shared `packages/ui/voice/`
package, never copy it, and never import the app-level container (which drags in
auth, fetching, sockets and permissions).

**That import is not possible today.** There is no shared package: the app and
this site are separate repositories with separate histories, and this site
cannot import from the app checkout it happens to sit inside — that would couple
a public repo's source into a private site's build.

So the demo window is a deliberate, slimmed-down rebuild, and the *reason* for
the original rule still stands: it will drift from the real app. Two ways out,
whenever it matters enough:

1. Publish the view as a small package from the app repo and depend on it here.
2. Keep the rebuild, and treat drift as intended — the demo is already meant to
   be shorter and larger than the real UI.

Until one is chosen, whoever changes the app front page should glance at this
demo — both halves of it now. That is a weak guarantee, and it is written down here so it is at least a
known one.

---

## Accessibility

- The stage gets `aria-hidden="true"`
- Beside it, a `<p class="sr-only">` describing what is shown — both reruns,
  since the switch that reveals the second one is unreachable by keyboard
- Every interactive element inside the stage: `tabIndex={-1}`
- `prefers-reduced-motion`: no autoplay, no typewriter, no tilt — render the
  final frame directly

---

## Forbidden

- `100vh` instead of `100svh`
- A fixed height on the stage. Aspect ratio plus crop, nothing else
- Screenshots, video, canvas, or image sequences for the mockup
- Text in the mockup that is not real text in the DOM
- Responsive styling inside the stage
- A second floating window, or any window that is not the app's front page
- Network requests from the demo
- `getUserMedia` or any permission prompt in the hero
- A bespoke `max-width` on the section instead of a step from `layout.md`

---

## Skeleton

```astro
<section class="grid min-h-svh grid-rows-[auto_auto_1fr] overflow-hidden">
  <header class="sticky top-0 z-30 h-16 border-b border-hairline bg-canvas">
    <Container width="content" class="flex h-16 items-center justify-between">
      …
    </Container>
  </header>

  <div class="pt-[6svh]">
    <Container width="prose">
      <h1 class="text-center text-balance leading-[1.05]">…</h1>
      <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">…</div>
    </Container>
  </div>

  <Container width="content" class="pt-6">
    <div class="overflow-hidden rounded-2xl border border-hairline">
      <DemoStage client:load />
    </div>
  </Container>
</section>
```

The stage row is `1fr`, so it takes whatever height is left and runs past the
section's bottom edge, where `overflow-hidden` clips it. The stage is the one React island on the page — `client:load`, because it sits above
the fold and its first frame is the point; everything around it ships as plain
HTML.
