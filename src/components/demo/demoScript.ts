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

/** Which scene is on screen. Each is a section of the app's sidebar. */
export type Scene = "chat" | "ide";

/**
 * One step of the turn's timeline, the way the app's trace draws it
 * (`components/agentchat/TraceTimeline.tsx`): a node, the tool's own name, its
 * argument in mono, the time it took at the right, and a terse result
 * underneath. `logo` is the service's real mark; a call into the product
 * itself wears a glyph instead.
 */
export interface Step {
  /** "GitHub · List runs" — the service, then the call. */
  label: string;
  /** The call's argument, in mono. */
  arg: string;
  /** The terse result line under the row. */
  result: string;
  /** The vendor's own SVG, bundled. Absent for the product's own tools. */
  logo?: string;
  took: string;
}

export interface Turn {
  /** What the person said. */
  said: string;
  /** The model's own words between the calls, shown as prose on the thread. */
  thought: string;
  steps: Step[];
  /** The reply. */
  answer: string;
  /** The folded header: "Worked for 9s · Used GitHub and Agents". */
  worked: string;
  summary: string;
}

/** Who answers in voice mode. The app names the route under the composer. */
export const VOICE_ENGINE = { label: "OpenAI GPT-Live (ChatGPT subscription)" } as const;

/** The wake word the composer's hint offers. The app fills the configured one in. */
export const WAKE_PHRASE = "Hey Jarvis";

/** The person the demo app belongs to — a placeholder, never a real user. */
export const USER_NAME = "Alex";

/** The date stamp the app sets over a conversation once it has started. */
export const CHAT_STAMP = "Today 09:14";

// ---------------------------------------------------------------------------
// Scene 1 — the front page, in a voice call
// ---------------------------------------------------------------------------

export const CHAT_TURN: Turn = {
  said: "The login test is failing again. Have an agent fix it and open a PR.",
  thought:
    "The last run on main failed in login.spec. That is a coding job in the " +
    "web-app repo, so it goes to Scout in the Agentic IDE with the failed run attached.",
  steps: [
    { label: "GitHub · List runs", arg: "main --status failure", result: "1 failed — login.spec, timeout", logo: githubLogo, took: "0.6s" },
    { label: "Agents · Dispatch", arg: "Scout", result: "Claude Code · fix login.spec, open a PR", took: "0.2s" },
  ],
  answer:
    "Scout is on it in the Agentic IDE. It will fix the test, run the suite and open a pull request — I'll tell you when it's ready to review.",
  worked: "9s",
  summary: "Used GitHub and Agents",
};

/**
 * Where the turn is. `home` is the empty front page — the greeting and the
 * composer — before anything has been said.
 */
export type Phase = "home" | "listening" | "thinking" | "steps" | "answering" | "done";

export interface ChatFrame {
  phase: Phase;
  /** How many step rows are on screen. */
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
  { phase: "home", steps: 0, duration: 2600 },
  { phase: "listening", steps: 0, duration: 3000 },
  { phase: "thinking", steps: 0, duration: 3000 },
  { phase: "steps", steps: 1, duration: 1200 },
  { phase: "steps", steps: 2, duration: 1400 },
  { phase: "answering", steps: 2, duration: 3600 },
  { phase: "done", steps: 2, duration: 3200 },
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
