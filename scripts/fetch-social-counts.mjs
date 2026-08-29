#!/usr/bin/env node
/**
 * The four numbers in section 6's stat row: subscribers, followers, stars,
 * members.
 *
 * ## Why this runs here and not in the browser
 *
 * Two of the four are public enough for the page to ask for itself, and it
 * does — `src/components/counters/LiveCount.tsx` re-fetches GitHub and Discord
 * on every visit, so those two are live to the minute. This script still reads
 * them, because the number has to be in the HTML before any JavaScript runs:
 * a crawler, a reader with scripts off, and the first paint all see the
 * committed figure, and the live call only ever corrects it.
 *
 * The other two cannot be asked from a page at all, and the reason is the same
 * for both — measured 2026-08-29, not assumed:
 *
 *   - YouTube. The channel page carries the subscriber count in its markup and
 *     serves it to anyone, but it sends no `access-control-allow-origin` header
 *     whatsoever, so a browser refuses to let a script read the response. The
 *     official YouTube Data API v3 answers exactly, and answers 403 without an
 *     API key. A key in a static bundle is a published key.
 *   - X. The old keyless follower widget
 *     (`cdn.syndication.twimg.com/widgets/followbutton/info.json`) still
 *     answers 200 but returns an empty body, and restricts CORS to
 *     `platform.twitter.com` regardless. `api.x.com/2` answers 401 without a
 *     bearer token, and that token is a paid credential. The profile page
 *     itself is a JavaScript shell with no number in the HTML.
 *
 * So those two are read here, where a credential is safe, and committed. A
 * scheduled workflow re-runs this and the site rebuilds; see
 * `.github/workflows/social-counts.yml`.
 *
 * ## What ships
 *
 * Four integers, the account each was read from, and the ISO timestamp of the
 * read. No API key, no bearer token, no per-person data of any kind — a
 * subscriber count is an aggregate and that is the whole claim the section
 * makes.
 *
 * ## Degrading honestly
 *
 * A platform this run cannot reach keeps its PREVIOUS entry, timestamp and
 * all. It is never zeroed and never dropped. That matters more than it looks:
 * a zero on the front page is a lie about the project, and a missing entry is
 * a hole in a four-cell row. The `readAt` staying old is the honest signal
 * that the figure did not move because nobody could look, and `--verbose`
 * prints which platforms were skipped.
 *
 * Running with no environment at all is a supported, green run: GitHub and
 * Discord refresh, YouTube and X keep what they had.
 *
 * ## Why the timestamps only move when a number moves
 *
 * A run that confirms four unchanged figures writes nothing at all, and
 * `readAt` therefore reads "when this figure first appeared", not "when we
 * last looked". That is on purpose. Restamping on every run would make the
 * file differ daily, and the workflow would commit — and so rebuild and
 * redeploy the whole site — every single day to move no number. The date the
 * page can honestly print is the date the count last changed.
 *
 * Usage:  node scripts/fetch-social-counts.mjs [--verbose]
 * Auth:   optional $YOUTUBE_API_KEY (YouTube Data API v3, exact figure)
 *         optional $X_BEARER_TOKEN  (X API v2, the only route that exists)
 *         GitHub and Discord are read anonymously and need nothing.
 * Writes: src/data/social-counts.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "social-counts.json");

/** Long enough for a slow CDN, short enough that CI never hangs on one. */
const TIMEOUT_MS = 15_000;

/**
 * A plain desktop browser string.
 *
 * YouTube serves a stripped consent page to an unrecognised agent, and that
 * page has no counts in it. This is not evasion — the same public page is
 * being read either way — it is asking for the version a person would get.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const YOUTUBE_HANDLE = "PersonalJarvis";
/** Resolved once from the channel page; the Data API wants an id, not a handle. */
const YOUTUBE_CHANNEL_ID = "UC5fU9pU6jeGchEbriUwQBBg";
/**
 * The X account is @Ruben_Luetke, not @PersonalJarvis.
 *
 * The project-named account is defunct. Maintainer directive of 2026-07-18:
 * every X link in this project points at the personal account. Changing this
 * back because the name looks wrong would point the front page at a dead
 * profile.
 */
const X_HANDLE = "Ruben_Luetke";
const GITHUB_REPO = "PersonalJarvis/PersonalJarvis";
const DISCORD_INVITE = "x7USduHxbc";

/* --------------------------------------------------------------- helpers */

async function getText(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getJson(url, headers = {}) {
  return JSON.parse(await getText(url, { accept: "application/json", ...headers }));
}

/**
 * "12" -> 12, "1,234" -> 1234, "1.2K" -> 1200, "3.4M" -> 3400000.
 *
 * YouTube rounds anything past a thousand when it renders the channel page, so
 * the compact forms are the normal case as soon as the channel grows. With a
 * suffix the dot is a decimal point; without one, en-US writes no decimals in
 * a count, so both separators are group separators and both come out.
 */
function parseCompact(digits, suffix) {
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[suffix.toUpperCase()] ?? 1;
  const cleaned = scale === 1 ? digits.replace(/[.,]/g, "") : digits.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`unparseable count ${JSON.stringify(digits + suffix)}`);
  return Math.round(n * scale);
}

function integer(n, what) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) throw new Error(`${what} is not a count: ${JSON.stringify(n)}`);
  return Math.round(v);
}

/* ------------------------------------------------------------- platforms */

/**
 * Each reader returns `{ value, source }` or throws. Throwing is the ordinary
 * outcome for a platform whose credential is absent, and the caller treats it
 * as "keep the previous entry" rather than as a failed run.
 */
const PLATFORMS = [
  {
    id: "youtube",
    account: `@${YOUTUBE_HANDLE}`,
    async read() {
      const key = process.env.YOUTUBE_API_KEY?.trim();
      if (key) {
        // Exact, and the only route that stays exact past a thousand
        // subscribers. Worth a secret in CI; never worth one in a bundle.
        const url =
          "https://www.googleapis.com/youtube/v3/channels" +
          `?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${encodeURIComponent(key)}`;
        const body = await getJson(url);
        const stats = body?.items?.[0]?.statistics;
        if (!stats) throw new Error("Data API returned no channel");
        if (stats.hiddenSubscriberCount) throw new Error("channel hides its subscriber count");
        return { value: integer(stats.subscriberCount, "subscriberCount"), source: "youtube-data-api-v3" };
      }

      // Keyless fallback: the public channel page. `hl=en` plus the matching
      // Accept-Language is what makes the parse stable — without it the string
      // arrives localised ("12 Abonnenten" from a German IP) and any regex
      // written against English silently finds nothing.
      const html = await getText(
        `https://www.youtube.com/@${YOUTUBE_HANDLE}?hl=en&persist_hl=1`,
        { "accept-language": "en-US,en;q=0.9" },
      );
      const m = /"([\d.,]+)\s*([KMB]?)\s*subscribers?"/i.exec(html);
      if (!m) throw new Error("no subscriber count in the channel page");
      return { value: parseCompact(m[1], m[2]), source: "youtube-channel-page" };
    },
  },
  {
    id: "x",
    account: `@${X_HANDLE}`,
    async read() {
      const token = process.env.X_BEARER_TOKEN?.trim();
      // No keyless route exists any more; see the header. Without a token this
      // throws on purpose, and the previous figure stands.
      if (!token) throw new Error("no $X_BEARER_TOKEN (X has no keyless route)");
      const body = await getJson(
        `https://api.x.com/2/users/by/username/${X_HANDLE}?user.fields=public_metrics`,
        { authorization: `Bearer ${token}` },
      );
      const n = body?.data?.public_metrics?.followers_count;
      if (n === undefined) throw new Error("no public_metrics in the response");
      return { value: integer(n, "followers_count"), source: "x-api-v2" };
    },
  },
  {
    id: "github",
    account: GITHUB_REPO,
    async read() {
      // Anonymous and public. The page repeats this call for itself, so the
      // committed figure is only ever the pre-hydration placeholder.
      const body = await getJson(`https://api.github.com/repos/${GITHUB_REPO}`, {
        accept: "application/vnd.github+json",
      });
      return { value: integer(body?.stargazers_count, "stargazers_count"), source: "github-rest-api" };
    },
  },
  {
    id: "discord",
    account: `discord.gg/${DISCORD_INVITE}`,
    async read() {
      // `with_counts` is what turns an invite lookup into a member count.
      // Without it the response has a guild and no numbers at all.
      const body = await getJson(
        `https://discord.com/api/v10/invites/${DISCORD_INVITE}?with_counts=true`,
      );
      return {
        value: integer(body?.approximate_member_count, "approximate_member_count"),
        source: "discord-invite-api",
      };
    },
  },
];

/* ------------------------------------------------------------------ main */

function readPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return null;
  }
}

function same(a, b) {
  return Boolean(a) && Boolean(b) && a.value === b.value && a.source === b.source && a.account === b.account;
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  const file = readPrevious();
  const previous = file?.platforms ?? {};
  const now = new Date().toISOString();

  const platforms = {};
  const kept = [];
  const missing = [];

  // Sequential rather than parallel. Four requests take under two seconds
  // either way, and one at a time keeps the log readable when one of them is
  // the thing that broke.
  for (const platform of PLATFORMS) {
    const before = previous[platform.id];
    try {
      const { value, source } = await platform.read();
      const fresh = { value, readAt: now, source, account: platform.account };
      // An unchanged figure keeps its original entry, timestamp included, so
      // the file stays byte-identical and the workflow has nothing to commit.
      platforms[platform.id] = same(before, fresh) ? before : fresh;
      const delta = before ? value - before.value : null;
      if (verbose) {
        const move = delta === null ? "new" : delta === 0 ? "unchanged" : `${delta > 0 ? "+" : ""}${delta}`;
        console.log(`  ${platform.id.padEnd(8)} ${String(value).padStart(7)}  (${move}, ${source})`);
      }
    } catch (err) {
      if (before) {
        // The previous entry travels intact — value AND readAt. Restamping
        // readAt would claim this run confirmed a number it never saw.
        platforms[platform.id] = before;
        kept.push(`${platform.id}: ${err?.message ?? err}`);
      } else {
        missing.push(`${platform.id}: ${err?.message ?? err}`);
      }
    }
  }

  if (missing.length) {
    // Nothing to fall back on and nothing fetched: the row would render a
    // hole. That is a real failure and the run should say so.
    throw new Error(
      `no figure and no previous value for: ${missing.join("; ")}\n` +
        `Seed src/data/social-counts.json by hand, or fix the fetch.`,
    );
  }

  const moved = PLATFORMS.some((p) => platforms[p.id] !== previous[p.id]);
  const summary = PLATFORMS.map((p) => `${p.id} ${platforms[p.id].value}`).join(", ");

  if (!moved && file) {
    console.log(`social counts: ${summary} — no change, file untouched`);
  } else {
    const out = { generatedAt: moved ? now : (file?.generatedAt ?? now), platforms };
    writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`social counts: ${summary} -> src/data/social-counts.json`);
  }

  for (const note of kept) {
    console.log(`               kept previous value for ${note}`);
  }
}

await main();
