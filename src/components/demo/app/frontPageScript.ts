/**
 * What the front page plays: one spoken turn, from the empty page to the
 * answer. Placeholder content — no real person, project or account.
 *
 * The person asks for a failing test to be fixed; Jarvis finds the failed
 * run on GitHub and hands the job to Scout, who then works in the Agentic
 * IDE — the scene the demo moves to next.
 */

export interface FrontStep {
  /** The call's line text, as TraceTimeline writes it. */
  text: string;
  /** The muted detail after it. */
  detail: string;
  /** A real mark for a service call; absent for the product's own tools. */
  logo?: "github";
}

export const FRONT_TURN = {
  said: "The login test is failing again. Can you have an agent fix it and open a PR?",
  thought:
    "The last run on main failed in login.spec after the session refactor. " +
    "That is a coding job in the web-app repo, so it goes to Scout in the Agentic IDE.",
  steps: [
    { text: "GitHub", detail: "Workflow runs on main — login.spec failed", logo: "github" },
    { text: "Handed off to a worker", detail: "Scout · fix login.spec and open a PR" },
  ] as FrontStep[],
  answer:
    "Scout is on it. It will fix the test, run the suite and open a pull request — I'll tell you when it's ready to review.",
  /** The turn's whole working time, for its "Done" line. */
  seconds: 7,
};

export type FrontPhase = "home" | "listening" | "thinking" | "working" | "speaking" | "done";

export interface FrontFrame {
  phase: FrontPhase;
  /** Calls already finished. */
  settled: number;
  /** Whether the next call is running. */
  running: boolean;
  /** The live clock on the trace's state line. */
  seconds: number;
  duration: number;
}

/**
 * The last frame is what `prefers-reduced-motion` shows at once, so it reads
 * as complete on its own.
 */
export const FRONT_SCRIPT: FrontFrame[] = [
  { phase: "home", settled: 0, running: false, seconds: 0, duration: 2800 },
  { phase: "listening", settled: 0, running: false, seconds: 0, duration: 3900 },
  { phase: "thinking", settled: 0, running: false, seconds: 2, duration: 3600 },
  { phase: "working", settled: 0, running: true, seconds: 4, duration: 1300 },
  { phase: "working", settled: 1, running: true, seconds: 5, duration: 1300 },
  { phase: "working", settled: 2, running: false, seconds: 6, duration: 700 },
  { phase: "speaking", settled: 2, running: false, seconds: 7, duration: 4600 },
  { phase: "done", settled: 2, running: false, seconds: 7, duration: 2600 },
];
