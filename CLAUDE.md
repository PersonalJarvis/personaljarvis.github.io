# CLAUDE.md

Binding rules for every coding agent in this repository — Claude Code, Codex,
Gemini CLI, whichever. `AGENTS.md` is the twin of this file: change one, change
both.

## What this is

The marketing website for the Personal Jarvis project. It replaces the previous
site, which was retired on 2026-08-28 together with its repository.

## Where this folder lives

This is its **own git repository**, sitting inside the Personal Jarvis app
checkout as `website/` so one folder holds both projects.

- The **parent** folder is the app's repo and is **public**. This repo is
  separate, with its own remote and its own history. They share a folder, never
  a history.
- The parent's `.gitignore` hides `website/`, so nothing here is visible to the
  app repo and nothing here can be staged or pushed from it.
- Read the app's source freely for reference — it is one level up — but never
  edit, stage, or commit anything outside this folder from here.

## Layout is binding

**`docs/layout.md` governs every section of this site.** Read it before writing
any markup. It is not a style suggestion; it is the layout contract, and
`scripts/check-layout.mjs` enforces the mechanical half of it.

The short version:

- **Three width steps, no fourth.** `prose` (672px) for headlines, body copy,
  CTAs and forms. `content` (1280px) for images, screenshots, cards, grids and
  demos. `full` (100%) for background colours, gradients and dividers **only** —
  never text, never controls.
- **One container decides width.** `src/components/Container.tsx` and
  `src/styles/layout.css` are the only files allowed to name a raw width. A
  section never sets its own `max-width`.
- **Padding lives in the container.** 24px per side, 32px from `md` up. Never
  add horizontal padding to a section on top of it.
- **No viewport-relative content widths.** No `vw`, no percentage
  `max-width` (except the legitimate `max-width: 100%` on fluid children). Fixed
  pixel maxima give the same result on a phone and on a 4K monitor; `50vw` gives
  195px on one and 1920px on the other.
- **`100svh`, never `100vh`.** On iOS the address bar collapses on scroll and
  `vh` is measured against the collapsed viewport, so a `100vh` hero jumps
  while the bar animates.
- **Tuning is two numbers**, changed in the two owner files and nowhere else:
  `prose` 672px (narrower: 576px) and `content` 1280px (wider: 1440px).

Run `npm run check:layout` before you commit. A violation fails the build. If
an exception is genuinely right, mark the line `layout-allow: <why>` — a reason
is mandatory, because "why" is the only thing that makes an exception
reviewable.

## Language

Everything committed is **English** — code, comments, docs, commit messages.
German appears only in user-facing site copy and its translation files.

## How work ships

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), one per finished
  step.
- **Pushing is not automatic.** Push only when explicitly asked.
- Never commit secrets, `.env` files, keys, or tokens.
- Every change works in both light and dark mode.
