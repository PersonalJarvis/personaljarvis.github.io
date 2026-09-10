# How the site is published

The site is a static build on **GitHub Pages**, served from
`PersonalJarvis/personaljarvis.github.io` at **<https://personaljarvis.ai>**.

There is nothing to run by hand. A push to `main` builds and publishes.

## The repository name is load-bearing

An organisation's Pages site is served at the root only from a repository named
`<org>.github.io`. A repository called `website` would be served from
`/website/`, and every absolute path in the build — which is all of them, since
`astro.config.mjs` sets no `base` — would 404. The name is not cosmetic.

## The four workflows

| Workflow | When | What it does |
| --- | --- | --- |
| `deploy` | push to `main`, or after any of the three below | builds with `npm ci && npm run build`, publishes `dist/` |
| `stargazers` | every 6 hours | copies the public map feed into the static fallback |
| `social-counts` | daily | rewrites `src/data/social-counts.json` — the stat row |
| `lockfile` | by hand | resolves `package-lock.json` on Linux |

**Why `deploy` listens for the other three finishing.** They commit with the
workflow's built-in `GITHUB_TOKEN`, and a push made with that token raises no
`push` event — GitHub's guard against a workflow that triggers itself forever.
Without the `workflow_run` trigger a refreshed globe would sit in the
repository, committed and unpublished, which is the exact failure the schedule
exists to prevent.

## Two things that are not obvious

**The lockfile must be resolved on Linux.** npm resolves optional platform
packages for the machine it runs on, so a lockfile written on Windows is
missing the entries a Linux build needs — Tailwind's wasm32 fallback, sharp's
`@emnapi` runtime. `npm ci` then refuses the tree on the runner and no amount
of re-running `npm install` locally fixes it. Change a dependency, then run the
`lockfile` workflow once.

**Location collection runs in the app repository.** Its `Stargazer map`
workflow handles `watch: started`, an hourly reconciliation, and manual runs.
The built-in `GITHUB_TOKEN` can read that repository's stargazers and write its
own `stargazer-map` branch. No cross-repository personal token is required.
The workflow checks out a pinned website revision for its existing collector
and geocoder, then publishes only aggregate counts and places to
`data/stargazers.json` on that branch. Advancing the pinned revision is required
when changing the collector or gazetteer used by the live map.

The browser reads that public raw JSON on hydration and every 60–75 seconds
while the tab is visible. It retains the last verified snapshot on errors.
GitHub Actions queues and the raw-content cache can add several minutes;
the UI shows the location snapshot's UTC timestamp. The six-hourly website
workflow only copies the feed into the static/no-JavaScript fallback and fails
if the source is invalid or more than a day old.

**Activation order:** publish the app workflow to its default branch, run
`Stargazer map` once, and verify the public feed. Then publish the website
changes. Verify a successful automatic run on the next star and an hourly run
for profile edits/unstars. Tests of browser fixtures do not verify hosted
Actions permissions. The old missing `STARGAZERS_TOKEN` check caused all
scheduled refreshes to fail while the browser's star count kept increasing.

## DNS

Four `A` records at the apex to GitHub's Pages addresses, a `CNAME` on `www`,
and `public/CNAME` in the build so a deploy cannot reset the domain.

Every record is **DNS-only**. Behind Cloudflare's proxy GitHub never sees the
validation request and can never issue the certificate; the site then sits on
"Certificate not yet created" with no error to explain it.
