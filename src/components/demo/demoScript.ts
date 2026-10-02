/**
 * What the hero demo plays: one errand, followed from the chat into the
 * Agentic IDE.
 *
 * The app's front page is ONE chat with a voice mode inside it (since
 * 2026-10-01 — the `Voice | Chat` switch is gone: "voice mode is a state of the
 * chat, not another place", `components/layout/navGroups.ts`). So the demo
 * opens there: the person talks, Jarvis reads what it needs, and hands the
 * coding part to an agent. The second scene is where that agent works — the
 * Agentic IDE, with real coding-agent CLIs side by side in one workspace.
 *
 * Two scenes, one story. A visitor who watches both should come away knowing
 * that the assistant they talk to is also the one that puts agents to work.
 *
 * Every string here becomes real text in the DOM. Nothing is an image, so the
 * demo is selectable, searchable, and survives a failed asset load.
 */

import githubLogo from "@/assets/brands/github.svg?url";
import gmailLogo from "@/assets/brands/gmail.svg?url";
import googleCalendarLogo from "@/assets/brands/google_calendar.svg?url";

/** Which scene is on screen. Each is a section of the app's sidebar. */
export type Scene = "chat" | "ide";

/**
 * One tool call, drawn as a ROW and never a card — the app's rule, because a
 * run of six calls in six boxes is a wall.
 *
 * `label` is the agent's own name for it, never a prettied-up rename. `logo` is
 * the service's real mark where a service was called; a call into the product
 * itself has no logo and wears the feature's glyph instead.
 */
export interface Step {
  label: string;
  summary: string;
  /** The vendor's own SVG, bundled. Absent for the product's own tools. */
  logo?: string;
  /** Which glyph stands in when there is no vendor mark. */
  glyph?: "agent" | "memory";
  /** What the call took, in the app's own format. */
  took: string;
}

export interface Turn {
  /** What the person said. */
  said: string;
  /** Whether it was spoken (voice mode) or typed. */
  voice: boolean;
  /** The model's reasoning, in its own words. */
  thought: string;
  thoughtSeconds: number;
  steps: Step[];
  /** The answer. A leading "- " makes a bullet, as in the app's Markdown. */
  answer: string[];
}

/** Who answers in voice mode, and what the typed chat runs on. */
export const VOICE_ENGINE = { provider: "OpenAI", model: "GPT-Live" } as const;
export const CHAT_ENGINE = { model: "Opus 5.5", effort: "high" } as const;

/** The wake word the composer's hint offers. The app fills the configured one in. */
export const WAKE_PHRASE = "Hey Jarvis";

/** The person the demo app belongs to — a placeholder, never a real user. */
export const USER_NAME = "Alex";

// ---------------------------------------------------------------------------
// Scene 1 — the chat, in voice mode
// ---------------------------------------------------------------------------

export const CHAT_TURNS: Turn[] = [
  {
    said: "Hey Jarvis — what does my morning look like?",
    voice: true,
    thought:
      "Fourteen unread, almost all newsletters. Two things are real: the " +
      "Kessler invoice is due today, and the design review moved on top of " +
      "the standup. Lead with the clash.",
    thoughtSeconds: 4,
    steps: [
      { label: "gmail", summary: "unread since 07:00 — 14 messages", logo: gmailLogo, took: "0.4s" },
      { label: "calendar", summary: "today — 6 events", logo: googleCalendarLogo, took: "0.3s" },
    ],
    answer: [
      "Two things. The Kessler invoice is due at five, and the design review now sits on top of your standup. The other twelve are newsletters.",
    ],
  },
  {
    said: "The login test is failing again. Have an agent fix it and open a PR.",
    voice: true,
    thought:
      "The last CI run on main failed in login.spec — a timeout after the " +
      "session refactor. That is a coding job in the web-app repo, so it goes " +
      "to Scout in the Agentic IDE with the failing run attached, not into " +
      "this call.",
    thoughtSeconds: 5,
    steps: [
      { label: "github", summary: "actions · main — login.spec failed", logo: githubLogo, took: "0.6s" },
      { label: "agents.dispatch", summary: "Scout · Claude Code — fix login.spec, open a PR", glyph: "agent", took: "0.2s" },
    ],
    answer: [
      "Scout is on it in the Agentic IDE. It will fix the test, run the suite and open a pull request — I'll tell you when it's ready to review.",
    ],
  },
];

/**
 * Where the live turn is. The turns before it are always finished, so a frame
 * only has to describe the last one.
 */
export type Phase = "listening" | "thinking" | "steps" | "answering" | "done";

export interface ChatFrame {
  phase: Phase;
  /** How many step rows of the live turn are on screen. */
  steps: number;
  /** How long this frame holds before the next. */
  duration: number;
}

/**
 * The last frame is what a visitor with `prefers-reduced-motion` sees
 * immediately, so it has to read as complete on its own — no half-written
 * answer, no spinner.
 */
export const CHAT_SCRIPT: ChatFrame[] = [
  { phase: "listening", steps: 0, duration: 2600 },
  { phase: "thinking", steps: 0, duration: 3000 },
  { phase: "steps", steps: 1, duration: 1100 },
  { phase: "steps", steps: 2, duration: 1300 },
  { phase: "answering", steps: 2, duration: 3800 },
  { phase: "done", steps: 2, duration: 2600 },
];

// ---------------------------------------------------------------------------
// Scene 2 — the Agentic IDE
// ---------------------------------------------------------------------------

/**
 * One line in an agent's pane, in the CLI's own shapes:
 * a prompt, prose, a tool call with its result, a diff line, or the closing
 * mark of a finished task.
 */
export type PaneLine =
  | { kind: "prompt"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; arg: string; result?: string; fail?: boolean }
  | { kind: "add" | "del"; text: string }
  | { kind: "done"; text: string };

export interface Pane {
  agent: string;
  cli: "claude" | "codex" | "gemini";
  cliLabel: string;
  task: string;
  lines: PaneLine[];
}

export const PANES: Pane[] = [
  {
    agent: "Scout",
    cli: "claude",
    cliLabel: "Claude Code",
    task: "Fix login.spec and open a PR",
    lines: [
      { kind: "prompt", text: "Fix the failing login test on main and open a PR." },
      { kind: "tool", name: "Bash", arg: "npm test -- login.spec", result: "1 failed · timeout after 5000 ms", fail: true },
      { kind: "text", text: "The test waits for the old session cookie. The refactor renamed it." },
      { kind: "tool", name: "Edit", arg: "tests/login.spec.ts" },
      { kind: "del", text: "await page.waitForCookie(\"sid\")" },
      { kind: "add", text: "await page.waitForCookie(\"session\")" },
      { kind: "tool", name: "Bash", arg: "npm test", result: "248 passed" },
      { kind: "tool", name: "Bash", arg: "gh pr create --fill", result: "github.com/acme/web-app/pull/214" },
      { kind: "done", text: "Pull request 214 is ready for review." },
    ],
  },
  {
    agent: "Atlas",
    cli: "codex",
    cliLabel: "Codex",
    task: "Update dependencies",
    lines: [
      { kind: "prompt", text: "Bring the dependencies up to date, one commit per major." },
      { kind: "tool", name: "shell", arg: "npm outdated", result: "7 packages behind" },
      { kind: "text", text: "Two majors: vite 8 and react-router 8. Starting with vite." },
      { kind: "tool", name: "shell", arg: "npm install vite@8", result: "added 3, changed 41" },
      { kind: "tool", name: "shell", arg: "npm run build", result: "built in 4.2s" },
      { kind: "text", text: "Vite is done. Moving on to react-router." },
    ],
  },
  {
    agent: "Quill",
    cli: "gemini",
    cliLabel: "Gemini CLI",
    task: "Write the release notes",
    lines: [
      { kind: "prompt", text: "Draft the release notes for everything merged this week." },
      { kind: "tool", name: "ReadFolder", arg: "CHANGELOG.md, 12 merged PRs" },
      { kind: "text", text: "Twelve PRs, five a user will notice. Grouping them by what changed for the reader." },
      { kind: "tool", name: "WriteFile", arg: "docs/release-notes.md", result: "38 lines" },
      { kind: "done", text: "Draft saved. Waiting for review." },
    ],
  },
];

export interface IdeFrame {
  /** How many lines of each pane are on screen, by pane. */
  lines: [number, number, number];
  duration: number;
}

/** The panes advance at different speeds, the way three agents really do. */
export const IDE_SCRIPT: IdeFrame[] = [
  { lines: [1, 2, 1], duration: 900 },
  { lines: [2, 3, 2], duration: 1100 },
  { lines: [3, 3, 3], duration: 1200 },
  { lines: [4, 4, 3], duration: 1000 },
  { lines: [6, 4, 4], duration: 1200 },
  { lines: [7, 5, 4], duration: 1300 },
  { lines: [8, 5, 5], duration: 1200 },
  { lines: [9, 6, 5], duration: 4200 },
];

/**
 * A fixed amplitude array for the voice-mode waveform. No microphone is ever
 * opened — `docs/hero.md` forbids `getUserMedia` in the hero.
 */
export const WAVEFORM: number[] = [
  0.18, 0.32, 0.51, 0.74, 0.62, 0.88, 0.71, 0.45, 0.63, 0.82, 0.95, 0.77, 0.58,
  0.39, 0.52, 0.7, 0.86, 0.68, 0.44, 0.29, 0.41, 0.6, 0.79, 0.9, 0.72, 0.55,
  0.36, 0.48, 0.66, 0.83, 0.61, 0.42, 0.27, 0.35, 0.5, 0.69, 0.81, 0.59, 0.38,
  0.22, 0.31, 0.47, 0.64, 0.85, 0.73, 0.5, 0.34, 0.43, 0.57, 0.76,
];
