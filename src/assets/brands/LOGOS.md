# Bundled brand marks

The **original** mark of each service named in the plugins demo, bundled so the
page renders offline and calls no third party at render time. `docs/feature-
section.md` forbids network requests from the demo; a CDN icon URL would be one.

Every mark here belongs to its owner. They are used **solely to identify the
service the demo names** — nominative use — and never to imply that the owner
endorses, sponsors or is affiliated with this project. If you own a mark listed
here and want it removed, open an issue and it will be taken out.

> A CC0 or MIT licence on an SVG settles the **copyright in the drawing**. It
> does not grant **trademark** rights, and no entry below claims otherwise.

## Marks sit on a dark plate

The tile behind a mark is `--surface-card`, and the site went dark-only on
2026-08-29 (`09943cb`), so that tile is now near-black. **A mark has to be
legible on it.**

Measured against the tile, every full-colour mark here clears it comfortably —
Gmail, Slack, Spotify, Linear and the two Google apps sit between 0.44 and 1.0
relative luminance. GitHub's does not: its mark is `#161614` at 0.09 on a tile
at 0.09, which is not a faint logo, it is no logo. It therefore uses the
**light variant GitHub publishes for exactly this case** — still the vendor's
own mark, never a recolour of the dark one.

If the site ever goes back to a light ground, GitHub has to swap back. Nothing
enforces that automatically; this paragraph is the warning.

A brand whose only usable mark is a wordmark, or whose real app icon is a white
glyph on a brand colour (Stripe, Cloudflare, Notion), is simply not named in the
demo. Drawing a substitute would be worse than leaving it out.

## Adding one

1. Take the icon variant from the vendor's brand page or a permissively
   licensed collection. Never the wordmark — it is unreadable at 32px.
   Check it against the dark tile before adding it: a mark under about 0.2
   relative luminance disappears there, and needs its vendor's light variant.
2. Strip scripts, external references and embedded rasters; keep a roughly
   square `viewBox`.
3. Save it as `<id>.svg`, matching the id used in `frames.ts`.
4. Add a row below. An entry without a row is a licence gap, not a shortcut.

## Ledger

| id | Source | Legal basis | Added |
|---|---|---|---|
| github | svgl `github_dark.svg` — the light variant, for dark backgrounds. Replaced the dark one on 2026-08-29 when the site's tile turned near-black | MIT | 2026-08-29 |
| gmail | gilbarbara/logos `google-gmail.svg` | CC0 | 2026-08-28 |
| google_calendar | gilbarbara/logos `google-calendar.svg` | CC0 | 2026-08-28 |
| google_drive | gilbarbara/logos `google-drive.svg` | CC0 | 2026-08-28 |
| linear | svgl `linear.svg` | MIT | 2026-08-28 |
| slack | gilbarbara/logos `slack-icon.svg` | CC0 | 2026-08-28 |
| spotify | gilbarbara/logos `spotify-icon.svg` | CC0 | 2026-08-28 |
