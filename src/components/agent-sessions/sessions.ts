/**
 * The preconfigured team shown in the Agents section, and every conversation
 * it has. Static sample data: nothing here calls a model, and the window says
 * so. Each agent's chat is built from the same parts the app's transcript
 * renders (society/chat/AgentChatPanel.tsx) — time stamps, "Message from",
 * "Thought for", answers, tool lines, memory notices, artifacts, routines and
 * the approval card that waits for the person.
 */

import type { Shape } from "./AgentGlyph";

export type AgentId =
  | "jarvis"
  | "analytics"
  | "copywriter"
  | "creative"
  | "distribution"
  | "growth"
  | "inbox"
  | "reviewer"
  | "community"
  | "scout"
  | "strategist";

export type Block =
  | { p: string }
  | { ul: readonly string[] }
  | { table: readonly (readonly string[])[] }
  | { code: string };

export type Item =
  | { k: "stamp"; text: string }
  | { k: "user"; text: string }
  | { k: "from"; agent: AgentId }
  | { k: "to"; agent: AgentId; status: "Delivered" | "Queued" }
  | { k: "thought"; secs: string; steps?: readonly string[] }
  | { k: "reply"; blocks: readonly Block[]; done?: string }
  | { k: "tool"; text: string }
  | { k: "memory"; file: string }
  | { k: "artifact"; title: string; meta: string }
  | { k: "routine"; title: string; schedule: string }
  | { k: "approval"; id: string; ask: string; yes: string; no: string; afterYes: string; afterNo: string };

export type Preview = "newtab" | "results" | "github" | "stock" | "compose" | "landing" | "mail" | "pull" | "forum";

export interface Model {
  provider: string;
  chip: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  title: string;
  shape: Shape;
  /** Token name from tokens.css § "Agent identity". */
  color: string;
  model: Model;
  preview: Preview;
  url: string;
  live: boolean;
  chats: readonly (readonly [string, string])[];
  routines: readonly (readonly [string, string])[];
  items: readonly Item[];
  replies: readonly string[];
}

const GEMINI: Model = { provider: "Google Gemini", chip: "gemini-3.8-flash" };
const OPENAI: Model = { provider: "OpenAI", chip: "provider default" };
const LOCAL: Model = { provider: "Ollama · local", chip: "qwen3:8b" };

export const AGENTS: Readonly<Record<AgentId, Agent>> = {
  jarvis: {
    id: "jarvis",
    name: "Jarvis",
    title: "Lead",
    shape: "ghost",
    color: "--ink",
    model: GEMINI,
    preview: "newtab",
    url: "search · new tab",
    live: true,
    chats: [
      ["Launch plan for v1.4", "Today"],
      ["Book the offsite venue", "26 Sept."],
      ["Summarise the investor call", "24 Sept."],
      ["Weekly team digest", "22 Sept."],
    ],
    routines: [["Morning stand-up digest", "daily 08:00"]],
    items: [
      { k: "stamp", text: "Today 09:02" },
      { k: "user", text: "Plan the launch of v1.4 for next Tuesday. Keep me out of the details." },
      {
        k: "thought",
        secs: "14s",
        steps: ["Split the launch into research, copy, visuals and distribution.", "Checked who is free: 6 of 8 agents are idle."],
      },
      {
        k: "reply",
        blocks: [
          { p: "On it. I split the launch into four tracks and handed each one to the agent that owns it:" },
          {
            ul: [
              "**Copywriter** — release notes and the announcement post",
              "**Demo & Creative Agent** — a 30-second product clip",
              "**Distribution Agent** — schedule for X, LinkedIn and the newsletter",
              "**Analytics Agent** — a baseline, so we can measure the launch",
            ],
          },
          { p: "Anything that publishes or sends waits for your OK." },
        ],
        done: "14s",
      },
      { k: "to", agent: "copywriter", status: "Delivered" },
      { k: "to", agent: "creative", status: "Delivered" },
      { k: "to", agent: "distribution", status: "Queued" },
      { k: "stamp", text: "Today 11:40" },
      { k: "from", agent: "copywriter" },
      {
        k: "reply",
        blocks: [{ p: "The copy is done. Copywriter's headline: **“Your agents now work as a team.”** Distribution schedules it as soon as you approve the posts." }],
        done: "3s",
      },
    ],
    replies: [
      "Got it. I'll hand that to whoever owns it and only come back when it needs you.",
      "Noted — it's on the plan. You'll see it in the digest tomorrow morning.",
    ],
  },

  analytics: {
    id: "analytics",
    name: "Analytics Agent",
    title: "Performance & Conversion Analyst",
    shape: "circle",
    color: "--agent-orange",
    model: GEMINI,
    preview: "results",
    url: "analytics · weekly report",
    live: true,
    chats: [
      ["Launch baseline v1.4", "Today"],
      ["Why did signups dip on Sunday?", "25 Sept."],
      ["Docs funnel audit", "19 Sept."],
    ],
    routines: [["Weekly KPI report", "Mondays 08:30"]],
    items: [
      { k: "stamp", text: "Today 09:03" },
      { k: "user", text: "Before Tuesday's launch: where do we stand? I want a baseline to measure against." },
      {
        k: "thought",
        secs: "22s",
        steps: ["Pulled the last 28 days from the analytics plugin.", "Compared them with the v1.3 launch week."],
      },
      { k: "tool", text: "analytics · weekly_report · 28 days" },
      {
        k: "reply",
        blocks: [
          { p: "Baseline for the v1.4 launch, last 28 days:" },
          {
            table: [
              ["Metric", "Now", "v1.3 launch"],
              ["Visitors / day", "1,284", "3,910"],
              ["Download rate", "6.8 %", "9.1 %"],
              ["Docs → install", "22 %", "31 %"],
            ],
          },
          { p: "The weak spot is the docs: a third fewer readers reach the install step. I'd fix that before Tuesday." },
        ],
        done: "22s",
      },
      { k: "to", agent: "jarvis", status: "Delivered" },
      { k: "user", text: "Which page loses them?" },
      { k: "thought", secs: "6s", steps: ["Opened the funnel for /docs/installation.", "Split exits by OS tab: Windows loses the most.", "Replayed three sessions: the command wraps and gets copied in half."] },
      {
        k: "reply",
        blocks: [{ p: "`/docs/installation` — 41 % leave on the Windows tab. The install command wraps on small screens, and people copy only half of it." }],
        done: "6s",
      },
      { k: "memory", file: "MEMORY.md" },
    ],
    replies: [
      "Checking. I'll compare it with the same week last month and send you one chart.",
      "Good question — I'll add that breakdown to Monday's report.",
    ],
  },

  copywriter: {
    id: "copywriter",
    name: "Copywriter",
    title: "Technical & Platform Copywriter",
    shape: "circle",
    color: "--agent-rose",
    model: OPENAI,
    preview: "github",
    url: "docs · CHANGELOG.md",
    live: false,
    chats: [
      ["v1.4 announcement", "Today"],
      ["README hero rewrite", "23 Sept."],
      ["Release notes v1.3", "12 Sept."],
    ],
    routines: [],
    items: [
      { k: "stamp", text: "Today 09:04" },
      { k: "user", text: "Write the announcement post for v1.4. Plain, no hype." },
      {
        k: "thought",
        secs: "31s",
        steps: ["Read CHANGELOG.md since v1.3.", "Loaded the voice guide from memory: plain, concrete, no hype."],
      },
      {
        k: "reply",
        blocks: [
          { p: "Draft for the announcement post:" },
          { p: "**Your agents now work as a team.** Give Jarvis one goal. It splits the work, hands each part to the agent that owns it, and only comes back when something needs you." },
          { p: "New in v1.4: group chats between agents, a live browser for every agent, and routines that run on a schedule." },
        ],
        done: "31s",
      },
      { k: "user", text: "Shorter. Two sentences max." },
      { k: "thought", secs: "4s", steps: ["Kept the headline, it carries the idea.", "Cut the feature list; it belongs in the release notes."] },
      {
        k: "reply",
        blocks: [{ p: "**Your agents now work as a team.** Give Jarvis one goal — it hands out the work and only comes back when something needs you." }],
        done: "4s",
      },
      { k: "memory", file: "voice-guide.md" },
      { k: "to", agent: "jarvis", status: "Delivered" },
    ],
    replies: [
      "Here's a tighter version — same meaning, eleven words fewer.",
      "Noted in the voice guide, so every agent writes it that way from now on.",
    ],
  },

  creative: {
    id: "creative",
    name: "Demo & Creative Agent",
    title: "Demo, Visual & Scenario Designer",
    shape: "drop",
    color: "--agent-lime",
    model: GEMINI,
    preview: "stock",
    url: "artifact · storyboard",
    live: true,
    chats: [
      ["30-second launch clip", "Today"],
      ["Social cards for v1.4", "25 Sept."],
    ],
    routines: [],
    items: [
      { k: "stamp", text: "Today 09:05" },
      { k: "user", text: "Make a 30-second clip for the launch. Show the agents working together." },
      {
        k: "thought",
        secs: "48s",
        steps: ["Storyboarded five shots from the release notes.", "Rendered them in an isolated copy of the project."],
      },
      { k: "reply", blocks: [{ p: "The storyboard for the 30-second clip is ready. Five shots, one idea each:" }] },
      { k: "artifact", title: "launch-clip-storyboard.html", meta: "Artifact · 5 frames · 30 s" },
      {
        k: "reply",
        blocks: [{ p: "Frame 3 shows two agents talking in a group chat — it's the strongest moment, so it gets the longest hold." }],
        done: "48s",
      },
      { k: "user", text: "Open on the dark theme." },
      { k: "thought", secs: "9s", steps: ["Swapped frame 1 to the dark theme.", "Re-rendered only frame 1; frames 2–5 are unchanged."] },
      { k: "reply", blocks: [{ p: "Done. Frame 1 now opens on the dark theme; the other four are unchanged." }], done: "9s" },
    ],
    replies: [
      "Rendering a new version now — it'll show up as a second artifact next to the first.",
      "I'll try two variants and keep both, so you can pick.",
    ],
  },

  distribution: {
    id: "distribution",
    name: "Distribution Agent",
    title: "Multi-Channel Distribution Orchestrator",
    shape: "hexagon",
    color: "--agent-violet",
    model: OPENAI,
    preview: "compose",
    url: "x.com · compose",
    live: true,
    chats: [
      ["Launch schedule v1.4", "Today"],
      ["Newsletter September", "20 Sept."],
    ],
    routines: [["Post-launch numbers", "day after each post"]],
    items: [
      { k: "stamp", text: "Today 11:42" },
      { k: "from", agent: "jarvis" },
      { k: "thought", secs: "17s", steps: ["Checked when each channel's audience is most active.", "Paired the copy with the clip for LinkedIn."] },
      {
        k: "reply",
        blocks: [
          { p: "Launch schedule for Tuesday:" },
          {
            ul: [
              "**X** — 16:00, a thread of three posts",
              "**LinkedIn** — 17:30, one post with the clip",
              "**Newsletter** — Wednesday 08:00, 2,340 subscribers",
            ],
          },
          { p: "Posting is an ask-tier action, so nothing goes out without you." },
        ],
        done: "17s",
      },
      {
        k: "approval",
        id: "distribution-schedule",
        ask: "Schedule three posts for Tuesday?",
        yes: "Approve",
        no: "Not now",
        afterYes: "Scheduled. I'll report the first numbers on Wednesday.",
        afterNo: "Held. The drafts stay in your queue.",
      },
    ],
    replies: [
      "Moved. The rest of the schedule shifts with it.",
      "I'll draft that version too — it waits for your OK like the others.",
    ],
  },

  growth: {
    id: "growth",
    name: "Growth Learner",
    title: "Continuous Growth & Experiments",
    shape: "hexagon",
    color: "--agent-sage",
    model: LOCAL,
    preview: "landing",
    url: "experiments · dashboard",
    live: false,
    chats: [
      ["Weekly experiment review", "Mon"],
      ["Pricing page test", "15 Sept."],
    ],
    routines: [["Weekly experiment review", "Mondays 09:00"]],
    items: [
      { k: "routine", title: "Weekly experiment review", schedule: "Mondays 09:00" },
      { k: "stamp", text: "Mon 09:00" },
      { k: "thought", secs: "36s", steps: ["Pulled results of three running experiments.", "Checked each one at 95 % confidence."] },
      {
        k: "reply",
        blocks: [
          { p: "Weekly review — three experiments:" },
          {
            table: [
              ["Test", "Result", "Call"],
              ["Shorter hero headline", "+11 % downloads", "Keep"],
              ["Video above the fold", "+2 %", "Not significant"],
              ["Install button in nav", "−4 %", "Revert"],
            ],
          },
          { p: "I reverted the nav button and started one new test: a single install command instead of three tabs." },
        ],
        done: "36s",
      },
      { k: "memory", file: "experiments.md" },
      { k: "user", text: "Why revert the nav button? It looked good." },
      {
        k: "thought",
        secs: "7s",
        steps: ["Compared both variants over 2,410 visits.", "The button pulled clicks away from the install command below it."],
      },
      {
        k: "reply",
        blocks: [{ p: "It looked good, but it cost us: people clicked it, landed on a page without the command, and **4 %** fewer finished the install. The command itself is the better button." }],
        done: "7s",
      },
    ],
    replies: [
      "I'll set that up as a test with a 50/50 split and report next Monday.",
      "Logged. It runs locally, so none of this data leaves your machine.",
    ],
  },

  inbox: {
    id: "inbox",
    name: "Inbox Manager",
    title: "Mail & Calendar",
    shape: "squircle",
    color: "--agent-sky",
    model: GEMINI,
    preview: "mail",
    url: "mail · inbox",
    live: true,
    chats: [
      ["Morning inbox sweep", "Today"],
      ["Offsite RSVPs", "26 Sept."],
      ["Travel receipts", "21 Sept."],
    ],
    routines: [["Morning inbox sweep", "daily 07:30"]],
    items: [
      { k: "routine", title: "Morning inbox sweep", schedule: "daily 07:30" },
      { k: "stamp", text: "Today 07:30" },
      { k: "thought", secs: "12s", steps: ["Read 38 unread mails and sorted them by sender and urgency.", "Matched 11 of them to your reply templates.", "Filed receipts to Drive before archiving."] },
      { k: "tool", text: "gmail · search · 38 unread" },
      {
        k: "reply",
        blocks: [
          { p: "Inbox at zero. 38 unread, handled like this:" },
          {
            ul: [
              "**4 need you** — pinned, each with a one-line summary",
              "**11 answered** from your templates, sent after your 10-minute hold",
              "**23 archived** — newsletters and receipts; receipts filed to Drive",
            ],
          },
        ],
        done: "12s",
      },
      { k: "user", text: "What's the most urgent one?" },
      { k: "thought", secs: "3s", steps: ["Checked deadlines mentioned in the pinned mails.", "The venue wants a number by 12:00 today."] },
      {
        k: "reply",
        blocks: [{ p: "The venue for Thursday wants a headcount by 12:00 today. Your calendar says 14 people." }],
        done: "3s",
      },
      {
        k: "approval",
        id: "inbox-venue",
        ask: "Reply to the venue: “We'll be 14.”",
        yes: "Send",
        no: "Edit first",
        afterYes: "Sent. I added the headcount to the calendar event.",
        afterNo: "Okay — the draft is waiting in your outbox.",
      },
    ],
    replies: [
      "Found it. I'll pin it to the top and summarise it in one line.",
      "Blocked the time in your calendar. Nothing was sent.",
    ],
  },

  reviewer: {
    id: "reviewer",
    name: "Code Reviewer",
    title: "Pull Requests & CI",
    shape: "triangle",
    color: "--agent-rose",
    model: OPENAI,
    preview: "pull",
    url: "github · pull/412",
    live: false,
    chats: [
      ["PR 412 reconnect jitter", "Today"],
      ["Flaky test in CI", "24 Sept."],
    ],
    routines: [["Review new pull requests", "on every PR"]],
    items: [
      { k: "stamp", text: "Today 10:21" },
      { k: "user", text: "Review PR 412 before I merge it. Is it safe?" },
      {
        k: "thought",
        secs: "1m 12s",
        steps: ["Checked out PR 412 in an isolated worktree.", "Ran the test suite: 1,184 passed."],
      },
      { k: "tool", text: "github · pull_request · 412" },
      {
        k: "reply",
        blocks: [
          { p: "PR 412 is almost ready. One real problem:" },
          { code: "- retry(delay=1.0)\n+ retry(delay=1.0 + random() * 0.5)" },
          { p: "Without jitter, every open window reconnects at the same moment after sleep. I pushed the fix to the branch and re-ran CI — green." },
        ],
        done: "1m 12s",
      },
      {
        k: "approval",
        id: "reviewer-merge",
        ask: "Merge PR 412 into main?",
        yes: "Merge",
        no: "Not now",
        afterYes: "Merged. Branch deleted, CI on main is green.",
        afterNo: "Left open. I'll re-check it if main moves.",
      },
    ],
    replies: [
      "Looking at it in a separate worktree — your checkout stays untouched.",
      "Added a regression test for that. CI is running.",
    ],
  },

  community: {
    id: "community",
    name: "Reddit & Community Agent",
    title: "Community & Technical Discussions",
    shape: "hexagon",
    color: "--agent-lilac",
    model: GEMINI,
    preview: "forum",
    url: "reddit.com/r/LocalLLaMA",
    live: true,
    chats: [
      ["Threads worth answering", "Today"],
      ["FAQ from the Discord", "22 Sept."],
    ],
    routines: [["Community scan", "daily 18:00"]],
    items: [
      { k: "stamp", text: "Today 18:00" },
      { k: "routine", title: "Community scan", schedule: "daily 18:00" },
      {
        k: "thought",
        secs: "28s",
        steps: ["Searched r/LocalLLaMA and r/selfhosted for the last 7 days.", "Read 24 threads; 3 ask about voice assistants."],
      },
      { k: "tool", text: "browser · reddit.com · 24 threads" },
      {
        k: "reply",
        blocks: [
          { p: "Three threads worth answering this week:" },
          {
            ul: [
              "**“A local voice assistant that can actually use my apps?”** — 212 upvotes, no good answer yet",
              "**“Local speech-to-text latency?”** — we have real numbers",
              "**“Agents that ask before they act”** — that's our approval flow",
            ],
          },
          { p: "Replies are drafted: factual, they say we build it, and they never link twice." },
        ],
        done: "28s",
      },
      {
        k: "approval",
        id: "community-post",
        ask: "Post three replies from your account?",
        yes: "Post",
        no: "Review first",
        afterYes: "Posted. I'll watch for follow-up questions tonight.",
        afterNo: "Okay — the drafts are in the chat above.",
      },
    ],
    replies: [
      "I'll keep an eye on that thread and tell you if someone asks us directly.",
      "Drafted. It waits for your OK before anything is posted.",
    ],
  },

  scout: {
    id: "scout",
    name: "Trend Scout",
    title: "AI & Developer Trend Scout",
    shape: "hexagon",
    color: "--agent-lilac",
    model: GEMINI,
    preview: "forum",
    url: "news · trending",
    live: true,
    chats: [],
    routines: [],
    items: [
      { k: "stamp", text: "Today 10:15" },
      { k: "from", agent: "strategist" },
      { k: "thought", secs: "1m 44s", steps: ["Scanned 30 days of developer forums and news.", "Clustered 212 mentions into topics."] },
      {
        k: "reply",
        blocks: [
          { p: "Three signals worth a campaign this month:" },
          {
            ul: [
              "`on-device voice` — mentions up 3× in 30 days",
              "`agent approvals` — people ask who presses the button",
              "`multi-agent chat` — new, still no clear winner",
            ],
          },
        ],
        done: "1m 44s",
      },
      { k: "memory", file: "MEMORY.md" },
      { k: "to", agent: "strategist", status: "Delivered" },
    ],
    replies: ["I'll keep scanning and flag anything that moves fast."],
  },

  strategist: {
    id: "strategist",
    name: "Content Strategist",
    title: "Marketing & Narrative Strategist",
    shape: "circle",
    color: "--agent-violet",
    model: GEMINI,
    preview: "github",
    url: "docs · campaign-brief.md",
    live: false,
    chats: [],
    routines: [],
    items: [
      { k: "stamp", text: "Today 10:17" },
      { k: "from", agent: "scout" },
      { k: "thought", secs: "28s", steps: ["Weighed the three signals against what we can show today.", "Approvals is the one worry we answer better than anyone."] },
      {
        k: "reply",
        blocks: [
          { p: "Picking **agent approvals** as the angle: it's the worry we answer better than anyone." },
          { p: "The brief — three posts and one demo — is in `campaign-brief.md`." },
        ],
        done: "28s",
      },
      { k: "memory", file: "campaign-brief.md" },
      { k: "to", agent: "copywriter", status: "Queued" },
    ],
    replies: ["Adding that to the brief. Copywriter picks it up next."],
  },
};

/** The rail, top to bottom — as the app lists a team under its lead. */
export const ROSTER: readonly AgentId[] = [
  "analytics",
  "copywriter",
  "creative",
  "distribution",
  "growth",
  "inbox",
  "reviewer",
  "community",
];

export const GROUP = {
  id: "group" as const,
  name: "Trend Scout + Content Strategist",
  members: ["scout", "strategist"] as const,
};

export type SessionId = AgentId | "group";

/** The order the self-running tour walks when nobody is driving. It opens on
 * a specialist, not on the lead: the section is about the team. */
export const TOUR: readonly SessionId[] = [...ROSTER, "group", "jarvis"];
