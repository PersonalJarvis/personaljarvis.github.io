/**
 * The sample team and its scripted runs.
 *
 * Every value here is static sample data — no model is called on this page,
 * and the board says so. The roster mirrors the app's own agent society: the
 * lead is Jarvis, the specialists wear the shapes and colours the app draws
 * them with (society/AgentSymbol.tsx, companion/appearance.ts).
 */

export type AgentId = "jarvis" | "scout" | "archivist" | "builder" | "critic" | "courier";
export type Stage = "thinking" | "grep" | "read" | "edit" | "done";
export type Shape = "ghost" | "hexagon" | "drop" | "squircle" | "triangle" | "cloud";

export interface Agent {
  id: AgentId;
  name: string;
  title: string;
  shape: Shape;
  /** A token name from tokens.css § "Agent identity". */
  color: string;
  /** Where the model runs — any single key, never a named vendor. */
  runsOn: string;
  tier: "lead" | "orchestrator" | "specialist";
  /** Position on the 800x520 stage. */
  x: number;
  y: number;
  /** What the agent says back when someone messages it directly. */
  replies: readonly string[];
}

const CX = 400;
const CY = 262;
const RX = 292;
const RY = 176;

function ring(index: number): { x: number; y: number } {
  const angle = ((-90 + index * 72) * Math.PI) / 180;
  return { x: Math.round(CX + RX * Math.cos(angle)), y: Math.round(CY + RY * Math.sin(angle)) };
}

export const TEAM: readonly Agent[] = [
  {
    id: "jarvis", name: "Jarvis", title: "Lead — owns the goal, delegates the work",
    shape: "ghost", color: "--ink", runsOn: "Your brain provider", tier: "lead",
    x: CX, y: CY,
    replies: [
      "On it. I'll hand that to whoever fits and report back.",
      "Noted. I'll fold it into the plan and keep you posted.",
    ],
  },
  {
    id: "scout", name: "Scout", title: "Research orchestrator",
    shape: "hexagon", color: "--agent-orange", runsOn: "Cloud · your key", tier: "orchestrator",
    ...ring(0),
    replies: [
      "Good lead. I'll add it to the sources and keep the links.",
      "Checking that now — I'll mark what is still open.",
    ],
  },
  {
    id: "archivist", name: "Archivist", title: "Knowledge curator",
    shape: "drop", color: "--agent-sage", runsOn: "Local · runs on your machine", tier: "specialist",
    ...ring(1),
    replies: [
      "Saved to memory. The whole team can find it from now on.",
      "I have two older notes on that. Sending them to Scout.",
    ],
  },
  {
    id: "builder", name: "Builder", title: "Coding agent — works in an isolated copy",
    shape: "squircle", color: "--agent-sky", runsOn: "Cloud · your key", tier: "specialist",
    ...ring(2),
    replies: [
      "I'll try it in a separate copy first. Your files stay untouched.",
      "Understood. Tests first, then the change.",
    ],
  },
  {
    id: "critic", name: "Critic", title: "Reviewer — checks every claim",
    shape: "triangle", color: "--agent-rose", runsOn: "Cloud · a second provider", tier: "specialist",
    ...ring(3),
    replies: [
      "I'll hold the draft to that. Nothing ships without a source.",
      "Fair point. Adding it to my checklist.",
    ],
  },
  {
    id: "courier", name: "Courier", title: "Plugins — mail, calendar, music",
    shape: "cloud", color: "--agent-lime", runsOn: "Cloud · your key", tier: "specialist",
    ...ring(4),
    replies: [
      "Done — I'll only send once you approve it.",
      "Checking your calendar. I'll ask before I book anything.",
    ],
  },
];

export const AGENT: Readonly<Record<AgentId, Agent>> = Object.fromEntries(
  TEAM.map((agent) => [agent.id, agent]),
) as Record<AgentId, Agent>;

/** One beat of a run: `from` works for `dur` ms; with `to`, it also sends a message. */
export interface Step {
  at: number;
  dur: number;
  from: AgentId;
  to?: AgentId | "you";
  stage: Stage;
  text: string;
}

export interface Run {
  id: string;
  label: string;
  goal: string;
  steps: readonly Step[];
  /** What Jarvis says once the person approves. */
  approved: string;
}

/** How long a message takes to fly from one agent to the next. */
export const TRAVEL_MS = 900;

function msg(at: number, from: AgentId, to: AgentId | "you", text: string, dur = 900): Step {
  return { at, dur, from, to, stage: to === "you" ? "done" : "thinking", text };
}

function work(at: number, from: AgentId, stage: Stage, text: string, dur: number): Step {
  return { at, dur, from, stage, text };
}

export const RUNS: readonly Run[] = [
  {
    id: "launch",
    label: "Launch post",
    goal: "Get the launch post ready for Friday.",
    approved: "Approved. Courier publishes Friday at 09:00.",
    steps: [
      msg(0, "jarvis", "scout", "Collect everything that shipped since the last release."),
      msg(350, "jarvis", "archivist", "Pull our voice guide and the last two launch posts."),
      work(1900, "scout", "grep", "Scanning 38 merged changes.", 2500),
      work(2100, "archivist", "read", "Found the voice guide and two past posts.", 2100),
      msg(4300, "archivist", "scout", "Tone: plain, concrete, no hype. Notes attached."),
      msg(4600, "scout", "builder", "Need three screenshots of the new agents view."),
      work(5600, "builder", "edit", "Rendering screenshots in an isolated copy.", 3200),
      work(5800, "scout", "edit", "Drafting the post from the changelog.", 3000),
      msg(9000, "builder", "scout", "Three screenshots ready, 1600 px wide."),
      msg(9200, "scout", "critic", "Draft is ready for review."),
      work(10200, "critic", "read", "Checking every claim against the changelog.", 2500),
      msg(12800, "critic", "scout", "One number had no source. Fixed it."),
      msg(13100, "critic", "jarvis", "Approved. One sentence needs a human OK."),
      msg(14100, "jarvis", "courier", "Hold Friday 09:00 to publish."),
      work(15100, "courier", "edit", "Calendar slot held, nothing sent yet.", 1400),
      msg(16600, "courier", "jarvis", "Friday 09:00 is held."),
      msg(17600, "jarvis", "you", "The launch post is ready. One sentence waits for your OK.", 1200),
    ],
  },
  {
    id: "tests",
    label: "Fix red tests",
    goal: "The tests are red. Find out why and fix it.",
    approved: "Approved. Builder merges the fix and closes the incident.",
    steps: [
      msg(0, "jarvis", "builder", "CI is red on main. Find the cause and fix it."),
      msg(300, "jarvis", "archivist", "Anything in memory about this suite failing before?"),
      work(1300, "builder", "grep", "Searching the failing job's log.", 2200),
      work(1500, "archivist", "read", "Reading notes from the last three CI incidents.", 2000),
      msg(3600, "archivist", "builder", "Same test failed in September: a timezone assumption."),
      work(4600, "builder", "read", "Reading the test and its fixture.", 1800),
      work(6500, "builder", "edit", "Pinning the clock to UTC in an isolated copy.", 2400),
      msg(9000, "builder", "critic", "Patch ready: one file, four lines. Green locally."),
      work(10000, "critic", "read", "Reviewing the diff and rerunning the suite.", 2400),
      msg(12500, "critic", "builder", "Add a regression test for daylight saving. Otherwise fine."),
      work(13500, "builder", "edit", "Adding the regression test.", 1800),
      msg(15400, "builder", "jarvis", "Green. One fix, one new test, ready to merge."),
      msg(16400, "jarvis", "you", "The tests are green again. Merge the fix?", 1200),
    ],
  },
  {
    id: "week",
    label: "Plan my week",
    goal: "Plan my week around the two deadlines.",
    approved: "Approved. Courier sends the reschedule note.",
    steps: [
      msg(0, "jarvis", "courier", "Read my calendar and inbox for this week."),
      msg(300, "jarvis", "archivist", "What did I promise for the two deadlines?"),
      work(1300, "courier", "read", "Reading 23 events and 41 unread mails.", 2300),
      work(1500, "archivist", "grep", "Searching notes for both deadlines.", 1900),
      msg(3500, "archivist", "jarvis", "Report due Wednesday, demo due Friday."),
      msg(3700, "courier", "jarvis", "Two meetings clash with focus time on Wednesday."),
      msg(4800, "jarvis", "scout", "Estimate the effort for both from past work."),
      work(5800, "scout", "read", "Comparing with four earlier reports.", 2400),
      msg(8300, "scout", "jarvis", "Report about 5 hours, demo about 7."),
      msg(9300, "jarvis", "critic", "Check this plan for overload."),
      work(10300, "critic", "read", "Checking buffers and travel time.", 2000),
      msg(12400, "critic", "jarvis", "Tuesday is over-booked. Move one block to Thursday."),
      msg(13400, "jarvis", "courier", "Draft a note moving the Wednesday sync."),
      work(14400, "courier", "edit", "Drafting the reschedule note — not sent.", 1600),
      msg(16100, "jarvis", "you", "Your week is planned. One meeting move needs your OK.", 1200),
    ],
  },
];

/** A goal the visitor typed: the same team shape, with their words in it. */
export function customRun(goal: string): Run {
  const quoted = goal.length > 60 ? `${goal.slice(0, 57)}…` : goal;
  return {
    id: "custom",
    label: "Your goal",
    goal,
    approved: "Approved. The team carries it out and reports back.",
    steps: [
      msg(0, "jarvis", "scout", `Research this: “${quoted}”`),
      msg(300, "jarvis", "archivist", "What do we already know about this?"),
      work(1300, "scout", "grep", "Collecting sources and keeping the links.", 2400),
      work(1500, "archivist", "read", "Reading related notes from memory.", 1900),
      msg(3600, "archivist", "scout", "Two earlier notes are relevant. Attached."),
      msg(4000, "scout", "builder", "Here is the brief. Build a first version."),
      work(5000, "builder", "edit", "Working in an isolated copy.", 3000),
      msg(8100, "builder", "critic", "First version ready for review."),
      work(9100, "critic", "read", "Checking the result against the goal.", 2200),
      msg(11400, "critic", "jarvis", "Looks right. One point needs your judgement."),
      msg(12500, "jarvis", "you", "Done. The result is ready — one point waits for your OK.", 1200),
    ],
  };
}

export function runLength(run: Run): number {
  return Math.max(...run.steps.map((step) => step.at + step.dur));
}

/** The verb a roster row shows while an agent is in a stage. */
export const STAGE_VERB: Readonly<Record<Stage, string>> = {
  thinking: "messaging",
  grep: "searching",
  read: "reading",
  edit: "writing",
  done: "waiting for you",
};

export const STAGE_LABEL: Readonly<Record<Stage, string>> = {
  thinking: "Message",
  grep: "Search",
  read: "Read",
  edit: "Write",
  done: "Report",
};
