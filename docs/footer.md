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
| Width | step `content` — the same two rails as everything above |
| Boundary | `.section-bounds` — the page's one band shape, two rules an inset in |
| Padding | `--section-inset` outside the rules, `--section-pad` inside them |
| Type | `--text-caption` throughout, except the wordmark at `--text-title-sm` |
| Colour | `--ink` for the wordmark, `--body` for the licence, `--muted` for the rest |
| Measure | 78ch on the fine print, inside the content column |

**One step up in size, and only one.** The wordmark is
`--text-title-sm`/`--ink`; everything else stays caption-sized. Without it the
whole foot is one grey block of small type and reads as a disclaimer someone
forgot to lay out — with it the block has a signature at the top and the rest
hangs off it. A second size here would start rebuilding the page inside the
footer, which is what the "deliberately NOT here" list is guarding against.

---

## The page closes on its last line

The rails are a **fixed** layer the full height of the window
(`layout.md` § "Page chrome"). Nothing in the flow can shorten them, so at the
bottom of the document they used to run straight past the footer's closing rule
and out of the window with nothing under them: the page did not end, it
stopped.

**Dropping the closing inset is not the fix.** It makes the bottom rule the
last row of the document, and the rails do end on it — but at the end of the
scroll that row *is* the bottom edge of the window, so the line the page closes
on is the one line the reader cannot see. Measured in Chrome on 2026-08-29: the
rule sat at exactly `innerHeight`, and the result read as a page cut off rather
than a page finished.

**The fix is to paint the last inset instead of leaving it empty.** The
Container takes `.section-inset--close` (no bottom padding) and the same height
comes back as `.section-close`, a block filled with `--canvas` under the band.
An in-flow background paints *above* a `z-index: -1` layer, so the rails are
covered for exactly its height: they come down the page, meet the closing rule,
and stop. Under it is one inset of quiet ground, and the last rule is a line
with air beneath it.

The vertical rhythm is unchanged — same inset, same rule, same air. The only
difference is that the air is opaque.

**Only the last block on the page may do this.** Anywhere else an opaque ground
over the rails takes a bite out of the middle of two lines meant to run
unbroken — one gap per section, the failure `global.css` warns about. Here
there is no "after": the bite is the end of the line.

**`--muted`, never `--muted-soft`.** On `--canvas` the soft tone is 3.7:1,
under AA for text this size. Legal wording is the last thing on a page that may
be hard to read; the brighter muted tone is 6.7:1.

The `78ch` limit is a *measure*, not a layout width — the block still sits in
the `content` container and keeps the page's one left edge. It carries a
`layout-allow` for exactly that reason.

---

## Build

Two columns, and the second one is what makes the foot read as laid out rather
than as leftover:

| Column | Holds | Sits |
|---|---|---|
| left | wordmark, licence, fine print, copyright | on the left rail |
| right | the document list, one label per line | held against the right rail |

- **The list is a column, not a row.** Six labels in a row ran the full width of
  the content column and left the entire right half of the foot empty under it.
  As a column they fill that half, the fine print keeps its 78ch measure on the
  left, and the two blocks close the page as one spread.
- **The list spans both rows of the grid**, so it starts on the wordmark's
  baseline and runs down beside the fine print.
- **The columns are a grid gap, never padding.** The band is `.section-bounds`,
  which is laid directly against the rails; inline padding on it pulls both
  rules off them (`layout.md` § "The marker has to be re-pointed at the band").
- **Below 768px they stack** and the list goes back to a wrapping row. The rails
  are gone at that width and the measure is the screen, so a column of labels
  held against a right edge that no longer exists reads as a stray block.
- Every document link is external: `target="_blank"`, `rel="noopener"`
- The list is a `<nav>` with an `aria-label`, because "License, Notice,
  Trademarks…" out of context is a set of unlabelled links
- The copyright year comes from the build, not from a literal

---

## Forbidden

- A sentence no file in the repository proves
- A link to a legal document that has not been written
- A placeholder imprint, privacy policy or contact address
- Analytics, a tag manager, or a CDN webfont — each one falsifies the paragraph
  about this page, and that paragraph is the reason the page needs no cookie
  banner
- Its own `max-width`. It stands on the same rails as every other block
- Inline padding on the band, which is what pulls its two rules off the rails
- A second type size. One step up on the wordmark, and the rest is caption
- `.section-close` anywhere but here. It is the end of the rails, and there is
  exactly one end
