# Logos — the provider strip

> Builds on [`layout.md`](layout.md) and [`design.md`](design.md). Widths come
> from the `Container`, colour and rhythm from the tokens. This file governs
> only what is specific to the marks themselves.

The strip sits directly under the hero and shows the model providers Jarvis
runs on. It is one section: `src/sections/LogoStrip.astro`, with one component
per mark in `src/components/logos/`.

---

## Which logos

Sources are the marks already bundled in the app checkout, whose provenance and
licence are recorded in its own ledger (`src/assets/providers/LOGOS.md` there).
Paths below are relative to that folder.

| Company | Source file | Status |
|---|---|---|
| OpenAI | `openai.svg` | Ready — already single-colour, one path |
| xAI (Grok) | `xai.svg` | Ready — already single-colour |
| OpenRouter | `openrouter.svg` | Ready — already single-colour |
| Groq | `groq.svg` | Ready — already single-colour |
| Ollama | `ollama.svg` | Ready — already single-colour |
| ElevenLabs | `elevenlabs.svg` | Ready — already single-colour |
| Anthropic (Claude) | `claude.svg` | Converted — one path, one colour value dropped |
| NVIDIA | `nvidia.svg` | Converted — one path, one colour value dropped |
| Google Gemini | `gemini.svg` | Converted — four copies of one path behind six gradients; one kept |
| Google Cloud (Vertex AI) | `google-cloud.svg` | Converted — four colour areas that tile into the standard mono cloud |
| Antigravity | `antigravity.svg` | Converted — the mask outline is the mark; the blurred colour blobs behind it are dropped |
| Cartesia | `cartesia.svg` | Converted — the green plate rectangle dropped, the glyph kept |
| Inworld | `inworld.png` | **Not used** — a 180×180 raster, so no `currentColor` component is possible |

Twelve marks are in use. The conversion is scripted, not hand-copied, and the
script refuses to write a file in which a hex value survived.

### Trademark

Every mark belongs to its owner. They identify the service a provider connects
to — nominative use — and never imply endorsement, sponsorship, or affiliation.
A permissive licence on an SVG settles the copyright in the drawing; it grants
no trademark rights, and nothing here claims otherwise. If you own a mark shown
here and want it removed, open an issue and it will be taken out.

---

## Rules

These are binding.

1. **The layout model is the bar under the hero on the reference site** —
   its cell division, height, hairlines and restraint. Not the companies shown
   there; those are its customers, ours are our providers.
2. **Every mark is a React component with `fill="currentColor"`.** No hardcoded
   colour survives conversion. The mark inherits the surrounding text colour,
   so light and dark mode need no second asset.
3. **Optical size is set per mark, not one shared `max-height`.** Two marks of
   equal box height do not read as equal size: a sparse mark looks smaller than
   a solid one. The heights live in the `marks` array in `LogoStrip.astro`.
4. **Nothing here is invented.** A case this file does not cover is a question
   for the maintainer, not a decision for whoever is editing.

---

## The reference, measured

Taken from the live page rather than from a screenshot, because the cells look
outlined and are not.

| Property | Reference | Ours |
|---|---|---|
| Cells | 8 equal columns, one row | 6 columns from `lg`, 4 from `sm`, 3 below — twelve marks, so two rows at desktop |
| Cell size | 154 × 100px | Width follows the grid; height 64px, 100px from `md` |
| Gap | 10px | 10px |
| Cell surface | a 2% darker plate, 4px radius, **no border** | white card, 1px hairline, `--radius-md` |
| Mark colour | `currentColor` at full body ink | `currentColor` at `--ink` |
| Mark size | one shared 40px height | per mark, 24–32px |
| Label above | 14px, centred | `caption-upper` token, centred |

### Two deliberate deviations

Both are open for a one-word reversal.

- **Hairlines.** The reference has none — the cell is a tinted plate with no
  border at all. The brief asked for hairlines and `design.md` gives cards a
  1px hairline, so the cells carry one. Dropping it means removing
  `border border-hairline` from the cell class.
- **Per-mark sizing.** The reference sets one 40px height for every mark, which
  works there because its logos are wordmarks of similar weight. Ours are
  square icons, where a shared height reads as an accident. This deviation was
  instructed and is rule 3 above.

---

## Adding a mark

1. Take the original from the app checkout's bundled marks, or from the
   vendor's own brand page. Prefer the icon over the wordmark.
2. Convert it: strip every colour, keep a roughly square `viewBox`, drop
   titles, scripts, external references and embedded rasters.
3. Save it as `src/components/logos/<Name>Mark.tsx` following the existing
   files — `fill="currentColor"`, `aria-hidden`, `className` passed through.
4. Add it to the `marks` array in `LogoStrip.astro` with its own optical
   height, and give it an `sr-only` name.
5. Add a row to the table above. An entry without a row is a licence gap.

---

## Open questions

Listed rather than decided, per rule 4.

- **The label copy** currently reads "Runs on any of these". It is a
  placeholder: factual, but nobody has approved the wording.
- **Order of the marks** is the order of the table, which is conversion effort,
  not importance. If there is a wanted order — by relevance, alphabetical — it
  has not been stated.
- **Dark mode** is undefined site-wide (`design.md`, "Known gaps"). The marks
  themselves are ready for it: `currentColor` needs no second asset.
- **Inworld** is left out for want of a vector. If it must appear, someone has
  to obtain an SVG; recolouring a raster is not possible.
