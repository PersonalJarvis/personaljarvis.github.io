/**
 * What the hero demo plays: TWO reruns of the same assistant, one per surface.
 *
 * The app's front page is a single section with a single `Voice | Chat` switch
 * at the top of its sidebar (the app's own `lib/homeSurface.ts` says so in as
 * many words: "not two sections: both talk to the same assistant and share one
 * history"). The demo clones that. Each half replays a conversation that
 * already happened, continuing into one live turn — with the turn's reasoning
 * shown where it happened, exactly as the product shows it.
 *
 * The two reruns are deliberately different jobs. Voice is the thing you say
 * while your hands are busy — move a meeting, tell the team. Chat is the thing
 * you type because it has an artefact at the end — a summary, a page, a post.
 * A visitor who watches both should come away knowing they are one assistant
 * with two ways in, not two products.
 *
 * Every string here becomes real text in the DOM. Nothing is an image, so the
 * demo is selectable, searchable, and survives a failed asset load.
 */

import gmailLogo from "@/assets/brands/gmail.svg?url";
import googleCalendarLogo from "@/assets/brands/google_calendar.svg?url";
import linearLogo from "@/assets/brands/linear.svg?url";
import slackLogo from "@/assets/brands/slack.svg?url";

/** Which half of the front page is on screen. Mirrors the app's `HomeSurface`. */
export type Surface = "voice" | "chat";

/**
 * One tool call, drawn as a ROW and never a card — the app's rule, because a
 * run of six calls in six boxes is a wall (`AgentTimeline`, "One tool call").
 *
 * `label` is the agent's own name for it, never a prettied-up rename: the row
 * is read next to the agent's log. `logo` is the service's real mark where a
 * service was called; a call into the product itself has no logo and wears the
 * feature's glyph instead.
 */
export interface Step {
  label: string;
  summary: string;
  /** The vendor's own SVG, bundled. Absent for the product's own tools. */
  logo?: string;
  /** Which glyph stands in when there is no vendor mark. */
  glyph?: "wiki" | "memory" | "screen";
  /** What the call took, in the app's own format. */
  took: string;
}

export interface Turn {
  /** What the person said, or typed. */
  said: string;
  /** The model's reasoning, in its own words. */
  thought: string;
  thoughtSeconds: number;
  steps: Step[];
  /** The answer. A leading "- " makes a bullet, as in the app's Markdown. */
  answer: string[];
  /** The closing line of a finished turn. */
  elapsed: string;
  outTokens: string;
}

/** Who answered, on each surface. Both are real product configurations. */
export const VOICE_ENGINE = {
  provider: "Gemini Live",
  model: "gemini-3.1-flash-live",
} as const;

export const CHAT_ENGINE = {
  provider: "Anthropic Claude",
  model: "Opus 5",
  effort: "high",
} as const;

/** The wake word the bar's hint offers. The app fills the configured one in. */
export const WAKE_PHRASE = "Hey Jarvis";

// ---------------------------------------------------------------------------
// The voice rerun — hands busy, one thing to decide
// ---------------------------------------------------------------------------

export const VOICE_TURNS: Turn[] = [
  {
    said: "Hey Jarvis — what does my morning look like?",
    thought:
      "Fourteen unread, and almost all of it is newsletters. Two things are " +
      "real: the Kessler invoice has a deadline today, and the design review " +
      "has been moved on top of the standup. The clash is the only thing he " +
      "has to decide, so lead with that and keep the rest to one line.",
    thoughtSeconds: 5,
    steps: [
      { label: "gmail", summary: "unread since 07:00 — 14 messages", logo: gmailLogo, took: "0.4s" },
      { label: "calendar", summary: "today — 6 events", logo: googleCalendarLogo, took: "0.3s" },
    ],
    answer: [
      "Three things. The Kessler invoice is due at five. The design review moved to half two — and it now sits on top of your standup. The other twelve are newsletters.",
    ],
    elapsed: "11s",
    outTokens: "480",
  },
  {
    said: "Move the standup to three and tell the team why.",
    thought:
      "Standup is Thursdays at half two, four people. Three o'clock clears the " +
      "review. Marek usually has a client call in the early afternoon, so I " +
      "check free/busy before I move anything — a note about a meeting somebody " +
      "cannot make is worse than no note.",
    thoughtSeconds: 6,
    steps: [
      {
        label: "calendar",
        summary: "freebusy · 15:00 — all four free",
        logo: googleCalendarLogo,
        took: "0.5s",
      },
      { label: "calendar", summary: "standup → 15:00", logo: googleCalendarLogo, took: "0.6s" },
      { label: "slack", summary: "#team — note to 4 people", logo: slackLogo, took: "0.4s" },
    ],
    answer: [
      "Standup is at three from today. I told the four of them the design review took the half-two slot. Marek's client call ends at quarter to, so he makes it.",
    ],
    elapsed: "18s",
    outTokens: "610",
  },
];

// ---------------------------------------------------------------------------
// The chat rerun — typed, because it ends in something written down
// ---------------------------------------------------------------------------

export const CHAT_TURNS: Turn[] = [
  {
    said: "Summarise what the team shipped last week and put it in the wiki.",
    thought:
      "Linear for what actually closed, Slack for what was announced — the two " +
      "disagree often enough to be worth reading both. Eleven issues, but only " +
      "four of them are things a person outside the team would notice. The wiki " +
      "page should say what changed for a user, not which tickets moved.",
    thoughtSeconds: 9,
    steps: [
      { label: "linear", summary: "closed · last 7 days — 11 issues", logo: linearLogo, took: "0.6s" },
      { label: "slack", summary: "#releases — 4 announcements", logo: slackLogo, took: "0.4s" },
      { label: "wiki.write", summary: "Shipped — week 35", glyph: "wiki", took: "0.9s" },
    ],
    answer: [
      "Eleven issues closed. Four of them are things a user will notice:",
      "- Dictation punctuates German properly — it had been running on an English prompt.",
      "- The spend page opens in a tenth of a second instead of eight.",
      "- Plugins survive an expired token: they ask for a new one instead of failing quietly.",
      "- Two crashes on wake-up, both the same stale audio device.",
      "The page is in the wiki under Shipped — week 35.",
    ],
    elapsed: "24s",
    outTokens: "1.1k",
  },
  {
    said: "Good. Post the four user-facing ones in #general.",
    thought:
      "Only the four — the rest is internal and nobody outside the team can act " +
      "on it. No ticket numbers: they mean nothing to the people reading that " +
      "channel. One line each, and the wiki link at the end for whoever wants " +
      "the whole list.",
    thoughtSeconds: 4,
    steps: [
      { label: "slack", summary: "#general — draft, 4 lines", logo: slackLogo, took: "0.3s" },
      { label: "slack", summary: "posted · #general", logo: slackLogo, took: "0.5s" },
    ],
    answer: [
      "Posted. Four lines, no ticket numbers, with the wiki page linked at the end.",
    ],
    elapsed: "9s",
    outTokens: "180",
  },
];

// ---------------------------------------------------------------------------
// The frames
// ---------------------------------------------------------------------------

/**
 * Where the live turn is. The turns before it are always finished, so a frame
 * only has to describe the last one.
 *
 * `spoken` is the person's line landing and nothing else yet — on the voice
 * surface it is the words arriving from the microphone, on the chat surface
 * the message that was just sent.
 */
export type Phase = "spoken" | "thinking" | "steps" | "answering" | "done";

export interface Frame {
  phase: Phase;
  /** How many step rows of the live turn are on screen. */
  steps: number;
  /** Whether the answer is being written. */
  answer: boolean;
  /** How long this frame holds before the next. */
  duration: number;
}

/**
 * The last frame of each script is what a visitor with
 * `prefers-reduced-motion` sees immediately, so it has to read as complete on
 * its own — no half-written answer, no spinner.
 */
export const VOICE_SCRIPT: Frame[] = [
  { phase: "spoken", steps: 0, answer: false, duration: 2400 },
  { phase: "thinking", steps: 0, answer: false, duration: 3400 },
  { phase: "steps", steps: 1, answer: false, duration: 1100 },
  { phase: "steps", steps: 2, answer: false, duration: 1100 },
  { phase: "steps", steps: 3, answer: false, duration: 1300 },
  { phase: "answering", steps: 3, answer: true, duration: 4600 },
  { phase: "done", steps: 3, answer: true, duration: 5200 },
];

export const CHAT_SCRIPT: Frame[] = [
  { phase: "spoken", steps: 0, answer: false, duration: 2200 },
  { phase: "thinking", steps: 0, answer: false, duration: 3600 },
  { phase: "steps", steps: 1, answer: false, duration: 1200 },
  { phase: "steps", steps: 2, answer: false, duration: 1400 },
  { phase: "answering", steps: 2, answer: true, duration: 3800 },
  { phase: "done", steps: 2, answer: true, duration: 5200 },
];

export function scriptFor(surface: Surface): Frame[] {
  return surface === "voice" ? VOICE_SCRIPT : CHAT_SCRIPT;
}

export function turnsFor(surface: Surface): Turn[] {
  return surface === "voice" ? VOICE_TURNS : CHAT_TURNS;
}

/**
 * A fixed amplitude array for the Jarvis bar's waveform. No microphone is ever
 * opened — `docs/hero.md` forbids `getUserMedia` in the hero, and a permission
 * prompt on a landing page is a conversion killer besides.
 *
 * Read as a loop: the bar walks a window across it, so the wave travels
 * instead of pulsing in place.
 */
export const WAVEFORM: number[] = [
  0.18, 0.32, 0.51, 0.74, 0.62, 0.88, 0.71, 0.45, 0.63, 0.82, 0.95, 0.77, 0.58,
  0.39, 0.52, 0.7, 0.86, 0.68, 0.44, 0.29, 0.41, 0.6, 0.79, 0.9, 0.72, 0.55,
  0.36, 0.48, 0.66, 0.83, 0.61, 0.42, 0.27, 0.35, 0.5, 0.69, 0.81, 0.59, 0.38,
  0.22, 0.31, 0.47, 0.64, 0.85, 0.73, 0.5, 0.34, 0.43, 0.57, 0.76,
];
