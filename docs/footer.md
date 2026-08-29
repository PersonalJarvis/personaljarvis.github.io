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
| Boundary | `.section-rule` at the top, so the foot hangs from a line |
| Padding | `clamp(2rem, 4svh, 3rem)` above, `clamp(2.5rem, 5svh, 4rem)` below |
| Type | `--text-caption` throughout |
| Colour | `--muted` for the links, `--muted` for the fine print |
| Measure | 78ch on the fine print, inside the content column |

**`--muted`, never `--muted-soft`.** On `--canvas` the soft tone is 3.7:1,
under AA for text this size. Legal wording is the last thing on a page that may
be hard to read; the brighter muted tone is 6.7:1.

The `78ch` limit is a *measure*, not a layout width — the block still sits in
the `content` container and keeps the page's one left edge. It carries a
`layout-allow` for exactly that reason.

---

## Build

- Name and licence left, the document list right, on one line; both wrap onto
  their own lines when the row would have to squeeze
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
