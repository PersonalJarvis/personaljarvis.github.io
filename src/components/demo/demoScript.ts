/**
 * What the hero demo plays — a conversation that already happened, continuing
 * into one live turn.
 *
 * Every string here becomes real text in the DOM. Nothing is an image, so the
 * demo is selectable, searchable, and survives a failed asset load.
 *
 * The turn structure mirrors the app's own timeline (see the doctrine comment
 * in the app's AgentTimeline): one container per turn, the person's line in a
 * quiet bubble on the right, the assistant flush left under a byline, the
 * thinking as a scratchpad in the place it happened, tool calls as plain rows,
 * and always a visible turn state.
 */

export interface ToolRow {
  /** The name the agent's own log uses. */
  name: string;
  detail: string;
  /** Which agent stage this row belongs to — drives the pill colour. */
  stage: "read" | "grep" | "edit" | "done";
}

export interface Turn {
  /** What the person said. Spoken, in this demo. */
  said: string;
  /** The model's thinking, as it wrote it. */
  thought: string;
  thoughtSeconds: number;
  tools: ToolRow[];
  /** The answer, as Markdown-ish plain text. */
  answer: string;
  elapsed: string;
  outTokens: string;
}

export const BYLINE = {
  model: "Claude Opus 5",
  effort: "high",
} as const;

/** The turn already on screen when the demo starts. */
export const PAST_TURN: Turn = {
  said: "What did I miss in my mail this morning?",
  thought:
    "Two threads actually need him. The invoice one has a deadline today, the " +
    "rest is newsletters and a calendar invite that clashes with the standup. " +
    "I will lead with the deadline and keep the rest to one line.",
  thoughtSeconds: 4,
  tools: [
    { name: "mail.search", detail: "unread since 07:00 — 14 messages", stage: "grep" },
    { name: "mail.read", detail: "2 threads", stage: "read" },
  ],
  answer:
    "Two things need you. The Kessler invoice is due today at 17:00, and the " +
    "design review moved to 14:30, which collides with your standup. The other " +
    "twelve are newsletters.",
  elapsed: "11s",
  outTokens: "1.2k",
};

/** The turn the demo plays out, frame by frame. */
export const LIVE_TURN: Turn = {
  said: "Move the standup to three and tell the team why.",
  thought:
    "Standup is 14:30 on Thursdays with four people. Moving it to 15:00 clears " +
    "the design review. I should check nobody has a hard conflict at three " +
    "before I send anything — Marek usually has a client call.",
  thoughtSeconds: 6,
  tools: [
    { name: "calendar.list", detail: "standup · 4 attendees · Thu 14:30", stage: "read" },
    { name: "calendar.freebusy", detail: "15:00 — all four free", stage: "grep" },
    { name: "calendar.update", detail: "standup → 15:00", stage: "edit" },
    { name: "mail.draft", detail: "note to 4 attendees", stage: "done" },
  ],
  answer:
    "Standup is at 15:00 from today. I told the four of them it moved so the " +
    "design review at 14:30 has the room. Marek's client call ends at 14:45, so " +
    "he makes it.",
  elapsed: "18s",
  outTokens: "2.1k",
};

/**
 * The frames. Each one is a state of the live turn; `duration` is how long it
 * holds before the next. The last frame is what a visitor with
 * `prefers-reduced-motion` sees immediately, so it must read as complete on
 * its own.
 */
export type Phase = "spoken" | "thinking" | "tools" | "answering" | "done";

export interface Frame {
  phase: Phase;
  /** How many tool rows are visible. */
  tools: number;
  /** How much of the answer is written, 0..1. */
  answer: number;
  duration: number;
}

export const SCRIPT: Frame[] = [
  { phase: "spoken", tools: 0, answer: 0, duration: 2200 },
  { phase: "thinking", tools: 0, answer: 0, duration: 3200 },
  { phase: "tools", tools: 2, answer: 0, duration: 1600 },
  { phase: "tools", tools: 4, answer: 0, duration: 1600 },
  { phase: "answering", tools: 4, answer: 1, duration: 4200 },
  { phase: "done", tools: 4, answer: 1, duration: 6000 },
];

/** A fixed waveform. No microphone is ever touched — see docs/hero.md. */
export const WAVEFORM: number[] = [
  0.18, 0.32, 0.51, 0.74, 0.62, 0.88, 0.71, 0.45, 0.63, 0.82, 0.95, 0.77, 0.58,
  0.39, 0.52, 0.7, 0.86, 0.68, 0.44, 0.29, 0.41, 0.6, 0.79, 0.9, 0.72, 0.55,
  0.36, 0.48, 0.66, 0.83, 0.61, 0.42, 0.27, 0.35, 0.5, 0.69, 0.81, 0.59, 0.38,
  0.22,
];
