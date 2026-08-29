# Section 6 — "Built in public": the videos and the numbers

> Builds on [`layout.md`](layout.md) and [`design.md`](design.md). Widths come
> from the `Container`, colour and rhythm from the tokens. This file governs
> what is specific to the video section: `src/sections/BuiltInPublic.astro`.
>
> **Its own viewport.** The section fills one screen and no more.

Layout reference: <https://www.bridgemind.ai>, its "Built in public" section.
The stat row at the bottom takes its styling from <https://meuze.ai>. What is
taken in both cases is the layout, the proportions and the embedding technique.
Not their text, their numbers or their content — see [`design.md`](design.md)
§ "What this is not" for why that line matters here too.

---

## What it says

Personal Jarvis is developed in public. Anyone who wants to know how it is
built can watch it being built — and can see, unrounded, how many people
currently do.

---

## Structure, top to bottom

1. The **top boundary rule**, an inset inside the section's own top edge
2. Eyebrow, `--text-caption-upper`, uppercase, `--muted`
3. Headline, **left-aligned**, two lines, the second one a step quieter
4. Standfirst, two to three lines, `--body`, held to a prose measure
5. The video card
6. The one-line disclosure
7. The stat row — four cells, four real numbers
8. The **bottom boundary rule**, the same inset above the section's bottom edge

**The headline is left-aligned, not centred.** That is what separates this
section from the hero on purpose.

**Both the headline and the standfirst sit on the `content` step**, not on the
`prose` column, and this is deliberate. `prose` is centred *inside* `content`
(see [`layout.md`](layout.md) § "Optional: full-bleed grid"), so a headline on
the prose column would start roughly 300px further in than the card below it
and the section would read as having two different left margins. The standfirst
keeps the prose **measure** through `max-inline-size: 62ch`, which is the thing
the prose width is actually protecting — a readable line length, not a
particular pixel.

**No body paragraph under the video card.** The reference has one; together
with everything else it does not fit in 900px of viewport height. That content
belongs in the standfirst. The single-line disclosure under the card is a
disclosure, not a paragraph, and is required — see "The facade" below.

---

## The two boundary rules and the marker

This section does **not** use `.section-rule`, the single opening line every
other section carries. It uses `.section-bounds`, which draws a rule at the top
**and** a matching one at the bottom, both held `--section-inset` inside the
section's own edges. The maintainer asked for it directly on 2026-08-29: the
opening line was to move down off the section's top edge, and a second line was
to close the section at the same distance from the bottom.

The classes live in [`layout.css`](../src/styles/layout.css) and are documented
in [`layout.md`](layout.md). Three things about them bind this section:

- **`--section-inset` is `clamp(32px, 7svh, 80px)`** — a share of the viewport
  with a floor and a ceiling, not a fixed 80px. It is 63px per side at 900px of
  viewport height and reaches its 80px ceiling above roughly 1143px.
- **`<SectionTrack nested />` goes INSIDE the band.** The marker measures
  whatever positioned box it is dropped into. Left on the `<section>`, the
  square would ride an inset above the top line and the same distance below the
  bottom one — which reads as a rendering fault, not as a wrong prop. `nested`
  is required because the band already sits on the content column.
- **The band takes no inline padding and no inline border, ever.** The track
  layer is laid against the band's padding box, and the two rails stand on the
  `Container`'s content edges. Horizontal padding here silently walks the
  marker down the middle of the section. Vertical padding is free.

The `<section>` itself no longer carries `relative`. Its containing-block job
moved to the band with the marker.

---

## Measurements

| Element | Value |
|---|---|
| Section height | `min-height: 100svh`, band centred inside the two rules |
| Width | `content` step |
| Boundary rules | 1px `--hairline`, `--section-inset` from each section edge |
| Band padding | 24px top and bottom, inside the rules |
| Video card | 16px radius, 1px hairline, 16px padding |
| Card head | 44px tall, title left, link right, seam below |
| Featured video | `aspect-ratio: 16/9`, width follows the height cap |
| Playlist | three entries stacked, takes the remaining column |
| Stat row | four equal cells, 1px `--hairline` between them, no other chrome |

### The one number to tune

```css
[data-bip] {
  --stage-cap: clamp(190px, calc(100svh - 440px - 2 * var(--section-inset)), 460px);
}
```

`434px` is everything in the section other than the video itself, measured
against the built page at 1440×900:

| Part | Height |
|---|---|
| Band padding, top | 24px |
| Eyebrow | 16.5px |
| Gap | 12px |
| Headline, two lines | 86.4px |
| Gap | 16px |
| Standfirst, two lines | 51.2px |
| Gap | 24px |
| Card chrome — 2px border, 32px padding, 44px head, 12px seam gap | 90px |
| Gap | 12px |
| Disclosure line | 19.5px |
| Gap | 24px |
| Stat row, one line | 33.0px |
| Band padding, bottom | 24px |
| Bottom boundary rule | 1px |
| **Total** | **433.6px → 434px** |

If any of those change, re-measure and change this number — not the individual
rules.

**`--section-inset` is subtracted as the token, never as a number.** It is
itself a clamp on the viewport height, so a constant folded in here would be
right at exactly one window size and wrong at every other one. That is the same
mistake as a hard line break in a headline, one layer down.

Everything else follows from the cap. The featured column is

```css
minmax(0, min(68%, calc(var(--stage-cap) * 16 / 9)))
```

so the video keeps its 16:9 ratio and is never cropped or letterboxed: on a
tall screen it settles at the 68% the reference uses, and on a short one the
height wins and the width follows it down. The playlist takes the remainder, so
no empty gap ever opens inside the card.

### 68% and 900px cannot both hold — and the height wins

At the `content` width a card is 1216px wide, so 68% of it is an 805px video,
which is 453px tall on its own before the head and the padding. Add the
eyebrow, the headline, the standfirst, the disclosure, the stat row and 126px
of boundary inset, and the section comes to well past the viewport it has to
fit in.

The brief settles this: *"Passt die Karte nicht, wird ihre Höhe reduziert,
nicht die Kanal-Karten weggelassen."* So the card gives way. Measured on the
built page:

| Viewport | Section height | Inset per side | Video |
|---|---|---|---|
| 1440×900 | **900px exactly** | 63px | 604×340, **49.7%** of the card |
| 1920×1200 | **1200px exactly** | 80px | 804×452, **66.1%** of the card |
| 1280×900 | 900px exactly | 63px | 604×340 |
| 1024×900 | 900px exactly | 63px | 576×324 |

Only the two middle widths moved when the budget went from 440px to 434px, and
that is not an accident about where the height went — it is which of the two
limits on `--stage-cap` is doing the work. At 1440px and 1280px the height cap
is the binding one, so six pixels of budget are six pixels of video. At 1920px
the cap has already hit its 460px ceiling and at 1024px the 68% width limit
binds first; at both of those the video is as large as it is allowed to be for
a reason that has nothing to do with the budget, and neither number moves.

The video is smaller than it was before the two rules existed — it was 53% of
the card when the section had one rule and no inset. The 25px the one-line stat
row gave back went here, which is the 45.2% → 48.8% step, and setting the
caption at the figure's own size gave back 6.6px more, which is 48.8% → 49.7%.
126px of the height went to the frame the maintainer asked for, and the video is
the part of this section that gives way. That is the trade, stated rather than
hidden.

**The one-screen guarantee has a floor.** `--stage-cap` bottoms out at 190px,
below which the video stops shrinking, so the section fits a window down to
about **733px** of viewport height and is taller than the window below that. At
1440×700 it is 728px against a 700px window. A video that keeps shrinking is
worse than a section that scrolls by 50px.

**The playlist must never decide the card's height.** It did once: the entry
thumbnails were sized at 40% of the rail, and since they are 16:9 their height
grew with the column, so three rows came to 440px against a 352px video and the
rail silently became the tallest thing in the card. The thumbnails are a fixed
140px wide for that reason, and the rail additionally carries
`max-block-size: var(--stage-cap)`.

Below 1024px the playlist moves under the video and the height cap is released
— once the section is allowed to be taller than one screen, holding the video
to a viewport-derived height only makes it small for nothing. The two boundary
rules still draw, still at `--section-inset` from the section's edges.

---

## The head

**The head is centred; the card and the stat row are not.** Set flush left, the
eyebrow and the headline started on exactly the same x as the card's own left
edge one line below, and the maintainer read that as the type being stuck to
the boundary rather than as an alignment (2026-08-29). Centring is a head
treatment only — eyebrow, headline and standfirst — and the boxes below keep
the content column's left edge, so the section still has one left margin and
not two.

It is centred on `content`, not on `prose`: prose is centred inside content and
300px narrower, so a prose head would centre on a different axis than the card
it sits over. The standfirst keeps its 62ch measure and gets `margin-inline:
auto` with it — centring the text inside a box that is still flush left would
put the standfirst's centre axis left of the headline's on any window wider
than the measure.

## The headline

Two sentences, two lines, centred. It is built from **two block spans**,
never a `<br />`. The hard break was there and it was wrong for three reasons,
each of which the block version fixes:

- **A `<br />` is a layout decision frozen at one width.** At the content step
  both sentences fit on a line each with room to spare, so the break was doing
  nothing; on a narrower window the first sentence wrapped on its own and the
  headline became three lines with the break in an arbitrary place.
- **It broke the section's accessible name.** `aria-labelledby` points at this
  heading, and a `<br />` contributes no separator to the computed name, so the
  section announced as "…built in public.You can watch…". A block boundary does
  contribute one.
- **Nothing led.** The two sentences were the same colour, so the eye had no
  order. The claim is now `--ink` and the invitation `--body`: same size, same
  tracking, same centre line, one step of contrast between them. It is the
  smallest instrument this system has for saying "second".

Each span carries `text-wrap: balance`, so a sentence forced to wrap on a
narrow window splits evenly instead of leaving one word alone.

**The eyebrow is required.** Every other section on this page opens with one,
and section 6 was the only one that went straight from a rule to a large gap to
a headline — which read as a fault rather than as pacing. "On camera", not "In
the open": that is the stargazers section's eyebrow one screen further up.

---

## The videos

**Featured:** `3nV-3ygIJ0I` · **Playlist:** `BBcwq0jn7_E`, `0ZrUVxfKFME`,
`M5PbmWV8OQc`, in that order.

**Titles are never invented.** They are read from the oEmbed endpoint and
pasted verbatim, inconsistent capitalisation and trailing full stops included:

```
https://www.youtube.com/oembed?url=https://youtu.be/{ID}&format=json
```

The dates under the playlist entries are each video's real `uploadDate`, taken
from its own watch page. Both live in the `VIDEOS` array in the section.

### The playlist swaps, it does not consume

The rail holds the three videos that are **not** on the stage. Clicking one
trades it with whatever is featured, so the rail keeps exactly three rows and
all four videos stay reachable — a rail that simply replaced the featured video
would strand the one it started with.

- A click swaps the stage; it never opens YouTube
- The card head's title and its "Watch on YouTube →" link both follow the
  stage, so the link never points at a video the visitor is not looking at
- No auto-scroll, no endless loop
- A swap while the facade is up **contacts nobody**. If a video is already
  playing the visitor has already chosen YouTube for this visit, so the swap
  keeps playing rather than dropping them back to a poster frame

### The three seams inside the card

Requested on 2026-08-29: *"really only very small and discreet"*. Three seams,
each in a gap that already existed, each 1px of **`--hairline-soft`** — the
quieter of the two hairline tokens — and nothing else. No shadow (the style
gate rejects one, and this system's depth is hairlines anyway), no second
background, no radius.

| Seam | How it is drawn |
|---|---|
| Card head → body | `border-block-end` on `.bip-cardhead`, plus 12px of margin under it |
| Stage column → rail column | `border-inline-start` on `.bip-rail`, with 12px of gap on its left and 12px of padding on its right |
| Between the rail's three entries | a `::before` on `li + li`, centred in the 8px row gap and inset 8px at each end |

**At `--hairline` all three would read as three more borders inside a bordered
card.** `--hairline-soft` is the difference between a seam and a subdivision.

**No seam crosses content.** Commit `51efb59` removed a seam from the
connection strip because it struck a line through every mark on a strip that
stands still most of the time. The rule that keeps these three safe is that
each one lies in a gap between two regions and never across something a visitor
is looking at. The rail's entry seams are inset at both ends for the same
reason: no two hairlines meet at a corner, and none of them runs into the
card's 16px radius.

---

## The facade — binding

**No YouTube iframe on page load.** A real embed pulls roughly a megabyte of
JavaScript from several Google hosts and costs 20–30 Lighthouse points.

1. Show a static thumbnail and a play button
2. Create the iframe on click, with `autoplay=1`

`youtube-nocookie.com` rather than `youtube.com` is binding: the ordinary embed
domain sets its tracking cookies on arrival.

### Thumbnails are self-hosted

They are fetched **once** by `scripts/fetch-video-thumbs.mjs` and committed to
`public/video-thumbs/`:

- `{ID}.jpg` — 1280×720, for the stage
- `{ID}-sm.jpg` — 320×180, for the playlist rail

Two sizes because one cannot serve both slots: the rail renders its thumbnails
at about 140px, and handing it the 1280px file ships ten times the bytes it can
show. Re-run the script after changing the `VIDEOS` array.

**Never load them from `i.ytimg.com`.** That sends every visitor's IP address
to Google on page load, before they have agreed to anything — the same
disclosure the facade exists to prevent, just through the image tag instead of
the iframe.

Because the connection *is* opened on click, one line under the card says so,
`--text-caption`, in `--muted`. Not `--muted-soft`: `design.md` reserves that
for disabled text at 3.7:1 and a note about where someone's data goes is the
last thing on the page that should be hard to read.

That same line also carries the counters' provenance, in one line rather than
two, because a second line costs 32px of the budget above and the video pays
for it. It sits above the row it describes rather than below it. That is a
compromise and the only one in this section: it is where a reader already looks
for "how this page behaves", and the alternative was a smaller video.

---

## The stat row

Four cells. YouTube subscribers, X followers, GitHub stars, Discord members —
in that order, left to right: YouTube first because the section is about a
video series, Discord last because it is the invitation the reader leaves on.

Styling reference is meuze.ai's stat row, and the whole of it is:

- one horizontal row of **equal cells**, `repeat(4, minmax(0, 1fr))`
- **thin vertical hairlines between them and nothing else** — no card, no
  fill, no border round a cell, no radius. The divider is the only chrome
- a **plain tabular number**, `--text-display-sm`, in `--ink` at weight 400
- an **uppercase caption beside it at the same size**, `--text-display-sm` with
  `--tracking-caption-upper`, in `--muted` at weight 500, sitting on the
  figure's baseline. `flex-wrap` is the escape hatch rather than a media
  query — where the caption no longer fits beside its figure it drops back
  under it
- where the reference puts a small square bullet before the caption, **ours
  puts the platform's own brand mark**, sized in `em` so it follows the caption

**One size for both halves of the cell.** The caption was `--text-caption-upper`
— a third of the figure — until 2026-08-29, when the maintainer asked for it "the
same size as the 12". The reference sets a large figure against a tiny label;
this row now sets both at `display-sm`, so a cell reads as one line of type in
which the number and its label carry equal weight. What separates them is colour
and weight, not size: `--ink` at 400 against `--muted` at 500.

It is the caption that was raised and the figure that came down to meet it,
because the row has a width budget and the caption is the wide half of it. At
2560px — where a cell is narrowest relative to the root size, since below it the
content column is pinned at 1280px while the type keeps shrinking and above it
the column grows faster than the type — "12 SUBSCRIBERS" uses 253px of the 280px
it has. One step up, at 1.5rem, it uses 274px, and six pixels is a coin toss
rather than a margin. Raising the caption while leaving the figure at
`display-lg` fits at that width too, but leaves 2.5px at 1024px, which is the
same coin toss one breakpoint down.

The same instruction is why the caption was already beside the figure rather
than under it, asked for on the same day: a cell is around 300px wide and the
caption was roughly 110px of it, so the width was there and the stack was
spending height the section has to buy back from the video. The caption is about
215px of the cell now, so the shape survives and the slack does not.

The dividers go on `li + li`, never as a border on every cell: the row's outer
edges are the rails, and a second hairline a pixel beside a rail is exactly the
rendering fault this page's chrome is careful to avoid. The first cell has no
inline-start padding either, so the first number starts on the same left edge
as the card above it. Three left margins in one section is two too many — and
the head, which is centred, is not one of them.

### The marks

`YouTubeMark`, `XMark`, `GitHubMark`, `DiscordMark`, each registered in
[`LOGOS.md`](LOGOS.md) § "Marks used outside the strip". Never an emoji, never
a monogram, never a letter in a box.

`XMark` was added for this row; there was no X mark in the repo. **It is not
`XaiMark`** — that is xAI, a different company whose mark is also a small black
shape and whose file sits one letter away in an alphabetical import list. The
wrong one renders perfectly, which is why both this file and `LOGOS.md` say so.

Each mark gets its own **optical height**, the same method the strip uses,
because a shared box size makes marks look wrong — each glyph fills a different
share of its own viewBox. `inline-size: auto` lets the viewBox set the width;
forcing Discord's 256×199 mark square would squash it.

| Mark | `block-size` | Rendered |
|---|---|---|
| YouTube | 16px | 16 × 16 — the glyph is 17 of 24 units tall, so it needs the largest box |
| X | 12px | 12 × 12 |
| GitHub | 13px | 13 × 13 — fills its box corner to corner |
| Discord | 12px | 15.4 × 12 |

### Live where it can be, dated where it cannot

Each cell counts up from zero when the row scrolls into view, in about 900ms,
then — on the two platforms that allow it — corrects itself to the current
figure. `prefers-reduced-motion` skips the count-up entirely and shows the
number from the first paint. The component is
`src/components/counters/LiveCount.tsx`; the data is `src/lib/socialCounts.ts`
over `src/data/social-counts.json`, refreshed by
`scripts/fetch-social-counts.mjs` on a daily workflow.

| Cell | Source | Live in the browser? |
|---|---|---|
| GitHub stars | `api.github.com`, `stargazers_count` | **Yes** — anonymous, `access-control-allow-origin: *` |
| Discord members | `discord.com/api/v10/invites/…?with_counts=true` | **Yes** — anonymous, echoes the caller's origin, `credentials: "omit"` |
| YouTube subscribers | channel page HTML, server-side | No — the page sends no CORS header at all, and the Data API needs a key |
| X followers | read by hand from the profile header | No — no keyless route survives; even a keyed one is a paid credential |

The real figure is **server-rendered**, so a crawler and a reader with
JavaScript off both see the true number. The drop to zero happens in a layout
effect, before paint, so nothing flickers. Every live failure path — offline,
rate-limited, blocked — leaves the committed figure standing.

**The date in the disclosure line is `SOCIAL_BUILT_READ_AT`, never the JSON
file's `generatedAt`.** `generatedAt` moves whenever *any* of the four figures
moves, the two live ones included, so the first morning the repo gains a star
the line would start dating the subscriber and follower counts to that day —
a day on which neither was read, and without an `X_BEARER_TOKEN` the follower
figure is never re-read at all. The exported constant is the older of the two
build-time cells' own `readAt`, so the sentence is never newer than the staler
of the numbers it describes. A date the page cannot back up is the same defect
as a figure it cannot back up.

**A third-party mirror was rejected on purpose**, not for lack of a route:
`api.socialcounts.org` answers with the right YouTube figure and a permissive
CORS header today. Using it would make a number on our own front page depend on
a stranger's uptime, rate limiting and continued goodwill. If that trade is
ever worth making it is a one-line addition to `LiveCount`'s `LiveSource`
union — but it should be a decision, not a default.

### Numbers — the rule, and the day it changed

**On 2026-08-29 the maintainer overruled the previous "no numbers" decision and
asked for the counts, live if possible.** This document previously forbade
follower counts outright, on the judgement that 12 subscribers and 31 stars
would undercut the invitation the section makes. That judgement was the
previous session's, not a principle, and it has been reversed by the person
whose site it is.

What did **not** change, and is still binding:

- **No number is invented, rounded up, or padded.** Every figure is the real
  one, unrounded. 12 is 12.
- **A platform we cannot measure gets no cell**, not a guess and not a
  placeholder. That is why there are four cells and not six.
- **Provenance is recorded, not disguised.** The X figure was read by hand from
  the profile header and `social-counts.json` says exactly that
  (`"source": "profile-header-read-by-hand"`) rather than dressing it up as an
  API read.
- **The account is the one that exists.** X is `@Ruben_Luetke`, not
  `@PersonalJarvis` — the project-named account is defunct (maintainer
  directive, 2026-07-18) and a link written from memory points at a dead
  profile. Every handle lives in `socialCounts.ts` and the fetch script, never
  in the section's markup.

One thing worth saying plainly, because it is a design risk and not a data
problem: these are small numbers, and a count-up on "6" is over in three
frames. The maintainer asked for them anyway. The honest row is the one that
ships.

### Below 768px

The row reflows to **two columns**. Four cells at that width are about 80px
each — too narrow for a 22px figure over an uppercase caption at the same size,
and the captions would wrap to two lines while the figures did not.

The dividers **stay**, because they are the row's only chrome and dropping them
leaves four numbers floating. Cells 2 and 4 keep a vertical hairline; the
second row gains a horizontal one. The grid still reads as one divided strip
rather than as four cards. `:first-child` and `:last-child` stop meaning "the
ends of the row" at two columns, so the flush outer edges are re-expressed by
column parity.

---

## Accessibility

- The play button is a `<button>` whose `aria-label` names the video title, and
  it is rebuilt with the title when the stage changes
- Playlist entries are `<button>`s, not divs
- The iframe carries a `title` with the video title
- The headline is two block spans, not a `<br />`, so the section's
  `aria-labelledby` name has a separator between the two sentences
- Stat cells are `<a>`s with real link text, never a bare number. The brand
  mark is `aria-hidden`, so the platform's name is added visually-hidden and
  each link announces as "12 YouTube Subscribers"
- Decorative icons and the arrow are `aria-hidden="true"`
- The section marker is `aria-hidden` and has no navigation function

---

## Forbidden

- A YouTube iframe on page load
- Thumbnails loaded from `i.ytimg.com`
- `youtube.com/embed` instead of `youtube-nocookie.com/embed`
- **Invented, rounded-up or padded numbers** — the counts are shown now, but
  only the measured ones
- A cell for a platform whose figure cannot be measured
- A handle written into the section's markup instead of `socialCounts.ts`
- `XaiMark` anywhere near a link to `x.com`
- A hard `<br />` in the headline
- A centred headline in this section
- A body paragraph under the video card
- Autoplay without a click
- A bespoke `max-width` instead of the `content` step
- **Inline padding or an inline border on `.section-bounds`** — it takes the
  marker off the rails
- A seam drawn across content rather than in a gap between regions

---

## How it was verified

Headless Chrome over raw CDP against a private static server on the built
`dist/`, because the shared `dist/` is rebuilt constantly by parallel sessions
and the maintainer's Chrome cannot be resized to an exact viewport. Scripts in
the scratchpad, not committed; the method is recorded here so the next session
does not rediscover it.

| Check | Result |
|---|---|
| Section height at 1440×900 | **900.0px exactly** — fits, no page scroll |
| Section height at 1920×1200 | **1200.0px exactly** |
| Boundary inset, top and bottom, at 1440×900 | **63px and 63px** |
| Boundary inset at 1920×1200 | 80px and 80px — the clamp ceiling |
| Band internal overflow (`scrollHeight - clientHeight`) | **0** at every width tested |
| Inline padding / border on `.section-bounds` | **0px on all four** — the marker stays on the rails |
| `.section-track__box` against the band's padding box | **0.00px on all four edges** |
| Stat figures in the server-rendered HTML | **12, 26, 31, 6** — never `0` |
| First stat cell against the band's left edge | **0.0px** — one left margin |
| Stat row at 420px wide | two columns, cells at the same two x positions |
| Stat cell shape | one line at 1024px and up, stacked below it — never mixed within a row |
| Widest stat cell against its own width | **253 of 280px** at 2560, **186 of 200px** at 1024 |
| Requests to any Google host on load | 0 |
| Requests after pressing play | 1, to `youtube-nocookie.com` |
| Style gate | `103 files, no violations` |

Viewports measured: 1440×900, 1920×1200, 1440×700, 1280×900, 1024×900,
900×900, 420×860.
