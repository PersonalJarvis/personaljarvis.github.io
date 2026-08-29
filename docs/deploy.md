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
| `stargazers` | every 6 hours | rewrites `src/data/stargazers.json` — the globe's markers |
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

**The globe needs a token; the number does not.** A repository's star COUNT is
public, which is why the page asks GitHub for it directly on every visit and
needs no server of ours. The LIST of who starred it is not: it answers an
anonymous caller with 401, and a workflow's own `GITHUB_TOKEN` — scoped to the
repository it runs in, not to the app's — with 403 on both GraphQL and REST.
All three measured, 2026-08-29.

So `stargazers` requires the repository secret **`STARGAZERS_TOKEN`**: a
fine-grained personal access token with public-repository read access, which
can read only what is already public and write nothing. Without it the workflow
fails on purpose and says so in one line, because a globe that quietly stops
refreshing looks exactly like a globe nobody is starring.

## DNS

Four `A` records at the apex to GitHub's Pages addresses, a `CNAME` on `www`,
and `public/CNAME` in the build so a deploy cannot reset the domain.

Every record is **DNS-only**. Behind Cloudflare's proxy GitHub never sees the
validation request and can never issue the certificate; the site then sits on
"Certificate not yet created" with no error to explain it.
