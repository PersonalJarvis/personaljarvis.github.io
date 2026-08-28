# Hero — layout and interactive demo

> Builds on [`layout.md`](layout.md). The width steps (`prose`, `content`,
> `full`) and the `Container` component apply here unchanged. Colour, type and
> rhythm come from [`design.md`](design.md).

---

## Vertical budget

The hero fills exactly one viewport: `min-height: 100svh`. **Not `100vh`** — on
iOS the address bar slides in on scroll and the section changes height mid-
animation. The section has `overflow: hidden`.

Order from the top:

1. Nav — 64px, sticky, `full` step for the background
2. Free space — `flex-1`, at least 80px
3. Headline — `prose` step
4. CTAs — 32px below the headline
5. Free space — 48px
6. Demo stage — `content` step, **cropped** at the bottom

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

**Note on shape:** `design.md` sets buttons to `--radius-md` (8px) — a compact
developer dialect. The hero uses that radius, not a pill. Where the original
spec said "pill", the design system wins; one shape language, not two.

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

Two windows. Never one, never more than three.

| Window | Position | z-index |
|---|---|---|
| Main | centred, about 78% of stage width | 10 |
| Voice | offset lower right, overlaps ~25% | 20 |

The overlap creates the depth. Positions are percentages of the stage, not px.

Both windows: `--radius-lg`, 1px hairline, title bar with three 8px circles left
and a centred title, `overflow: hidden`.

---

## Interaction

- Click a window: it comes forward, the other drops to `opacity: .85`
- Real hover states on list rows and buttons
- Autoplay steps through the script and stops **permanently** on the first user
  click (`userTookOver`). Otherwise the demo moves out from under the visitor's
  hand
- Optional: stage tilt on `mousemove`, at most 6 degrees, spring-damped. More
  reads as cheap

```tsx
const [step, setStep] = useState(0);
const advance = () => setStep((s) => Math.min(s + 1, script.length - 1));

useEffect(() => {
  if (userTookOver) return;
  const t = setTimeout(advance, script[step].duration);
  return () => clearTimeout(t);
}, [step, userTookOver]);
```

---

## Voice demo in the second window

- Data comes from `script: Frame[]`, each frame with a `duration`
- Waveform from a fixed amplitude array. **No `getUserMedia`**, no audio input,
  no permission prompt. A microphone prompt in the hero is a conversion killer
  and is usually blocked without a user gesture anyway
- Transcript as a typewriter, 24ms per character
- Content is **shorter** than the real app's: fewer rows, fewer options, larger
  type. The demo is read from three metres away, not at working distance

```tsx
const [shown, setShown] = useState("");
useEffect(() => {
  let i = 0;
  const id = setInterval(() => {
    setShown(full.slice(0, ++i));
    if (i >= full.length) clearInterval(id);
  }, 24);
  return () => clearInterval(id);
}, [full]);
```

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

Until one is chosen, whoever changes the real voice panel should glance at this
demo. That is a weak guarantee, and it is written down here so it is at least a
known one.

---

## Accessibility

- The stage gets `aria-hidden="true"`
- Beside it, a `<p class="sr-only">` describing what is shown ("Interactive demo
  with two windows: …")
- Every interactive element inside the stage: `tabIndex={-1}`
- `prefers-reduced-motion`: no autoplay, no typewriter, no tilt — render the
  final frame directly

---

## Forbidden

- `100vh` instead of `100svh`
- A fixed height on the stage. Aspect ratio plus crop, nothing else
- Screenshots, video, canvas, or image sequences for the mockup
- Text in the mockup that is not real text in the DOM
- Responsive styling inside the 1440×900 stage
- Network requests from the demo
- `getUserMedia` or any permission prompt in the hero
- A bespoke `max-width` on the section instead of a step from `layout.md`

---

## Skeleton

```astro
<section class="relative flex min-h-svh flex-col overflow-hidden">
  <Nav />

  <div class="flex flex-1 flex-col items-center justify-end pb-12">
    <Container width="prose">
      <h1 class="text-balance text-center leading-[1.05]">…</h1>
      <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button variant="primary">…</Button>
        <Button variant="secondary">…</Button>
      </div>
    </Container>
  </div>

  <Container width="content" class="shrink-0">
    <DemoStage client:visible class="translate-y-8" />
  </Container>
</section>
```

`translate-y-8` plus the section's `overflow-hidden` produces the crop. The
stage is the one React island on the page — `client:visible`, so its JavaScript
loads only when it scrolls into view; everything around it ships as plain HTML.
