/**
 * The skills demo script.
 *
 * Every name, date, author, count, reason string and trigger pattern below was
 * read out of the running app and then checked a second time by an adversarial
 * pass against the source. What that pass threw out is worth recording, because
 * all four were plausible and all four were wrong:
 *
 *  - A row with its switch OFF. Nothing in this install is off: 30 skills load
 *    `validated` and memory-save loads `active`, so all 31 switches are on.
 *    memory-save's frontmatter does say `state: disabled`, but the prefs
 *    sidecar overrides it back to active — the opposite of what it looks like.
 *  - "3 matches" for the query "summary". The real answer is 9: the search has
 *    a trigram channel that drags a long low-score tail in behind the three
 *    good hits. A tidy three-row result is a result the app does not produce.
 *  - Scores above 1.0. `_match_text` ends in `min(1.0, …)`, so 1.00 is the cap.
 *  - A hand-picked row order. GET /api/skills sorts by name when no user order
 *    is saved, and none is saved here.
 *
 * See docs/feature-section.md § "Shortening" for why the demo is smaller than
 * the app, and never smaller than the truth.
 */

/** A trigger's kind, which decides its glyph. The app draws one glyph per
 *  trigger in frontmatter order — two voice triggers means two microphones. */
export type TriggerKind = "voice" | "hotkey" | "cron";

export interface DemoSkill {
  name: string;
  /** In frontmatter order. */
  triggers: TriggerKind[];
  /** Rendered as the app renders it: a short US date. */
  updated: string;
  /** "Personal Jarvis" for a built-in, "You" for one you wrote. */
  author: string;
  on: boolean;
  /** The search's own explanation of why this row matched. */
  reason?: string;
}

/** The five rows the shelf shows, in the app's order — it sorts by name. */
const SHELF: DemoSkill[] = [
  {
    name: "deep-work-mode",
    triggers: ["hotkey", "voice"],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
  },
  {
    name: "memory-save",
    triggers: [],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
  },
  {
    name: "morning-routine",
    triggers: ["voice", "voice", "cron"],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
  },
  {
    name: "plugin-spotify",
    // Two voice triggers, so two microphones. The single glyph was a
    // fabrication the verify pass caught.
    triggers: ["voice", "voice"],
    updated: "8/22/26",
    author: "Personal Jarvis",
    on: true,
  },
  {
    name: "three-bullet-brief",
    triggers: [],
    updated: "8/14/26",
    author: "You",
    on: true,
  },
];

/** Query "summary" really returns nine hits. These are the top five, with the
 *  app's own reason strings — the field and the word that matched. */
const HITS: DemoSkill[] = [
  { ...SHELF[4], reason: "tag: summary" },
  { ...SHELF[2], reason: "description: summary" },
  {
    name: "plugin-supabase",
    triggers: ["voice"],
    updated: "8/22/26",
    author: "Personal Jarvis",
    on: true,
    reason: "trigram: summary",
  },
  { ...SHELF[1], reason: "trigram: summary" },
  {
    name: "plugin-airtable",
    triggers: ["voice"],
    updated: "8/22/26",
    author: "Personal Jarvis",
    on: true,
    reason: "trigram: summary",
  },
];

/** The one skill the demo opens. Read straight out of its frontmatter. */
export const DETAIL = {
  name: "morning-routine",
  byline: "Built-in",
  description:
    "Delivers the user's spoken morning briefing: today's calendar, unread email summary, weather, and anything urgent.",
  facts: [
    { label: "Status", value: "Validated" },
    { label: "Version", value: "2.0.0" },
    { label: "Category", value: "productivity" },
  ],
  tags: ["daily", "routine", "mail", "calendar", "weather"],
  triggers: [
    {
      kind: "voice" as TriggerKind,
      // The full pattern. The column truncates it with an ellipsis exactly as
      // the app does — a hand-shortened regex would be a different regex.
      pattern:
        "(morgenroutine|morgen[-\\s]?briefing|morning routine|morning briefing|start day|tagesüberblick)",
      locales: "de, en",
    },
    {
      kind: "voice" as TriggerKind,
      pattern: "^(guten morgen|good morning)[.!\\s]*$",
      locales: "de, en",
    },
    { kind: "cron" as TriggerKind, pattern: "0 7 * * *", locales: "de, en" },
  ],
};

export type Layout = "list" | "detail" | "triggers";

export interface Frame {
  duration: number;
  layout: Layout;
  /** Text in the search box. Empty shows the placeholder. */
  query: string;
  filter: "all" | "mine";
  skills: DemoSkill[];
  /** The app's "{n} matches" line, shown while a filter is narrowing. */
  matches?: number;
  hoverName?: string;
  caption: string;
}

/** How many skills this install actually has. Shown in the header, so the demo
 *  never implies the app ships five. */
export const SKILL_COUNT = 31;

export const FRAMES: Frame[] = [
  {
    duration: 4200,
    layout: "list",
    query: "",
    filter: "all",
    skills: SHELF,
    caption:
      "A list of skills. Each is a file with a switch, and the one you wrote sits in the same list as the ones that shipped.",
  },
  {
    duration: 4000,
    layout: "list",
    query: "summary",
    filter: "all",
    skills: HITS,
    matches: 9,
    caption:
      "Searching for “summary” narrows the list to nine, and every hit says which field matched.",
  },
  {
    duration: 4200,
    layout: "detail",
    query: "",
    filter: "all",
    skills: SHELF,
    hoverName: DETAIL.name,
    caption:
      "Opening morning-routine shows what it is for, and its status, version and category, read out of the file itself.",
  },
  {
    duration: 5200,
    layout: "triggers",
    query: "",
    filter: "all",
    skills: SHELF,
    hoverName: DETAIL.name,
    caption:
      "Its triggers: two spoken phrases and one clock entry at seven in the morning. Those three lines are the whole reason the briefing starts.",
  },
  {
    duration: 3600,
    layout: "list",
    query: "",
    filter: "mine",
    skills: [SHELF[4]],
    matches: 1,
    caption:
      "Filtering to “Mine” leaves the one skill written here, three-bullet-brief.",
  },
];

export const DEMO_DESCRIPTION = [
  "A demo of the app's Skills section.",
  ...FRAMES.map((f) => f.caption),
].join(" ");
