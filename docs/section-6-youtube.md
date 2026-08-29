# Section 6 — "Built in public": the videos

> Builds on [`layout.md`](layout.md) and [`design.md`](design.md). Widths come
> from the `Container`, colour and rhythm from the tokens. This file governs
> what is specific to the video section: `src/sections/BuiltInPublic.astro`.
>
> **Its own viewport.** The section fills one screen and no more.

Layout reference: <https://www.bridgemind.ai>, its "Built in public" section.
What is taken is the layout, the proportions and the embedding technique. Not
its text, its numbers or its content — see [`design.md`](design.md) § "What
this is not" for why that line matters here too.

---

## What it says

Personal Jarvis is developed in public. Anyone who wants to know how it is
built can watch it being built.

---

## Structure, top to bottom

1. Headline, **left-aligned**, two lines
2. Standfirst, two to three lines, `--body`, held to a prose measure
3. The video card
4. The channel cards

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

## Measurements

| Element | Value |
|---|---|
| Section height | `min-height: 100svh`, content centred |
| Width | `content` step |
| Video card | 16px radius, 1px hairline, 16px padding |
| Card head | 44px tall, title left, link right |
| Featured video | `aspect-ratio: 16/9`, width follows the height cap |
| Playlist | three entries stacked, takes the remaining column |
| Channel cards | one column per real channel, 12px radius |

### The one number to tune

```css
[data-bip] { --stage-cap: clamp(190px, calc(100svh - 548px), 460px); }
```

`548px` is everything in the section other than the video itself, measured
against the built page at 1440×900: 32px top padding, 86px headline, 16px gap,
51px standfirst, 24px gap, 76px of card chrome (44px head plus 2×16px padding),
12px gap, 20px disclosure line, 24px gap, 169px channel cards, 32px bottom
padding. If any of those change, re-measure and change this number — not the
individual rules.

Everything else follows from it. The featured column is

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
headline, the standfirst, the disclosure and the channel cards and the section
comes to roughly 1040px — 140px more than the viewport it has to fit in.

The brief settles this: *"Passt die Karte nicht, wird ihre Höhe reduziert,
nicht die Kanal-Karten weggelassen."* So the card gives way. At 1440×900 the
video lands at **53%** of the card and 352px tall, and the card at 430px —
within a few pixels of the brief's own 420px card budget, which is the number
the 68% was always in tension with. Above roughly 1000px of viewport height the
video reaches 68% and stops there.

**The playlist must never decide the card's height.** It did once: the entry
thumbnails were sized at 40% of the rail, and since they are 16:9 their height
grew with the column, so three rows came to 440px against a 352px video and the
rail silently became the tallest thing in the card. The thumbnails are a fixed
140px wide for that reason, and the rail additionally carries
`max-block-size: var(--stage-cap)`.

Below 1024px the playlist moves under the video, the channel cards stack, and
the height cap is released — once the section is allowed to be taller than one
screen, holding the video to a viewport-derived height only makes it small for
nothing.

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

---

## The channel cards

One card per channel that **actually exists**. One, two or three — never padded
out with placeholders, and the grid is `auto-fit` so two channels make two full
columns rather than two thirds of a row with a hole in it.

Currently two, both verified: **YouTube** (`@PersonalJarvis`, confirmed through
the oEmbed responses' `author_url`) and **GitHub**
(`PersonalJarvis/PersonalJarvis`, confirmed through the GitHub API). A third
card for X was **dropped rather than guessed** — the account could not be
verified from here.

Build: icon top left, arrow top right, then the label and two lines of
description. The whole card is one `<a>` with `rel="noopener"`.

### Numbers

**No invented numbers.** Each card takes one of exactly two forms:

- a real figure, rounded down, with a `+` — maintained by hand, and therefore
  out of date the moment it is written
- no figure at all, just the label and the description

Both cards currently take the second form. The real figures on 2026-08-29 were
12 YouTube subscribers and 31 GitHub stars; a card built around either would
undercut the invitation the section is making. Adding them later is one `value`
line per entry in `CHANNELS` and one rule in the stylesheet.

The GitHub card says **Apache-2.0**, which is what the repository's own licence
metadata reports. One video title says "MIT license"; the repository is the
source of truth for what the site claims.

---

## Accessibility

- The play button is a `<button>` whose `aria-label` names the video title, and
  it is rebuilt with the title when the stage changes
- Playlist entries are `<button>`s, not divs
- The iframe carries a `title` with the video title
- Channel cards are `<a>`s with real link text, not a bare number
- Decorative icons and the arrow are `aria-hidden="true"`

---

## Forbidden

- A YouTube iframe on page load
- Thumbnails loaded from `i.ytimg.com`
- `youtube.com/embed` instead of `youtube-nocookie.com/embed`
- Invented video titles or follower counts
- Placeholder channel cards for networks with no real account
- A centred headline in this section
- A body paragraph under the video card
- Autoplay without a click
- A bespoke `max-width` instead of the `content` step

---

## How it was verified

Headless Chrome over raw CDP against a private build, because the shared
`dist/` is rebuilt constantly by parallel sessions and the maintainer's Chrome
cannot be resized to an exact viewport. `scripts/` in the scratchpad, not
committed; the method is recorded here so the next session does not rediscover
it.

| Check | Result |
|---|---|
| Requests to any Google host on load, including scrolling the section into view | **0 of 22** |
| Requests after pressing play | 1, to `youtube-nocookie.com` |
| Section height at 1440×900 | **900px** — fits, no page scroll |
| Playlist swap | 11 of 11 assertions pass, no request fired |
| Lighthouse performance, desktop preset | **100 before, 100 after — 0 points** |
| Page weight | +14 kB (the poster frames are lazy and below the fold) |
