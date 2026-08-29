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
survives the switch unnoticed.

Both are now masks rather than pictures, so this check applies to the paper
originals in `f8ee1e0`; redo it there if the pair is ever regenerated.

### Style block (copied verbatim into both prompts)

```
Simple hand-drawn cartoon in black ink on off-white notebook paper.
(The paper is removed again on the way in — see "How the masks were
extracted". It is in the prompt because it is what makes the generator
draw a felt-tip line, not because it reaches the page.)
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

## The sheets

The drawings are no longer pictures. They are **ink masks**: a single alpha
channel, 1 where the pen touched the page and 0 where the paper was. Both the
ground and the stroke colour are then tokens, and one file serves both sheets.

- Resting state — the **ground sheet**: the stage's own surface, strokes in
  `--ink`.
- Spoken state — the **inverted sheet**: an `--ink` ground of its own, strokes
  in `--canvas`.

The maintainer asked for "white first, then the black one slides in", said
while the site was still cream. The site went dark on 2026-08-29, so the pair
now reads dark-then-pale. **The relationship is what is kept, not the two
literal colours**: resting takes the page's own ground and the incoming sheet
is its opposite. Hardcoding white and black would put a lamp on a black page
for the resting state and make the incoming sheet invisible.

Two things this bought, beyond the look the maintainer asked for: the paper's
ruled lines and its red margin rule are gone with the paper, and the pair
dropped from 2.6 MB to 293 KB.

### How the masks were extracted

From the paper photographs, which are in the history at `f8ee1e0` and are the
only source if this has to be redone:

```python
a = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255
v = a.max(axis=2)                              # NOT luminance — see below
cov = 1 - np.clip((v - 0.30) / (0.62 - 0.30), 0, 1)
Image.fromarray(np.dstack([white_rgb, (cov * 255).astype(np.uint8)]), "RGBA")
```

`max(r, g, b)` rather than luminance is the whole trick. The notebook's margin
rule is red, so its red channel is high and `max()` reads it as almost-paper,
which the curve then wipes. Luminance would average it down to a mid-grey and
leave a pink line running down every sheet.

The band is 0.30 to 0.62 because the ink sits below 0.10 and the paper — rules
included — sits between 0.70 and 0.80. Anything above 0.62 is paper and is
erased; the gap keeps the strokes anti-aliased instead of jagged.

### The ground is its own element

A mask punches the strokes **out of** the element carrying it, so the element
is the strokes and nothing else. The ink sheet therefore needs a second box
behind it for its black ground. The two carry the same transform and arrive
together.

---

## The slide

The ink sheet enters from the right, over the white one, and leaves the same
way. `transform` only — 550ms on a standard ease.

```css
[data-frame="jarvis"],
[data-sheet-ground]              { transform: translateX(101%); transition: transform .55s cubic-bezier(.4,0,.2,1); }
[data-mode="jarvis"] [data-frame="jarvis"],
[data-mode="jarvis"] [data-sheet-ground] { transform: translateX(0); }
```

**This replaces the cross-fade, on the maintainer's instruction (2026-08-29).**
The earlier rule here was "opacity and nothing else", reasoning that the claim
is "the same place, a different state" and movement works against it. That
reasoning still holds for a *dissolve between two photographs*, which is what
it was written about. It does not survive the sheets: two grounds cross-fading
through each other spend 300ms as a muddy grey, and the moment that reads worst
is the middle of every switch. A sheet laid over another sheet is a thing that
happens to paper, so the movement now says something true rather than nothing.

The stage keeps `overflow: hidden`, which is what stops the off-canvas sheet
from being visible or scrollable. It is load-bearing, not decoration.

---

## The captions

One line per state, under the picture, cross-faded with the sheets.

The section used to be an eyebrow, a headline, a switch and a picture, which
left the switch making its point in mime — the visitor had to supply the
argument themselves from two drawings. Each caption says what its side of the
switch actually costs, and that is what makes the control worth touching.

Both are in the DOM at all times, stacked in one grid cell so the block cannot
change height. A caption that reflows the figures under it turns a switch into
a page jump.

Everything they claim is something the app does: voice in, a spoken answer, and
the Workspace plugins the bubble already names. The rule against invented
figures applies to prose too.

There is also a standfirst under the headline, on the `prose` column. It exists
because the headline alone is an assertion with nothing behind it until the
picture loads.

---

## The scroll rail

An L around the picture — down its left edge, then along its bottom — with a
marker showing how far the section has travelled through the viewport.

- `--p`, 0 to 1, is written to the wrapper by the script and read by CSS. It is
  measured against **the section**, not the document: a page-long bar would sit
  still while the section it borders scrolled past
- The first leg fills over the first half of that travel, the second over the
  rest, so the corner is the halfway mark and the marker walks the corner
  rather than jumping it
- Ink on a `--hairline-strong` track. **Not red.** The red the maintainer
  pointed at was the notebook paper's own margin rule, which the masks removed;
  it was never an accent, and this system has no accent to reach for
- The marker's ring is a `border` in the page colour. This system has no shadow
  tokens and the gate rejects one
- It reports a position the visitor is causing themselves, so it keeps moving
  under `prefers-reduced-motion`. Freezing it would make it wrong, not calm
- The rail is `aria-hidden`. Scroll position is not information a screen reader
  needs restated

The 20px outdent is the only thing in this section that leaves its column. It
drops to 10px below `768px`, where the gutter no longer has room for it.

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
- A cross-fade between the two sheets — see § "The slide"
- Removing `overflow: hidden` from the stage; the off-canvas sheet needs it
- Recolouring a sheet in the raster. Ground and strokes are tokens
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
