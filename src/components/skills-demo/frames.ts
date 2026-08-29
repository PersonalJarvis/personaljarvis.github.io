/**
 * The skills demo script.
 *
 * Every name, date, author, count, reason string, frontmatter field and trigger
 * pattern below was read out of the running app and then checked a second time
 * by an adversarial pass against the source. What that pass threw out is worth
 * recording, because all four were plausible and all four were wrong:
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
 * Each row carries its own card, so a visitor who takes the demo over can open
 * any of them — including the one written here rather than shipped.
 */

/** A trigger's kind, which decides its glyph. The app draws one glyph per
 *  trigger in frontmatter order — two voice triggers means two microphones. */
export type TriggerKind = "voice" | "hotkey" | "cron";

export interface SkillCard {
  /** "Built-in", or "by You" for one written here. */
  byline: string;
  description: string;
  /** The lifecycle state the registry reports for it. */
  status: string;
  version?: string;
  category: string;
  license?: string;
  tags: string[];
  triggers: Array<{ kind: TriggerKind; pattern: string; locales?: string }>;
}

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
  /** Read out of this skill's own SKILL.md frontmatter. */
  card: SkillCard;
}

/** The five rows the shelf shows, in the app's order — it sorts by name. */
const SHELF: DemoSkill[] = [
  {
    name: "deep-work-mode",
    triggers: ["hotkey", "voice"],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
    card: {
      byline: "Built-in",
      description:
        "Activates a distraction-free focus sprint: quiet notifications where possible, focus music if Spotify is connected, and a clear spoken start signal with the sprint duration.",
      status: "Validated",
      version: "2.1.0",
      category: "productivity",
      license: "Apache-2.0",
      tags: ["focus", "dnd", "timer", "slack"],
      triggers: [
        { kind: "hotkey", pattern: "ctrl+alt+d", locales: "de, en" },
        {
          kind: "voice",
          pattern:
            "^(deep[-\\s]?work([-\\s]?mode| modus)?|fokus[-\\s]?modus|konzentrations[-\\s]?modus)$",
          locales: "de, en",
        },
      ],
    },
  },
  {
    name: "memory-save",
    triggers: [],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
    card: {
      byline: "Built-in",
      description:
        "DEPRECATED since B5 (2026-05-13). Long-term-memory writes go through the wiki pipeline instead.",
      // Its frontmatter says `state: disabled`; the prefs sidecar overrides it
      // back to active, which is why the switch on the row is on. This is the
      // state the registry actually reports.
      status: "Active",
      version: "2.0.0",
      category: "memory",
      license: "Apache-2.0",
      tags: ["memory", "notes", "recall", "deprecated"],
      triggers: [],
    },
  },
  {
    name: "morning-routine",
    triggers: ["voice", "voice", "cron"],
    updated: "8/27/26",
    author: "Personal Jarvis",
    on: true,
    card: {
      byline: "Built-in",
      description:
        "Delivers the user's spoken morning briefing: today's calendar, unread email summary, weather, and anything urgent.",
      status: "Validated",
      version: "2.0.0",
      category: "productivity",
      license: "Apache-2.0",
      tags: ["daily", "routine", "mail", "calendar", "weather"],
      triggers: [
        {
          kind: "voice",
          // The full pattern. The column truncates it with an ellipsis exactly
          // as the app does — a hand-shortened regex is a different regex.
          pattern:
            "(morgenroutine|morgen[-\\s]?briefing|morning routine|morning briefing|start day|tagesüberblick)",
          locales: "de, en",
        },
        {
          kind: "voice",
          pattern: "^(guten morgen|good morning)[.!\\s]*$",
          locales: "de, en",
        },
        { kind: "cron", pattern: "0 7 * * *", locales: "de, en" },
      ],
    },
  },
  {
    name: "plugin-spotify",
    // Two voice triggers, so two microphones. The single glyph was a
    // fabrication the verify pass caught.
    triggers: ["voice", "voice"],
    updated: "8/22/26",
    author: "Personal Jarvis",
    on: true,
    card: {
      byline: "Built-in",
      description: "Play and control the user's music on Spotify.",
      status: "Validated",
      category: "media",
      tags: [],
      triggers: [
        { kind: "voice", pattern: "(spotify|musik|music|música)" },
        {
          kind: "voice",
          pattern:
            "(spiel\\w*|play|abspielen|pon|reproduce).{0,48}(lied|song|titel|track|playlist|album)",
        },
      ],
    },
  },
  {
    name: "three-bullet-brief",
    triggers: [],
    updated: "8/14/26",
    author: "You",
    on: true,
    card: {
      byline: "by You",
      description:
        "Turns any topic, text, or document into exactly three crisp bullets plus a one-line takeaway. Use when the user asks for a brief, a TLDR, a quick summary, or “give me the short version”.",
      status: "Validated",
      version: "1.0.0",
      category: "productivity",
      license: "MIT",
      tags: ["summary", "brief", "writing"],
      triggers: [],
    },
  },
];

export const SHELF_SKILLS = SHELF;

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
    card: {
      byline: "Built-in",
      description: "Read and write the user's Supabase tables.",
      status: "Validated",
      category: "developer",
      tags: [],
      triggers: [
        {
          kind: "voice",
          pattern: "(supabase|supabase-datenbank|supabase-tabelle|in supabase)",
        },
      ],
    },
  },
  { ...SHELF[1], reason: "trigram: summary" },
  {
    name: "plugin-airtable",
    triggers: ["voice"],
    updated: "8/22/26",
    author: "Personal Jarvis",
    on: true,
    reason: "trigram: summary",
    card: {
      byline: "Built-in",
      description: "Read and write the user's Airtable bases.",
      status: "Validated",
      category: "developer",
      tags: [],
      triggers: [{ kind: "voice", pattern: "(airtable|air table)" }],
    },
  },
];

/** The skill the script opens. After take-over any row can be opened. */
export const SCRIPTED_DETAIL = "morning-routine";

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
  /** Which skill the detail layouts show, and which row the list lifts. */
  openName?: string;
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
    openName: SCRIPTED_DETAIL,
    caption:
      "Opening morning-routine shows what it is for, and its status, version and category, read out of the file itself.",
  },
  {
    duration: 5200,
    layout: "triggers",
    query: "",
    filter: "all",
    skills: SHELF,
    openName: SCRIPTED_DETAIL,
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
      "Filtering to “Mine” leaves the one skill written here, three-bullet-brief. Click it to read its card.",
  },
];

export const DEMO_DESCRIPTION = [
  "A demo of the app's Skills section.",
  ...FRAMES.map((f) => f.caption),
].join(" ");
