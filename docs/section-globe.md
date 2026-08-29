# Section — the globe

> **Internal name: "the globe".** One number and one rotating world, saying how
> many people have starred the repository and where the ones who say so are.

Binding for `src/sections/Stargazers.astro`, `src/components/globe/` and the
three scripts that feed them. Widths come from [`layout.md`](layout.md) and
colours from [`design.md`](design.md); this file governs the rest.

---

## The claim the section makes

**This many GitHub stars. These are the places the ones who say where they are
come from.** Nothing more.

That restraint is the whole reason the section is trustworthy. A globe covered
in marks that were guessed at is a decoration; a globe with seven honest marks
and a sentence saying seven is a fact.

### The copy has three obligations

1. **Name the unit.** The figure says "GitHub stars", beside the number on its
   own baseline rather than in a sentence underneath it. A number over a line of
   prose makes the reader hold the figure in mind until they find out what it
   counts.
2. **Say it is live**, because it is, and because a visitor has no way to tell a
   live figure from one baked in six months ago.
3. **Say who is missing.** Most GitHub profiles carry no location, so most
   stargazers cannot be placed at all — far more are absent from the globe than
   are on it. A visualisation showing seven marks and saying nothing invites the
   reader to believe seven is the number. The standfirst names how many places
   are marked and why the rest are not there.

**No arithmetic against the live count in the copy.** "7 places" describes the
marks, which come from the same build as the sentence. "24 of 31 could not be
placed" would be wrong the moment someone stars the repository — which is the
one thing this section promises will show up immediately.

---

## Live, and not live

| | Where it comes from | How fresh |
|---|---|---|
| The number | The browser asks GitHub directly | To the minute |
| The marks | `scripts/fetch-stargazers.mjs`, at build | Hours |

The split is forced, not chosen. GitHub gives a repository's star count to
anyone who asks — one unauthenticated request, no key. It does **not** give you
where those people are without a token: the REST route returns logins only, so
a location costs one more request each against a ceiling of sixty an hour, and
the GraphQL route that returns login and location together refuses to answer
without authentication.

A static page cannot hold a token. Anything shipped to the browser is readable
by everyone who receives it, and "it's only a read-only token" is not an
argument — it is still ours, still rate-limited against our account, and still
revocable by someone else's misuse.

So the map is drawn where a token is safe, and `.github/workflows/stargazers.yml`
re-runs the fetch every six hours and commits the result if it changed.

**If the site ever gains a server** — an edge function, a worker — the marks can
become live too, and the only thing that has to change is where
`src/data/stargazers.json` comes from. The shape it has now is the shape such an
endpoint should return. Do not change that shape casually.

### Failure is a no-op, always

Every failure path on the live count returns null and leaves the built figure on
screen: offline, rate-limited, blocked by an extension, GitHub having a bad
morning. **The number is never blank, never zero, and never a spinner.** A
number that flickers to nothing is worse than a number four hours old.

---

## Privacy: counts, never people

`src/data/stargazers.json` contains places and counts. It contains **no logins,
no profile links, no avatars, no dates**. "Three people in Berlin" is the whole
claim, and it is the whole file.

This is not a formality. People star a repository; they do not agree to be
pinned to a public map by name. A file listing who starred what and where they
live is a different artefact from a count, and shipping the former to every
visitor of a marketing site would be indefensible even though every field in it
is individually public.

**Never add a login, a URL or an avatar to that file.**

---

## The section is exactly one viewport

`section-full-height` sets the floor and the body is a `flex-1` box that centres
what it holds, so surplus height on a tall monitor becomes air above and below
rather than a gap in the middle. Same construction as `Install.astro`, same
reason.

The floor is a **minimum**. On a short window the content grows past one screen
and the page scrolls; nothing is ever clipped. Measured: 1440x900, 1280x720,
1024x640, 834x1112 and 390x844 all come out at exactly one viewport, and
390x600 overshoots by 93px and scrolls, which is the intended fallback.

The globe is what makes that work or not, because it is square and therefore as
tall as it is wide. It is capped at `min(100%, 100svh - 14rem)`: on a wide
screen the column governs, on a short one the screen does. The svh term is not
the bare viewport width `layout.md` forbids — the container still governs
through the `100%`, and this only stops the graphic outgrowing the screen it
has to fit on.

---

## The rendering

### It is a 2D canvas, and that is deliberate

No WebGL, no three.js, though the repository has three.js for the mark. The
globe is a few thousand squares whose positions are computed per frame and
drawn with `fillRect`-style paths.

Three reasons, in order of weight:

1. **The dots stay hard-edged.** The look is the site's dither relief, made
   round. A rasterised WebGL sphere fights its own antialiasing to get squares
   this crisp and loses.
2. **There is no context to lose.** `docs/` elsewhere in the app repo carries a
   whole anti-pattern about WebGL scenes surviving context loss. A 2D canvas has
   none of that surface.
3. It is less code.

### The viewpoint

**Camera latitude 18° north**, orthographic, and it is the one number to tune
(`TILT_DEGREES` in `projection.ts`).

Dead-on at the equator, the latitude rows project as straight lines and the
globe reads as a circle with a pattern on it. Tilted, the rows curve, the pole
comes into view, and the eye reads a ball. Above roughly 30° the pole swings
toward the middle and the continents crowd into the lower half; below about 10°
the curve stops registering. 18° is measured off the reference.

### The light

Overhead, a little to the left, toward the viewer — and **fixed in the world
while the globe turns beneath it**. Same rule as the turning mark: a light that
travels with the form lights every continent identically and the sphere
flattens out.

The ambient term is high for a lighting model (0.3) and low for a drawing. This
is a drawing: a continent that disappears because of where the sun happens to be
is a map with a bug in it.

### The rim fade must reach zero

**The single most important line in the renderer**, and the one that will be
"tidied" by someone adding a floor term back.

Orthographic projection crowds a hemisphere's worth of longitudes into the last
few pixels before the silhouette. Whatever value the dots hold there, they hold
it hundreds of times over in a very small space. Held at even a fifth of full
strength, that crowd fuses into a bright wire hoop around the globe and the eye
takes the hoop for the subject.

### Do not re-thin the poles

A one-degree grid is one cell per 111 km at the equator and one per 2 km near
the pole. The first version of this globe answered that with a `1/cos(latitude)`
step on longitude — even spacing, textbook. It fixed the white band across the
arctic and left visible **radial streaks** where the step changed.

It was never a sampling problem. The arctic sits where the rim fade is already
falling; the band was bright for the same reason the hoop was. With the fade
reaching zero, the plain grid reads as density, which is what the north of a
globe should look like. The stepping was deleted. **Do not reintroduce it.**

### Shades, not per-dot colours

Dots are sorted into seven alpha buckets and each bucket is drawn as one path
with one `fill()`. Setting `globalAlpha` per dot costs more than all the
geometry put together, and there are thousands of them.

### The markers are DOM, the dots are canvas

The dots are thousands of squares that never need to be hovered, clicked or
read. The markers are a handful of things that need a tooltip.

Markers are moved with `transform`, which stays on the compositor. Never with
`left`/`top`, which makes the browser redo layout sixty times a second for every
mark.

**Marker anatomy** — three concentric squares, no radius anywhere:

| Part | Size | Job |
|---|---|---|
| core | 5px, solid ink | The position, exactly |
| ring | 9px, outlined, filled with the page floor | Separates the core from the terrain |
| halo | `15 + 7 × √(count − 1)`, capped at 38px | How many people are there |

The two filled squares punch a hole in the dot field. That is the point: a mark
laid over a busy continent at the same value as the continent is not a mark.

The halo is the only thing that grows, so a city with thirty stargazers is one
larger mark rather than thirty marks in a pile. Square root, not linear —
linear turns a busy city into a blot that covers the country it is in.

### Accessibility

The canvas and the markers are `aria-hidden`. The same facts are in a
visually-hidden list underneath, one line per place. A canvas of 21 538 squares
announced to a screen reader helps nobody, and a marker made focusable would be
a `<button>` that does nothing when pressed.

---

## The data pipeline

Three scripts, each run by hand, each writing a committed file. **No build
needs the network.**

| Script | Reads | Writes | When to run |
|---|---|---|---|
| `build-land-mask.mjs` | Natural Earth 110m land | `src/data/land-mask.ts` | Practically never |
| `build-gazetteer.mjs` | Natural Earth cities + countries | `scripts/gazetteer.json` | On a data refresh |
| `fetch-stargazers.mjs` | GitHub GraphQL | `src/data/stargazers.json` | Every 6 h, by CI |

Natural Earth sources are downloaded on demand and git-ignored — 5.8 MB that
only a data refresh ever reads. Only the generated files are committed.

### Geocoding a location that is not a format

A GitHub location is one free-text line. Real examples from our own stargazers,
unedited:

```
"Auckland, NZ"   "Calgary, AB, Canada"   "Munich"
"USA, Minnesota" "Brazil"                "Planet Telex"
```

City, city with country, country alone, country-then-region, and a Radiohead
song. `scripts/geocode.mjs` matches in five passes — curated alias, country
hint, city preferring that country, region, country — and **is allowed to fail**.
A mark in the wrong hemisphere is worse than no mark, so an unresolved location
is counted and dropped, never guessed at.

**The country is a hint, not a filter.** This is what saves the US state codes:
"Boston, MA" hints Morocco, finds no Boston there, and falls through to the
Boston with four million people. Handling those as a list of exceptions instead
would be a list that is never finished.

`scripts/test-geocode.mjs` pins 46 cases, including every real stargazer
location and every collision above. Run it with `npm run check:geocode`; it is
part of `npm run verify`.

---

## Forbidden

- A token, of any scope, anywhere the browser can read it
- A login, profile URL, avatar or star date in `src/data/stargazers.json`
- A floor term on the rim fade — it puts the wire hoop back
- Re-thinning the poles by longitude — it puts the radial streaks back
- `left`/`top` animation on the markers instead of `transform`
- A rounded corner on any part of a marker
- Guessing at an unresolved location, or defaulting it to a country
- A count-up animation on page load. The number animates when it has *changed*,
  which is information; animating always is decoration
- Claiming in copy that the globe shows everyone, or omitting why most
  stargazers are not on it
- Arithmetic in the copy that mixes the live count with the build-time
  breakdown — it goes wrong on the next star
