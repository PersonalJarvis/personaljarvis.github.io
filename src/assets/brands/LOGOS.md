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

## Marks sit on a light plate

The app bundles the same marks for a **dark** interface, so its GitHub and
Notion files are the light variants their vendors publish for dark backgrounds.
This site is cream and white, so a mark is only bundled here when the vendor's
own light-background variant exists. GitHub therefore comes from a different
source than it does in the app — still the vendor's own mark, not a recolour of
theirs.

A brand whose only usable mark is a wordmark, or whose real app icon is a white
glyph on a brand colour (Stripe, Cloudflare, Notion), is simply not named in the
demo. Drawing a substitute would be worse than leaving it out.

## Adding one

1. Take the icon variant from the vendor's brand page or a permissively
   licensed collection. Never the wordmark — it is unreadable at 32px.
2. Strip scripts, external references and embedded rasters; keep a roughly
   square `viewBox`.
3. Save it as `<id>.svg`, matching the id used in `frames.ts`.
4. Add a row below. An entry without a row is a licence gap, not a shortcut.

## Ledger

| id | Source | Legal basis | Added |
|---|---|---|---|
| dropbox | gilbarbara/logos `dropbox.svg` | CC0 | 2026-08-28 |
| github | gilbarbara/logos `github-icon.svg` (the dark variant, for light backgrounds) | CC0 | 2026-08-28 |
| gmail | gilbarbara/logos `google-gmail.svg` | CC0 | 2026-08-28 |
| google_calendar | gilbarbara/logos `google-calendar.svg` | CC0 | 2026-08-28 |
| google_drive | gilbarbara/logos `google-drive.svg` | CC0 | 2026-08-28 |
| linear | svgl `linear.svg` | MIT | 2026-08-28 |
| slack | gilbarbara/logos `slack-icon.svg` | CC0 | 2026-08-28 |
| spotify | gilbarbara/logos `spotify-icon.svg` | CC0 | 2026-08-28 |
