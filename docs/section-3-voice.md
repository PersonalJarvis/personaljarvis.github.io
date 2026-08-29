# Section 3 — typing vs speaking

> Builds on [`layout.md`](layout.md); colour, type and rhythm come from
> [`design.md`](design.md). Sits below the hero, the logo strip and the feature
> section, and unlike the feature section it takes **a viewport of its own**.
>
> Implemented in `src/sections/VoiceSwitch.astro`.

---

## The argument

Two states of one scene. The same person, the same desk, the same camera:

| State | What is shown |
|---|---|
| **Before** (`manual`) | Hands on the keyboard, one on the mouse, leaning in toward the monitor |
| **After** (`jarvis`) | Leaning back, a desk microphone in one hand, a speech bubble, hands off the keyboard and mouse |

The contrast **is** the sales argument, and it only works while nothing else
changes. See "Frame consistency".

---

## Reference

The effect is modelled on <https://www.meuze.ai>, its "The day changes. The
plan moved first." section — the switch between a rainy Tuesday and a match
Saturday.

**Carried over:** the principle. Identical camera, identical scene, only chosen
details change, and the figures below change with them.

**Not carried over:** the dither look. See "Forbidden".

---

## Measurements

| Element | Value |
|---|---|
| Section height | `min-height: 100svh` |
| Width | `content` step — 1280px, and the viewport share above that |
| Picture | `aspect-ratio: 16 / 9`, `--radius-xl` (16px) |
| Eyebrow | above the headline, 14px, uppercase, `letter-spacing: .1em` |
| Headline | `prose` step, wraps to two lines |
| Figures | below the picture, four columns, hairlines from `gap: 1px` |

Order from the top: eyebrow → headline → tabs → picture → figures.

### How two width steps live in one section

The brief's skeleton caps the headline with `max-w-2xl` inside a `content`
container. That cannot be built as written, for two reasons:

1. `scripts/check-style.mjs` rejects a bespoke `max-w-*` in `src/sections/`, and
   `layout.md` reserves raw widths for the container and `layout.css`.
2. `layout.md` calls a left-flush prose column inside a centred content column a
   mistake outright: the page then has two different centres.

The `.layout` grid in `src/styles/layout.css` is the mechanism that document
provides for exactly this. The eyebrow and the headline take the default `prose`
column; the tabs, the picture and the figures carry `.wide` for the `content`
column. No width is named in the section at all.

Vertical padding is 80px (`py-20`), the section rhythm from `design.md`, rather
than the 96px the brief's skeleton showed. The section is a viewport tall, so
the padding only decides how close the block sits to the fold.

**Type comes from the px tokens, not from Tailwind's rem utilities.** The root
font size now grows with the viewport, so `text-sm` climbs to 19px on a 4K
screen while a token-sized headline stays at its 36px. `design.md`'s type table
is in px and governs; the eyebrow therefore takes `--text-body-sm` rather than
`text-sm`. Spacing utilities are left rem-based on purpose — a wider screen
getting a roomier page is what that change was for.

---

## The two frames

### How they were made

Generated with the Grok CLI's image tools at 1920×1080, 16:9, and committed to
`src/assets/scene/`.

Image 1 came from the prompt below. **Image 2 was derived from image 1 by
image-to-image**, never as a second prompt from nothing — that is the only way
the room survives the switch.

### Frame consistency (critical)

Both prompts describe **the same scene**. These stay word for word identical:
room, desk, monitor, chair, window, coffee mug, perspective, crop, and the
figure itself (clothes, hair, build).

Only these may change: the figure's posture, where the hands are, whether the
microphone is present, the speech bubble, and what is on the screen.

If the figure or the room visibly drifts, the frame is unusable and gets
regenerated — even when it looks good on its own.

**How the pair in the repo was checked.** Both frames were thresholded to ink
and compared: the desk edge lands on row 744 in both, the monitor's outer edge
on column 1132 in both, and a 50/50 blend leaves the desk, legs, mug, monitor,
stand, keyboard, mouse, stool and head outline solid black — meaning
pixel-identical. Only the arms, the microphone, the bubble, the face and the
screen contents differ. Image 2 is drawn with a slightly heavier stroke; that
survives a pure opacity fade unnoticed.

### Style block (copied verbatim into both prompts)

```
Simple hand-drawn cartoon in black ink on off-white notebook paper.
Bold uniform outline, no shading, no gradients, no color fills.
Stick-figure proportions: round head, dot eyes, simple curved line
for the mouth, noodle arms, minimal detail. Flat side-on view,
slightly wonky doodle linework as if drawn with a felt-tip pen in
a school exercise book. White background. No text anywhere.
```

**Never name an existing book series, cartoon character or illustrator in the
prompt.** The style is described through its properties. That is cleaner
legally and reproduces more reliably.

### Prompt, frame 1 — `manual.png`

```
[style block]

A person sitting at a desk, leaning forward toward a computer monitor.
Both hands on the keyboard, right hand also near a mouse. Shoulders
hunched, brow furrowed, small sweat drop by the temple. The monitor
shows a dense mess of small scribbled lines suggesting many open
windows. A coffee mug on the left side of the desk. Empty speech
bubble: none. Side-on view, full desk visible.
```

### Prompt, frame 2 — `jarvis.png`

```
[style block]

The exact same person at the exact same desk, same room, same
monitor, same coffee mug, same camera angle. Now leaning back
relaxed in the chair, one hand holding a small desktop microphone
on a round base near the mouth, the other hand resting on the
armrest. Hands NOT touching the keyboard or mouse. Calm expression,
slight smile. A large empty rounded speech bubble rises from the
person toward the upper left — the bubble is completely blank
inside. The monitor shows a few clean tidy lines instead of the
mess. Side-on view, full desk visible.
```

**The bubble stays empty.** Its text is DOM on top — see below.

---

## The speech bubble

Absolutely positioned HTML over the picture, never inside the drawing.

- Placed in **percentages of the picture**, so it keeps sitting where it was
  measured at every size. The drawn bubble's body spans 9–30% across and 1–32%
  down; the text box sits at 11.5% / 6% and is 17.5% × 23%.
- Set in the site's body face, never an imitation of handwriting.
- Type scales with the picture, not the viewport: the picture is a
  `container-type: inline-size` box and the bubble is sized in `cqw`. Same
  result as the scaled 1440px stage in `hero.md`, without the ResizeObserver.
- Appears only in the `jarvis` state, 200ms after the cross-fade has finished
  (450 + 200 = 650ms). Arriving mid-fade muddies both.
- Typewriter at 30ms per character.

**Content:** one sentence, never rotated.

```
Hey Jarvis, check my Google Workspace and tell me everything I need to know today.
```

The brief asked for a sentence quoted from the app README's "what you can say"
table. This one was chosen by the maintainer instead (2026-08-28) and is
evidenced from the code rather than the README: the `gmail`, `google_calendar`
and `google_drive` tool plugins are registered `jarvis.tool` entry points in the
app's `pyproject.toml`.

Two of the brief's three candidates do appear verbatim in the README
(*"Research vector databases."*, *"Open the browser and pull up the weather."*).
The third, *"When the download finishes, ping me on Telegram."*, does not appear
anywhere in it and must not be used as if it did.

---

## The tabs

Two tabs above the picture, labelled with the states.

- Real `<button role="tab">` inside a `role="tablist"`, never divs
- The active tab is marked with `aria-selected`, and arrow keys move between
  them with a roving `tabindex`
- **Autoplay** switches every 4s and stops **permanently** at the first
  interaction (`userTookOver`). It only runs while the section is on screen
- The starting state is `manual`. The visitor should see the problem first

---

## The cross-fade

Both frames sit in the same box, `position: absolute`, `inset: 0`,
`object-fit: cover`. Both load eagerly — a lazy second frame flashes white the
first time someone switches.

```css
[data-frame]                    { position: absolute; inset: 0; opacity: 0; transition: opacity .45s ease; }
[data-frame][data-active="true"]{ opacity: 1; }
```

Opacity and nothing else. No slide, no wipe, no zoom, no filter fade. The claim
is "the same place, a different state", and any movement destroys it.

---

## The figures

Four values below the picture, in a grid whose 1px gaps show a hairline-coloured
ground — the divider technique from `LOGOS.md`. Each cell is the number with a
`text-xs` uppercase label beneath it in `--muted`.

Every value is countable in the app's own source. None may be invented.

| Value | Label | Where it comes from |
|---|---|---|
| 32 | Providers | The app's `pyproject.toml`: 12 `jarvis.brain` + 8 `jarvis.stt` + 8 `jarvis.tts` + 4 `jarvis.realtime` entry points |
| 3 | Platforms | README: "One command on Windows, macOS, or Linux." |
| < 1 s | Spoken reply | README: the realtime model "answers in under a second"; "sub-second Ack-Brain" |
| 4 | Channels | README: "The desktop window, the browser, Telegram, and Discord all reach the same brain and share the same memory." |

### Why the figures do not change with the state

The brief says the bar switches with the picture. It cannot, honestly: every
provable value is a fixed property of the app and has no "before" counterpart,
so a switching bar would need an invented number — which this same document
forbids. The maintainer settled it on 2026-08-28: **the bar stays static.**

Changing that later needs four evidenced "before" values, not a design decision.

---

## Accessibility

- The picture is a `role="tabpanel"` region labelled by whichever tab is
  selected; the controls above it are `role="tab"` in a `role="tablist"`
- Each frame carries a real, descriptive `alt`
- The spoken line is real DOM text. It ships in the markup twice on purpose: a
  screen-reader copy that never changes, and an `aria-hidden` copy the
  typewriter animates. With JavaScript off, the sentence is simply there
- `prefers-reduced-motion`: no autoplay, no cross-fade, no typewriter. The
  visitor switches for themselves

---

## Forbidden

- Dither, halftone or raster filters on the frames
- Text inside a generated image — every word is DOM
- The title of a book series, a cartoon character or an illustrator in a prompt
- Two independently generated frames whose figure or room visibly differ
- Slide, wipe, zoom or filter transitions. Opacity only
- Invented figures
- Third-party logos or marks inside the drawings
- A bespoke `max-width` instead of a step from `layout.md`

---

## Open question

**Bubble legibility on a phone.** The bubble is a fixed share of the drawing, so
its text shrinks with the picture: readable from `md` up, small below `sm`.
Nothing in the brief covers it, and the fixes all cost something — moving the
line under the picture on small screens, or dropping the section's lower half
there. This is a decision for the maintainer, not for whoever edits next.
