# Footer — the legal foot of the page

> Assumes [`layout.md`](layout.md).
> Position: **after the install section**, and deliberately below the fold.
> `src/sections/Legal.astro`.

---

## What it is for

The closing band is the last thing a reader is meant to *see*. This is the
material they go *looking for* — the licence, the trademark position, what the
page itself does with their data. Two different jobs, so two different blocks,
and the fold between them is the right place for the seam.

It is a `<footer>` of its own rather than the tail of
[`section-5-steps-cta.md`](section-5-steps-cta.md), because that section is one
screen and this must not eat into it.

---

## The rule this file exists for

**No claim without a source in the repository, and no link to a document that
does not exist.**

Everywhere else on the site an invented sentence is a copy problem. Here it is
a legal one: a footer is read as a statement by the project, and a wrong one is
wrong in a way a hero headline never is. So every line carries a comment in
`Legal.astro` naming the file that proves it.

| Line | Proved by |
|---|---|
| Apache 2.0, patent grant, commercial use | `README.md` § License, `LICENSE`, `NOTICE` |
| Releases up to 1.6.0 remain MIT | `README.md` § License, `docs/licensing.md` |
| Third-party names and logos belong to their owners | `README.md` § License, `TRADEMARK.md` |
| No cookies, no analytics, no third-party request until play | this repository — see below |

The last one is a claim about **this page**, not about the app, and it is only
true as long as the build stays this way. It rests on four checks, all of which
must be re-run before that sentence is allowed to stand:

- no analytics or tag-manager script anywhere in `src/`
- no webfont from a CDN — the type is a system stack, so no `fonts.gstatic.com`
- nothing writes a cookie or `localStorage`
- the video stage holds a **local** JPEG until the reader presses play, and only
  then builds the YouTube iframe (`BuiltInPublic.astro`)

Add an analytics snippet, a Google font or an embed that loads on sight, and
that paragraph becomes false. Change it in the same commit.

### What is deliberately NOT here

An **imprint and a privacy policy** in the German sense (§5 DDG, GDPR Art. 13)
need a real name, a real postal address and a real contact route. Those are the
maintainer's own details, and inventing or placeholding them would be worse
than leaving them out — a placeholder imprint is a false statement of identity,
and it reads as one. When the details exist, they get their own pages and two
more entries in the document list.

---

## Measurements

| Element | Value |
|---|---|
| Width | step `content` — the same column as everything above |
| Boundary | **none.** No rails beside it, no band around it, no section rule |
| Padding | `--section-inset` top and bottom, on the footer itself |
| Columns | `2fr` identity, then `1fr` each for the three link columns |
| Type | wordmark `--text-title-sm`, links `--text-body-sm`, the rest caption |
| Colour | `--ink` wordmark, `--body` links, `--muted` labels and fine print |
| Measure | 54ch on the fine print, inside its own column |

**One step up in size, and only one.** The wordmark is
`--text-title-sm`/`--ink`; everything else stays caption- or small-body-sized.
Without it the whole foot is one grey block of small type and reads as a
disclaimer someone forgot to lay out — with it the block has a signature at the
top and the rest hangs off it.

**`--muted`, never `--muted-soft`.** On `--canvas` the soft tone is 3.7:1,
under AA for text this size. Legal wording is the last thing on a page that may
be hard to read; the brighter muted tone is 6.7:1.

The `54ch` limit is a *measure*, not a layout width — the block still sits in
the `content` container and keeps the page's one left edge. It carries a
`layout-allow` for exactly that reason.

---

## The foot carries no page structure

**The page's structural lines stop under the closing CTA band.** No rails
beside the footer, no band around it, no boundary rule above or below it
(maintainer, 2026-08-29). The reader has arrived; a frame here is a boundary to
nothing, and the two rails running past the last line and out of the bottom of
the window read as a page cut off rather than a page finished.

The one line the foot draws is the hairline over its last row, and that is a
different kind of line: it separates two parts of the same block, not one
section from the next. `--hairline`, therefore — never `--rule`, which is the
colour of exactly the page structure this block no longer carries.

### How the rails actually end

They cannot be shortened. The rails are a **fixed** layer the full height of
the window (`layout.md` § "Page chrome"), so no element in the flow changes how
far they run — the only thing that ends them is something painted in front of
them.

That is `.legal::before`: a box filled with `--canvas`, the width of the
footer, at `z-index: -1`. Three things make it work, and all three are
load-bearing:

- **It is on the rails' own layer, and later in the document.** `PageChrome` is
  rendered before the page content, so at equal `z-index` this box paints on
  top. The rails end where it begins.
- **It overshoots upwards by `--space-section`.** Between the CTA band and the
  top of the footer sits the install section's own closing padding — 48px
  unpinned, 24px pinned. A ground that starts at the footer's top edge leaves a
  stub of rail under the band in one of those two states, and a negative margin
  would have to name whichever figure is live: the "spell the same condition
  twice" bug `layout.md` keeps warning about. Overshooting hides the difference
  without naming either number.
- **The overshoot is invisible.** The CTA band sits inside a `position: sticky`
  viewport, so it is a positioned box and paints above anything at a negative
  index. The part of the overshoot that lands on the band is behind it. The
  overshoot is also smaller than the band is tall, so it can never reach past
  it into the section above, where the rails must still be drawn.

**Only the last block on the page may do this.** Anywhere else an opaque ground
over the rails takes a bite out of the middle of two lines meant to run
unbroken — one gap per section, the failure `global.css` warns about. Here
there is no "after": the bite is the end of the line.

---

## Build

Four columns over one row, a hairline, and a closing line — the shape the
maintainer named on 2026-08-29 by pointing at the reference's own foot.

| Column | Share | Holds |
|---|---|---|
| identity | `2fr` | wordmark, then the two paragraphs of fine print |
| Project | `1fr` | Source, Docs, Security |
| Legal | `1fr` | License, Notice, Trademarks, Licensing history |
| Follow | `1fr` | YouTube, X, Discord |

Under them, a `--hairline` and one last row: the copyright on the left, the
licence on the right.

- **A share each, never `auto`.** Sized to their content the three columns come
  out 59, 122 and 63 pixels wide and bunch against the right edge with the
  whole middle of the foot empty behind them — text pushed aside, not a layout.
  Two fifths and three fifths spaces them the way the reference does.
- **`minmax(0, …)` on every track.** A grid track's default floor is its
  content, and "Licensing history" would otherwise refuse to let the row narrow.
- **The columns are grid gaps, never padding**, so the identity block and the
  last column keep the page's two content edges.
- **Groups are `<nav>` with a label each.** "License, Notice, Trademarks…" out
  of context is a set of unlabelled links; the visible label is the `<ul>`'s
  `aria-labelledby`, so the accessible name and the printed one cannot drift.
- **No handle is written in this file.** `socialCounts.ts` is where the site
  states which account is which — the X account is the project's
  `@PersonalJarvis` and not the maintainer's personal one, so a handle typed
  from memory points at the wrong profile. The footer maps its ids to platform
  names and nothing more.
- **GitHub is deliberately not in "Follow".** The repository is already the
  first entry under "Project", and the same destination twice in one footer
  reads as an oversight rather than as emphasis.
- **Below 768px the identity block takes the full width** and the three link
  columns wrap as a row beneath it. They stay columns with labels — that is
  what makes ten links readable — but stacking them outright turns the foot
  into a screen of its own.
- Every link is external: `target="_blank"`, `rel="noopener"`
- The copyright year comes from the build, not from a literal

---

## Forbidden

- A sentence no file in the repository proves
- A link to a legal document that has not been written
- A placeholder imprint, privacy policy or contact address
- Analytics, a tag manager, or a CDN webfont — each one falsifies the paragraph
  about this page, and that paragraph is the reason the page needs no cookie
  banner
- Its own `max-width`. It stands in the same `content` container as everything
  above it
- **A rail, a band or a boundary rule.** The page's structure ends under the
  CTA; this block carries none of it
- `--rule` on the one hairline it does draw. That token is the page structure
- A social handle written into this file instead of read from `socialCounts.ts`
- A second type size. One step up on the wordmark, and the rest is caption
- `.legal::before` copied to any other block. It is the end of the rails, and
  there is exactly one end
