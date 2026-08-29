/**
 * The four stat cells of section 6, as data: what each one says, where it
 * links, what number it starts from, and whether the browser may re-check it.
 *
 * The section renders this list. It does not name a handle, a repo or an
 * invite code of its own — those live here and in
 * `scripts/fetch-social-counts.mjs`, so the identity of an account is stated
 * in two files instead of scattered across markup. That matters for one of
 * them in particular: the X account is @PersonalJarvis, not @Ruben_Luetke.
 * Maintainer directive of 2026-08-29, superseding the 2026-07-18 one that
 * sent every X link to the personal profile: the project-named account is
 * live and verified, and the site follows the project rather than a person.
 * The figure in the X cell is that account's own follower count.
 *
 * `value` and `readAt` come from `src/data/social-counts.json`, which the
 * fetcher writes and a daily workflow refreshes. `live` is present only for
 * the two platforms that answer an anonymous browser with a usable CORS
 * header — GitHub and Discord — and `LiveCount` uses it to correct the
 * committed figure on the client. The other two are build-time figures and
 * say so in this file rather than leaving the next reader to wonder why the
 * row is inconsistent.
 */

import type { LiveSource } from "@/components/counters/LiveCount";
import counts from "@/data/social-counts.json";

export type SocialId = "youtube" | "x" | "github" | "discord";

export interface SocialStat {
  id: SocialId;
  /** The tiny caption under the figure. Copy is the section's to override. */
  label: string;
  /** Where the cell links. Every cell is a link out. */
  href: string;
  /** The committed figure. Server-rendered, then counted up to. */
  value: number;
  /** ISO timestamp of when that figure was actually read. */
  readAt: string;
  /** Present only where the browser can re-check the number itself. */
  live?: LiveSource;
}

const GITHUB_REPO = "PersonalJarvis/PersonalJarvis";
const DISCORD_INVITE = "x7USduHxbc";

/**
 * Display order, left to right.
 *
 * Not the order of the JSON and not alphabetical: YouTube first because the
 * section is about a video series, Discord last because it is the invitation
 * the reader leaves on.
 */
export const SOCIAL_STATS: SocialStat[] = [
  {
    id: "youtube",
    label: "Subscribers",
    href: "https://www.youtube.com/@PersonalJarvis",
    value: counts.platforms.youtube.value,
    readAt: counts.platforms.youtube.readAt,
  },
  {
    id: "x",
    label: "Followers",
    href: "https://x.com/PersonalJarvis",
    value: counts.platforms.x.value,
    readAt: counts.platforms.x.readAt,
  },
  {
    id: "github",
    label: "Stars",
    href: `https://github.com/${GITHUB_REPO}`,
    value: counts.platforms.github.value,
    readAt: counts.platforms.github.readAt,
    live: { kind: "github", repo: GITHUB_REPO },
  },
  {
    id: "discord",
    label: "Members",
    href: `https://discord.gg/${DISCORD_INVITE}`,
    value: counts.platforms.discord.value,
    readAt: counts.platforms.discord.readAt,
    live: { kind: "discord", invite: DISCORD_INVITE },
  },
];

/**
 * The date the disclosure line under the card may honestly print for the two
 * build-time figures.
 *
 * NOT `counts.generatedAt`. That stamp moves whenever ANY of the four numbers
 * moves, the two LIVE ones included — so the first morning the repo gains a
 * star, the fetcher rewrites the file and the page starts claiming the
 * subscriber and follower counts were read that day. They were not. Without a
 * bearer token X is never re-read at all, so its `readAt` can stand still for
 * months while `generatedAt` keeps advancing behind it. A date the page cannot
 * back up is the same class of defect as a figure it cannot back up, and this
 * section's whole claim is that nothing on it is invented.
 *
 * The honest answer is the OLDER of the build-time cells' own `readAt`, so the
 * sentence is never newer than the staler of the two numbers it describes. ISO
 * timestamps sort lexicographically, which is why a plain `sort()` is the
 * chronological one here.
 *
 * Derived from `SOCIAL_STATS` and not from a hardcoded pair of ids: a cell that
 * later gains a live source — a keyless YouTube route, say — drops out of this
 * set on its own, and one that loses one joins it, with nothing here to update.
 */
export const SOCIAL_BUILT_READ_AT: string =
  SOCIAL_STATS.filter((stat) => !stat.live)
    .map((stat) => stat.readAt)
    .sort()
    .at(0) ?? counts.generatedAt;
