/**
 * The demo script — the only place the story is written down.
 *
 * See docs/feature-section.md § "Shortening": the real Plugins section has 24
 * plugins, eight categories, four statuses, five sign-in methods and four
 * dialogs. Read from three metres away that is a grey smear, so the demo keeps
 * five rows, three filters and three statuses.
 *
 * Every logo is a bundled file (src/assets/brands/, see LOGOS.md there). Vite
 * turns these imports into build-time URLs, so the demo makes no network call
 * of its own — which docs/feature-section.md forbids.
 *
 * The `?url` suffix is load-bearing. Astro hands a bare `.svg` import to
 * astro:assets, whose default export is an ImageMetadata object, not a string
 * — so `<img src={logo}>` renders `src="[object Object]"` and every tile is a
 * broken image. `?url` asks Vite for the plain URL instead.
 */

import githubLogo from "@/assets/brands/github.svg?url";
import gmailLogo from "@/assets/brands/gmail.svg?url";
import googleCalendarLogo from "@/assets/brands/google_calendar.svg?url";
import googleDriveLogo from "@/assets/brands/google_drive.svg?url";
import linearLogo from "@/assets/brands/linear.svg?url";
import slackLogo from "@/assets/brands/slack.svg?url";
import spotifyLogo from "@/assets/brands/spotify.svg?url";

/** Mirrors the app's four statuses minus `error`, which looks identical to
 *  `needs_reauth` to the viewer and would only add a fourth dot colour. */
export type PluginStatus = "not_connected" | "connected" | "needs_reauth";

export interface DemoPlugin {
  id: string;
  name: string;
  category: string;
  logo: string;
  status: PluginStatus;
  /** Shown under the name while the status is `needs_reauth`. The app states
   *  the actual cause instead of a catch-all, and so does the demo. */
  reason?: string;
  /** The app's "Connected · Live" — the plugin is not just authorised, it
   *  answered a call. */
  live?: boolean;
}

export type FilterId = "all" | "installed" | "attention";

/** One rendered state of the window. The view is pure, so a frame is simply
 *  everything the view needs to draw itself. */
export interface Frame {
  /** How long this frame holds before the next one, in milliseconds. */
  duration: number;
  /** Text in the search box. Empty means the box shows its placeholder. */
  query: string;
  filter: FilterId;
  plugins: DemoPlugin[];
  /** Row whose round button is mid-flight. */
  busyId?: string;
  /** Row lifted by the script, as if the pointer were resting on it. */
  hoverId?: string;
  /** The banner above the table, shown only while something is broken. */
  banner?: { title: string; detail: string };
  /** What a screen reader is told this frame shows. Joined into the sr-only
   *  paragraph beside the stage, so the demo is not a hole in the page. */
  caption: string;
}

const github: DemoPlugin = {
  id: "github",
  name: "GitHub",
  category: "Developer",
  logo: githubLogo,
  status: "connected",
  live: true,
};
const spotify: DemoPlugin = {
  id: "spotify",
  name: "Spotify",
  category: "Media & Creativity",
  logo: spotifyLogo,
  status: "connected",
};
const gmail: DemoPlugin = {
  id: "gmail",
  name: "Gmail",
  category: "Calendar & Mail",
  logo: gmailLogo,
  status: "not_connected",
};
const slack: DemoPlugin = {
  id: "slack",
  name: "Slack",
  category: "Messaging",
  logo: slackLogo,
  status: "not_connected",
};
const linear: DemoPlugin = {
  id: "linear",
  name: "Linear",
  category: "Developer",
  logo: linearLogo,
  status: "not_connected",
};
const googleDrive: DemoPlugin = {
  id: "google_drive",
  name: "Google Drive",
  category: "Files & Photos",
  logo: googleDriveLogo,
  status: "not_connected",
};
const googleCalendar: DemoPlugin = {
  id: "google_calendar",
  name: "Google Calendar",
  category: "Calendar & Mail",
  logo: googleCalendarLogo,
  status: "not_connected",
};

/** The full list the window scrolls, in the order the app's catalog serves. */
export const ALL_PLUGINS: DemoPlugin[] = [github, gmail, slack, spotify, linear];

const GOOGLE_HITS: DemoPlugin[] = [gmail, googleDrive, googleCalendar];

/** Every plugin the demo can show, in its opening state — the five rows plus
 *  the two that only appear under a search.
 *
 *  The container keeps this as the register it counts from, so the subtitle and
 *  the filter counts stay right when a frame is showing three filtered rows.
 *  Counting the rows on screen would say "1 connected" the moment a search hid
 *  the other one. */
export const ALL_DEMO_PLUGINS: DemoPlugin[] = [
  github,
  gmail,
  slack,
  spotify,
  linear,
  googleDrive,
  googleCalendar,
];

/** How many plugins the real catalog ships. Shown in the subtitle, so the demo
 *  does not imply the app has five. */
export const CATALOG_SIZE = 24;

/**
 * Five frames, one beat each: the shelf, a search, a connection being made, the
 * result, and the app noticing that a different connection died. The last beat
 * is the point of the section — an assistant that only works while its tokens
 * are alive has to notice when one stops working and say which one.
 *
 * The script loops. It is a marketing loop, not a tutorial, and the first
 * click hands it over for good.
 */
export const FRAMES: Frame[] = [
  {
    duration: 2600,
    query: "",
    filter: "all",
    plugins: ALL_PLUGINS,
    caption: "A list of plugins: GitHub and Spotify connected, three not yet.",
  },
  {
    duration: 2200,
    query: "google",
    filter: "all",
    plugins: GOOGLE_HITS,
    caption:
      "Searching for “google” narrows the list to Gmail, Google Drive and Google Calendar.",
  },
  {
    duration: 1100,
    query: "google",
    filter: "all",
    plugins: GOOGLE_HITS,
    busyId: "gmail",
    hoverId: "gmail",
    caption: "Connecting Gmail.",
  },
  {
    duration: 2400,
    query: "google",
    filter: "all",
    plugins: [{ ...gmail, status: "connected", live: true }, googleDrive, googleCalendar],
    hoverId: "gmail",
    caption: "Gmail is connected and answering.",
  },
  {
    duration: 4200,
    query: "",
    filter: "all",
    plugins: ALL_PLUGINS.map((p) =>
      p.id === "spotify"
        ? {
            ...p,
            status: "needs_reauth" as const,
            live: false,
            reason: "The provider withdrew the authorization",
          }
        : p.id === "gmail"
          ? { ...p, status: "connected" as const, live: true }
          : p,
    ),
    banner: {
      title: "Spotify needs reconnecting",
      detail: "The provider withdrew the authorization — reconnect to keep it working.",
    },
    caption:
      "A warning above the list: Spotify needs reconnecting because the provider withdrew the authorization.",
  },
];

/** Every frame's caption, for the sr-only paragraph beside the stage. */
export const DEMO_DESCRIPTION = [
  "A demo of the app's Plugins section.",
  ...FRAMES.map((f) => f.caption),
].join(" ");
