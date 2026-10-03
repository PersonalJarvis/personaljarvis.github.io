/**
 * The Agentic IDE, cloned from the app's own markup.
 *
 * Every element and class string below is copied from the app's components
 * at its repo HEAD — AgenticIdeView (the section frame), sidePanel/IdeSidePanel
 * (the frame, the closed rail and the open panel), sidePanel/AgentsOverview,
 * WorkspaceTerminalGrid + workspaceDocking.paneStyle (the tiling), AgenticTerminal
 * (the minimal pane frame), WorkspaceTerminalHeader (the tile title row),
 * AgentMark, and IdeProjectTree plus the IDE branch of Sidebar (the left
 * column). The app's compiled stylesheet (app.css) styles them, so they render
 * as the app does.
 *
 * The one thing that is not the app's DOM is a pane's body: the app draws it
 * with xterm on a canvas. Here it is rebuilt as rows of text in the pane's own
 * terminal settings — JetBrains Mono Medium at the default 15 px
 * (paneFont.FONT_DEFAULT, terminalFont.TERMINAL_FONT_WEIGHT), the dark terminal
 * theme's colours (terminalThemes.DARK_TERMINAL_THEME) — showing what each CLI
 * prints, in its own shapes, as far as plain text can.
 *
 * Content is placeholder only: an invented "web-app" project and three agents.
 */
import type { CSSProperties, ReactNode } from "react";

import claudeLogo from "@/assets/app/claude.svg?url";
import openaiLogo from "@/assets/app/openai.svg?url";
import {
  Bot,
  Building2,
  CheckCheck,
  ChevronLeft,
  Ellipsis as MoreHorizontal,
  Eye,
  FileDiff,
  Folder,
  FolderOpen,
  FolderTree,
  GitBranch,
  LoaderCircle as Loader2,
  Maximize2,
  Mic,
  PanelRightClose,
  Plus,
  X,
} from "./lucide";

function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Constants copied from the app (terminalThemes.ts, terminalFont.ts)
// ---------------------------------------------------------------------------

/** DARK_TERMINAL_THEME. */
const T = {
  foreground: "#f4f4f6",
  red: "#fc6b83",
  green: "#3fa266",
  yellow: "#d2943e",
  blue: "#81a1c1",
  magenta: "#b48ead",
  cyan: "#88c0d0",
  brightBlack: "#8a8a8a",
  brightBlue: "#a5bdd6",
  brightMagenta: "#d4b3cc",
} as const;

/** PANE_BRAND.dark, PANE_CHROME.dark, PANE_TILE.dark. */
const BRAND = { ink: "#f0f0f0", inkMuted: "#a3a3a3", inkFaint: "#7a7a7a", chip: "rgba(255,255,255,0.14)" };
const CHROME = { shell: "rgba(18, 18, 18, 0.58)", border: "rgba(255,255,255,0.12)" };
const TILE = { edge: "rgba(255,255,255,0.26)", focus: "#3d8bff" };

const TERMINAL_FONT_STACK = "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Courier New', monospace";
/** FONT_DEFAULT (paneFont.ts) and TERMINAL_FONT_WEIGHT (terminalFont.ts). */
const FONT_PX = 15;
/** xterm's cell at lineHeight 1.0: JetBrains Mono's ascent + descent at 15 px. */
const ROW_PX = 20;

/** WorkspaceTerminalHeader's ACTION_CLASS, as the tile variant rewrites it. */
const ACTION_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded text-[color:var(--pane-ink-muted)] hover:bg-[color:var(--pane-chip)] hover:text-[color:var(--pane-ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--pane-ink)] disabled:opacity-35";
const TILE_ACTION = ACTION_CLASS.replace("h-7 w-7", "h-6 w-6").replace(" rounded ", " rounded-none ");

// ---------------------------------------------------------------------------
// Terminal text
// ---------------------------------------------------------------------------

/** One run of terminal text: its colour, weight and background. */
type Seg = { t: string; c?: string; b?: boolean; bg?: string; dim?: boolean };
type Row = Seg[];

const s = (t: string, c?: string, extra: Omit<Seg, "t" | "c"> = {}): Seg => ({ t, c, ...extra });
const blank: Row = [];

/** Width of the boxes the CLIs draw — the pane is ~37 columns at 15 px. */
const COLS = 36;

function len(row: Row): number {
  return row.reduce((n, seg) => n + [...seg.t].length, 0);
}

/** A rounded box the way the CLIs draw them with box-drawing characters. */
function box(inner: Row[], border: string): Row[] {
  const span = COLS - 2;
  return [
    [s(`╭${"─".repeat(span)}╮`, border)],
    ...inner.map((row) => [
      s("│", border),
      ...row,
      s(" ".repeat(Math.max(0, span - len(row)))),
      s("│", border),
    ]),
    [s(`╰${"─".repeat(span)}╯`, border)],
  ];
}

/** A row with a background band across the pane's full width (Codex's own lines). */
function band(row: Row, bg: string): Row {
  return [...row.map((seg) => ({ ...seg, bg })), s(" ".repeat(Math.max(0, COLS + 1 - len(row))), undefined, { bg })];
}

const CLAUDE = "#d97757";

/** One pane's script: its rows in chunks, and how many chunks each step shows. */
interface PaneScript {
  name: string;
  title: string;
  agent: "claude" | "codex" | "gemini";
  displayName: string;
  chunks: Row[][];
  /** Chunks on screen per step. */
  shown: number[];
  /** The status line under the work while the agent is busy, per step. */
  working: (step: number) => Row | null;
  /** The input area the CLI keeps at the end of its output. */
  input: Row[];
  /** Done once its last chunk is on screen. */
  finishes: boolean;
  /** Age of the last output in the Agents tab, per state. */
  lastOutput: string;
  since: string;
}

const SCOUT: PaneScript = {
  name: "scout",
  title: "Fix login.spec and open a PR",
  agent: "claude",
  displayName: "Claude Code",
  finishes: true,
  lastOutput: "12s",
  since: "12s",
  chunks: [
    [
      ...box(
        [
          [s(" "), s("✻", CLAUDE), s(" Welcome to "), s("Claude Code", undefined, { b: true }), s("!")],
          [],
          [s("   /help for help, /status for", T.brightBlack)],
          [s("   your current setup", T.brightBlack)],
          [],
          [s("   cwd: ~/code/web-app", T.brightBlack)],
        ],
        CLAUDE,
      ),
      blank,
    ],
    [
      [s("> Fix the failing login test on", T.brightBlack)],
      [s("  main and open a PR.", T.brightBlack)],
      blank,
    ],
    [[s("●"), s(" I'll run the failing test first.")], blank],
    [
      [s("●", T.green), s(" "), s("Bash", undefined, { b: true }), s("(npm test -- login.spec)")],
      [s("  ⎿  ", T.brightBlack), s("FAIL", T.red, { b: true }), s(" tests/login.spec.ts", T.red)],
      [s("     Timeout after 5000 ms", T.brightBlack)],
      blank,
    ],
    [
      [s("●"), s(" The test waits for the old")],
      [s("  session cookie; the refactor")],
      [s("  renamed it to "), s("session", T.cyan), s(".")],
      blank,
    ],
    [
      [s("●", T.green), s(" "), s("Update", undefined, { b: true }), s("(tests/login.spec.ts)")],
      [s("  ⎿  ", T.brightBlack), s("Updated with 1 addition and")],
      [s("     1 removal")],
      [s("     12 ", T.brightBlack), s("- waitForCookie(\"sid\")    ", "#ffd7dc", { bg: "rgba(252,107,131,0.22)" })],
      [s("     12 ", T.brightBlack), s("+ waitForCookie(\"session\")", "#d2f2dc", { bg: "rgba(63,162,102,0.26)" })],
      blank,
    ],
    [
      [s("●", T.green), s(" "), s("Bash", undefined, { b: true }), s("(npm test)")],
      [s("  ⎿  ", T.brightBlack), s("248 passed", T.green), s(" (31s)", T.brightBlack)],
      blank,
    ],
    [
      [s("●", T.green), s(" "), s("Bash", undefined, { b: true }), s("(gh pr create --fill)")],
      [s("  ⎿  ", T.brightBlack), s("…/acme/web-app/pull/214", T.blue)],
      blank,
    ],
    [
      [s("●"), s(" Pull request 214 is open and")],
      [s("  the suite is green. Ready for")],
      [s("  your review.")],
      blank,
    ],
  ],
  shown: [2, 3, 4, 5, 6, 7, 8, 9, 9],
  working: (step) => [s("✻", CLAUDE), s(" Working… ", CLAUDE), s(`(${8 + step * 5}s · esc to interrupt)`, T.brightBlack)],
  input: [
    ...box([[s(" > ", T.brightBlack)]], T.brightBlack),
    [s("  ? for shortcuts", T.brightBlack)],
  ],
};

const ATLAS: PaneScript = {
  name: "atlas",
  title: "Update dependencies",
  agent: "codex",
  displayName: "Codex",
  finishes: false,
  lastOutput: "3s",
  since: "2m",
  chunks: [
    [
      ...box(
        [
          [s(" >_ ", T.brightBlack), s("OpenAI Codex", undefined, { b: true })],
          [],
          [s(" model:     ", T.brightBlack), s("gpt-5-codex"), s("  /model", T.cyan)],
          [s(" directory: ", T.brightBlack), s("~/code/web-app")],
        ],
        T.brightBlack,
      ),
      blank,
    ],
    [
      band([s("› ", T.brightBlack), s("Bring the dependencies up to")], "rgba(255,255,255,0.06)"),
      band([s("  date, one commit per major.")], "rgba(255,255,255,0.06)"),
      blank,
    ],
    [
      [s("• ", T.green), s("Ran", undefined, { b: true }), s(" npm outdated")],
      [s("  └ 7 packages behind", T.brightBlack)],
      blank,
    ],
    [
      [s("• Two majors: vite 8 and")],
      [s("  react-router 8. Vite first.")],
      blank,
    ],
    [
      [s("• ", T.green), s("Ran", undefined, { b: true }), s(" npm install vite@8")],
      [s("  └ added 3, changed 41", T.brightBlack)],
      blank,
    ],
    [
      [s("• ", T.green), s("Ran", undefined, { b: true }), s(" npm run build")],
      [s("  └ built in 4.2s", T.brightBlack)],
      blank,
    ],
    [
      [s("• Vite is done and committed.")],
      [s("  Moving on to react-router.")],
      blank,
    ],
  ],
  shown: [2, 2, 3, 4, 4, 5, 6, 7, 7],
  working: (step) => [s("◦ ", T.brightBlack), s("Working", undefined, { b: true }), s(` (${10 + step * 4}s • esc to interrupt)`, T.brightBlack)],
  input: [
    band([s("› ", T.cyan, { b: true }), s("Ask Codex to do anything", T.brightBlack)], "rgba(255,255,255,0.06)"),
    blank,
    [s("  88% context left", T.brightBlack)],
  ],
};

const QUILL: PaneScript = {
  name: "quill",
  title: "Draft the release notes",
  agent: "gemini",
  displayName: "Gemini CLI",
  finishes: true,
  lastOutput: "20s",
  since: "20s",
  chunks: [
    [
      [s("Tips for getting started:")],
      [s("1. Ask questions, edit files, or", T.brightBlack)],
      [s("   run commands.", T.brightBlack)],
      [s("2. Be specific for the best", T.brightBlack)],
      [s("   results.", T.brightBlack)],
      blank,
    ],
    [
      [s("> ", T.brightBlack), s("Draft the release notes for", T.brightBlack)],
      [s("  everything merged this week.", T.brightBlack)],
      blank,
    ],
    [
      ...box(
        [
          [s(" ✓ ", T.green), s(" ReadFolder", undefined, { b: true }), s(" .")],
          [s("    Listed 14 item(s).", T.brightBlack)],
        ],
        T.brightBlack,
      ),
      blank,
    ],
    [
      [s("✦ ", T.brightMagenta), s("Twelve PRs merged; five of them")],
      [s("  change something a user will")],
      [s("  notice.")],
      blank,
    ],
    [
      ...box(
        [
          [s(" ✓ ", T.green), s(" WriteFile", undefined, { b: true }), s(" release-notes.md")],
          [s("    Wrote 38 lines.", T.brightBlack)],
        ],
        T.brightBlack,
      ),
      blank,
    ],
    [
      [s("✦ ", T.brightMagenta), s("Draft saved in docs/. It leads")],
      [s("  with the five user-facing")],
      [s("  changes.")],
      blank,
    ],
  ],
  shown: [2, 2, 3, 3, 4, 4, 5, 6, 6],
  working: (step) => [s("⠏ ", T.brightBlue), s("Thinking…", T.brightBlue), s(` (esc to cancel, ${3 + step * 3}s)`, T.brightBlack)],
  input: [
    ...box([[s(" > ", T.brightMagenta), s("  Type your message or @file", T.brightBlack)]], T.brightBlack),
    [s("~/code/web-app ", T.brightBlue), s("(main*)", T.magenta)],
  ],
};

const PANES = [SCOUT, ATLAS, QUILL] as const;

/** Steps of the scene; the last one reads as complete. */
export const IDE_STEPS = 9;
export const IDE_DURATIONS = [900, 1100, 1200, 1100, 1200, 1200, 1300, 1200, 4200];

function paneDone(pane: PaneScript, step: number): boolean {
  return pane.finishes && pane.shown[step] >= pane.chunks.length;
}

function TerminalRow({ row }: { row: Row }) {
  return (
    <div style={{ height: ROW_PX, whiteSpace: "pre", overflow: "hidden" }}>
      {row.length === 0
        ? " "
        : row.map((seg, i) => (
            <span
              key={i}
              style={{
                color: seg.c,
                fontWeight: seg.b ? 700 : undefined,
                background: seg.bg,
              }}
            >
              {seg.t}
            </span>
          ))}
    </div>
  );
}

/**
 * What xterm shows in the pane: the CLI's output top-down, scrolled so the
 * newest line stays in view once the output is taller than the pane.
 * `safe flex-end` on a reversed column: the text sits at the top while it fits,
 * and once it overflows it is the OLDEST lines that leave the pane.
 */
function TerminalBody({ pane, step }: { pane: PaneScript; step: number }) {
  const rows: Row[] = pane.chunks.slice(0, pane.shown[step]).flat();
  const working = !paneDone(pane, step) ? pane.working(step) : null;
  if (working) rows.push(working, blank);
  rows.push(...pane.input);
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column-reverse",
        justifyContent: "safe flex-end",
        overflow: "hidden",
        fontFamily: TERMINAL_FONT_STACK,
        fontSize: FONT_PX,
        fontWeight: 500,
        lineHeight: `${ROW_PX}px`,
        letterSpacing: 0,
        color: T.foreground,
      }}
    >
      <div>
        {rows.map((row, i) => (
          <TerminalRow key={i} row={row} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentMark (AgentMark.tsx), the variants the scene uses
// ---------------------------------------------------------------------------

const AGENT_LOGOS: Record<PaneScript["agent"], string | null> = {
  claude: claudeLogo,
  codex: openaiLogo,
  // The app's table has no Gemini CLI entry, and the grid passes no uploaded
  // logo, so its pane shows the monogram — exactly as the app does.
  gemini: null,
};

function AgentMark({
  agent,
  label,
  size = "md",
  variant = "boxed",
  className,
}: {
  agent: PaneScript["agent"];
  label: string;
  size?: "sm" | "md";
  variant?: "boxed" | "plain";
  className?: string;
}) {
  const url = AGENT_LOGOS[agent];
  const plain = variant === "plain";
  const sizeClass = plain ? (size === "sm" ? "h-4 w-4" : "h-5 w-5") : size === "sm" ? "h-7 w-7 rounded-[5px]" : "h-9 w-9 rounded-control";
  const glyphClass = plain ? "h-full w-full" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span
      data-testid={`agent-mark-${agent}`}
      data-ground={url ? "ink" : "none"}
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden text-micro font-bold tracking-tight text-muted-foreground",
        plain ? "opacity-70" : "border border-border bg-background",
        sizeClass,
        className,
      )}
    >
      {url ? (
        <span
          className={cn("block bg-foreground", glyphClass)}
          style={{
            WebkitMaskImage: `url("${url}")`,
            maskImage: `url("${url}")`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      ) : (
        <span className="font-mono">{label.trim().slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

/** The app's own BranchIcon (branchIcon.tsx). */
function BranchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="5" r="2" />
      <path d="M7 7v10" />
      <path d="M17 7v1.5a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 0 7 15.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// One pane: AgenticTerminal (minimal) + WorkspaceTerminalHeader (tile)
// ---------------------------------------------------------------------------

function TileHeader({ pane, focused }: { pane: PaneScript; focused: boolean }) {
  const variables = {
    "--pane-ink": BRAND.ink,
    "--pane-ink-muted": BRAND.inkMuted,
    "--pane-chip": BRAND.chip,
    color: BRAND.ink,
  } as CSSProperties;
  return (
    <header
      data-testid={`workspace-terminal-header-${pane.name}`}
      data-variant="tile"
      className="relative flex h-7 min-h-7 shrink-0 select-none items-center gap-1 border-b pl-2 pr-0.5"
      style={{ ...variables, borderColor: CHROME.border, background: CHROME.shell }}
    >
      <button
        type="button"
        tabIndex={-1}
        data-ide-drag-handle="true"
        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-none text-left font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--pane-ink)] cursor-grab"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.green }} />
        <AgentMark
          agent={pane.agent}
          label={pane.displayName}
          variant="plain"
          size="sm"
          className="!text-[color:var(--pane-ink)] [&>.bg-foreground]:!bg-[color:var(--pane-ink)]"
        />
        <span
          title={`${pane.title} (${pane.name})`}
          className={`truncate ${focused ? "font-semibold" : ""}`}
          style={{ color: focused ? TILE.focus : BRAND.inkMuted }}
        >
          {pane.title}
        </span>
      </button>
      <div data-header-control="true" className="flex shrink-0 items-center gap-0.5">
        <button type="button" tabIndex={-1} className={TILE_ACTION}><MoreHorizontal className="h-4 w-4" /></button>
        <button type="button" tabIndex={-1} className={TILE_ACTION}><Maximize2 className="h-3.5 w-3.5" /></button>
        <button type="button" tabIndex={-1} className={`group ${TILE_ACTION}`}>
          <BranchIcon className="h-[15px] w-[15px] opacity-75 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
        <button type="button" tabIndex={-1} className={TILE_ACTION}><Plus className="h-4 w-4" /></button>
        <button type="button" tabIndex={-1} className={TILE_ACTION}><X className="h-4 w-4" /></button>
      </div>
    </header>
  );
}

function AgentPane({ pane, step, focused }: { pane: PaneScript; step: number; focused: boolean }) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden backdrop-blur-[4px] border rounded-none transition-[box-shadow,border-color,opacity] duration-150 ease-out motion-reduce:transition-none"
      style={{ background: CHROME.shell, borderColor: focused ? TILE.focus : TILE.edge }}
      data-pane-style="minimal"
      data-testid={`agentic-pane-${pane.name}`}
    >
      <TileHeader pane={pane} focused={focused} />
      <div className="relative min-h-0 flex-1 overflow-hidden px-1.5 pb-0.5 pt-0.5">
        <div className="agentic-terminal-host h-full min-h-0 w-full overflow-hidden">
          <TerminalBody pane={pane} step={step} />
        </div>
      </div>
      {focused && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[45]"
          style={{ boxShadow: `inset 0 0 0 1px ${TILE.focus}` }}
        />
      )}
    </div>
  );
}

/** workspaceDocking.paneStyle for a row of equal columns, GAP 8. */
function columnStyle(index: number, count: number): CSSProperties {
  const x = index / count;
  const w = 1 / count;
  const left = x > 0 ? 4 : 0;
  const right = x + w < 0.99999 ? 4 : 0;
  return {
    position: "absolute",
    left: `calc(${x * 100}% + ${left}px)`,
    top: "calc(0% + 0px)",
    width: `calc(${w * 100}% - ${left + right}px)`,
    height: "calc(100% - 0px)",
  };
}

/** WorkspaceTerminalGrid, three panes side by side, the first one focused. */
function TerminalGrid({ step }: { step: number }) {
  const GAP = 8;
  const MIN_WIDTH = 280;
  return (
    <div data-testid="workspace-terminal-grid" className="relative h-full min-h-0 overflow-auto p-2">
      <div
        className="relative h-full"
        style={{ minWidth: `${PANES.length * MIN_WIDTH + (PANES.length - 1) * GAP}px`, minHeight: "200px" }}
      >
        {PANES.map((pane, index) => (
          <div
            key={pane.name}
            data-session-id={pane.name}
            tabIndex={-1}
            style={columnStyle(index, PANES.length)}
            className="min-h-0 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none"
          >
            <AgentPane pane={pane} step={step} focused={index === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The side panel: closed rail (the default) or the open Agents tab
// ---------------------------------------------------------------------------

const SIDE_PANEL_TABS = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "changes", label: "Changes", icon: FileDiff },
  { id: "files", label: "Folder", icon: FolderTree },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "office", label: "Jarvis Verse", icon: Building2 },
] as const;

/** IdeSidePanelRail: what a closed panel leaves on the right edge. */
function IdeSidePanelRail() {
  return (
    <nav
      data-testid="ide-side-panel-rail"
      aria-label="Side panel tabs"
      className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-l border-border/60 bg-card/40 py-2"
    >
      {SIDE_PANEL_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          tabIndex={-1}
          title={tab.label}
          className="relative flex w-10 flex-col items-center gap-0.5 rounded-lg py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <tab.icon className="h-[18px] w-[18px]" aria-hidden />
          <span className="max-w-full truncate text-[9.5px] font-medium leading-none">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

const HEADER_BTN =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors " +
  "hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

type Column = "done" | "working" | "reviewed";
const COLUMN_ICON = { done: CheckCheck, working: Loader2, reviewed: Eye } as const;
const COLUMN_TONE: Record<Column, string> = { done: "text-success", working: "text-accent", reviewed: "text-muted-foreground" };
const COLUMN_LABEL: Record<Column, string> = { done: "Done", working: "Working", reviewed: "Reviewed" };
const COLUMN_EMPTY: Record<Column, string> = {
  done: "Nothing new has finished.",
  working: "No agent is working right now.",
  reviewed: "Click a finished agent to move it here.",
};

/** AgentsOverview, for the three panes at a given step. */
function AgentsOverview({ step }: { step: number }) {
  const columns: Record<Column, PaneScript[]> = { done: [], working: [], reviewed: [] };
  for (const pane of PANES) columns[paneDone(pane, step) ? "done" : "working"].push(pane);
  const card = (pane: PaneScript) => {
    const working = !paneDone(pane, step);
    const tone = working ? { text: "text-accent", pill: "bg-accent/10" } : { text: "text-muted-foreground", pill: "bg-muted" };
    return (
      <li key={pane.name}>
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "group flex w-full items-center rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
            "border-border/60 bg-background/40 hover:border-border hover:bg-muted/50",
          )}
        >
          <span className="flex w-full items-start gap-3">
            <span className="relative shrink-0">
              <AgentMark agent={pane.agent} label={pane.displayName} size="md" />
              <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-card">
                <span className={cn("relative h-2 w-2 rounded-full", working ? "bg-accent" : "bg-muted-foreground/40")} />
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{pane.title}</span>
              <span className="truncate text-[11px] tabular-nums text-muted-foreground">
                {`${pane.displayName} · Last output ${pane.lastOutput} ago`}
              </span>
            </span>
            <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums", tone.pill, tone.text)}>
              {working ? "Working" : "Done"}
              <span className="opacity-70"> · {pane.since}</span>
            </span>
          </span>
        </button>
      </li>
    );
  };
  return (
    <section aria-label="Agents in this workspace" className="flex h-full min-h-0 flex-col">
      <div role="radiogroup" aria-label="Show agents from" className="mx-3 mt-3 flex shrink-0 rounded-lg border border-border/60 bg-muted/40 p-0.5">
        <button type="button" tabIndex={-1} className="flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background text-foreground shadow-sm">This space</button>
        <button type="button" tabIndex={-1} className="flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:text-foreground">Whole folder</button>
      </div>
      <div className="scrollbar-jarvis min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-3">
        {(["done", "working", "reviewed"] as const).map((column) => {
          const Icon = COLUMN_ICON[column];
          const rows = columns[column];
          return (
            <section key={column} aria-label={COLUMN_LABEL[column]}>
              <h3 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon aria-hidden className={cn("h-3.5 w-3.5", COLUMN_TONE[column], column === "working" && rows.length > 0 && "animate-spin [animation-duration:2.4s] motion-reduce:animate-none")} />
                <span>{COLUMN_LABEL[column]}</span>
                <span className="rounded bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{rows.length}</span>
              </h3>
              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground">{COLUMN_EMPTY[column]}</p>
              ) : (
                <ul className="space-y-2">{rows.map(card)}</ul>
              )}
            </section>
          );
        })}
      </div>
      <div className="shrink-0 space-y-2 border-t border-border/60 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">Agents keep running when you close the app.</p>
        <button type="button" tabIndex={-1} className="rounded-md border border-border px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10">Stop all agents</button>
      </div>
    </section>
  );
}

/** IdeSidePanel with the Agents tab in front. */
function IdeSidePanel({ step }: { step: number }) {
  return (
    <aside id="ide-side-panel" aria-label="Side panel" className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card/40">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border/60 px-2">
        <div role="tablist" aria-label="Side panel tabs" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <div className="group/tab flex h-8 min-w-0 shrink-0 items-center gap-1 rounded-lg pl-2.5 pr-1 text-sm transition-colors bg-secondary text-foreground">
            <button type="button" role="tab" tabIndex={-1} aria-selected className="flex min-w-0 items-center gap-1.5 focus-visible:outline-none">
              <Bot className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate font-medium">Agents</span>
            </button>
            <button type="button" tabIndex={-1} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="relative">
          <button type="button" tabIndex={-1} className={HEADER_BTN}><Plus className="h-4 w-4" aria-hidden /></button>
        </div>
        <button type="button" tabIndex={-1} className={HEADER_BTN}><Maximize2 className="h-4 w-4" aria-hidden /></button>
        <button type="button" tabIndex={-1} className={HEADER_BTN}><PanelRightClose className="h-4 w-4" aria-hidden /></button>
      </div>
      <div role="tabpanel" className="min-h-0 flex-1">
        <AgentsOverview step={step} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * The agentic-ide section inside the main column (AgenticIdeView): the grid,
 * and on its right the side panel — closed by default in a fresh install
 * (ideSidePanel.storedOpen), which leaves the tab rail. `panelOpen` draws the
 * open Agents tab instead (340 px, DEFAULT_PX); three panes then need more
 * width than the clone window's main column has, so the grid scrolls sideways
 * exactly as the app's would.
 */
export function IdeMain({ step, panelOpen = false }: { step: number; panelOpen?: boolean }) {
  const at = Math.max(0, Math.min(IDE_STEPS - 1, step));
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background text-foreground" data-testid="igentic-ide">
      <main className="min-h-0 flex-1">
        <div className="relative flex h-full min-h-0 w-full">
          <div data-testid="ide-side-panel-grid" className="h-full min-h-0 min-w-0 flex-1">
            <TerminalGrid step={at} />
          </div>
          <div data-testid="ide-side-panel-host" className="h-full shrink-0 relative" style={{ width: panelOpen ? 340 : 0 }}>
            {panelOpen && (
              <div data-testid="ide-side-panel-body" className="relative h-full">
                <IdeSidePanel step={at} />
              </div>
            )}
          </div>
          {!panelOpen && <IdeSidePanelRail />}
        </div>
      </main>
    </div>
  );
}

/** The project tree's rows (IdeProjectTree), with placeholder projects. */
interface TreeWorkspace { id: string; name: string; terminals: number; status: "open" | "closed" }
interface TreeProject { id: string; name: string; workspaces: TreeWorkspace[]; open: boolean }

const PROJECTS: TreeProject[] = [
  {
    id: "web-app",
    name: "web-app",
    open: true,
    workspaces: [
      { id: "web-app", name: "web-app", terminals: 3, status: "open" },
      { id: "checkout-redesign", name: "checkout-redesign", terminals: 2, status: "open" },
      { id: "old-onboarding", name: "old-onboarding", terminals: 0, status: "closed" },
    ],
  },
  { id: "api-server", name: "api-server", open: false, workspaces: [{ id: "api-server", name: "api-server", terminals: 1, status: "open" }] },
  {
    id: "design-system",
    name: "design-system",
    open: false,
    workspaces: [
      { id: "tokens", name: "tokens", terminals: 2, status: "open" },
      { id: "icons", name: "icons", terminals: 1, status: "open" },
    ],
  },
];
const ACTIVE_WORKSPACE = "web-app";

function SessionCount({ count, hover }: { count: number; hover: "group" | "group/space" }) {
  const fade = hover === "group"
    ? "group-hover:opacity-0 group-focus-within:opacity-0"
    : "group-hover/space:opacity-0 group-focus-within/space:opacity-0";
  return (
    <span aria-label={`${count} agent ${count === 1 ? "session" : "sessions"}`}
      className={`shrink-0 text-[13px] tabular-nums text-muted-foreground/70 transition-opacity [@media(hover:none)]:opacity-0 ${fade}`}>{count}</span>
  );
}

const PANE_DROP_ACTIVE = "data-[pane-drop-active=true]:bg-primary/10 data-[pane-drop-active=true]:ring-1 data-[pane-drop-active=true]:ring-inset data-[pane-drop-active=true]:ring-primary/60";

function ProjectRow({ project }: { project: TreeProject }) {
  const solo = project.workspaces.length === 1 && project.workspaces[0].name.toLowerCase() === project.name.toLowerCase()
    ? project.workspaces[0] : null;
  const open = project.open;
  const active = project.workspaces.some((workspace) => workspace.id === ACTIVE_WORKSPACE);
  const soloSelected = solo !== null && solo.id === ACTIVE_WORKSPACE;
  const count = project.workspaces.reduce((total, workspace) => total + workspace.terminals, 0);
  return (
    <div className="mb-px">
      <div className={`group relative flex min-h-8 items-center rounded-md transition-colors hover:bg-muted ${active ? "text-foreground" : ""} ${soloSelected ? "bg-muted" : ""} cursor-grab active:cursor-grabbing ${PANE_DROP_ACTIVE}`}>
        <button type="button" tabIndex={-1}
          className={`flex min-h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left text-[15px] [@media(hover:none)]:pr-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${solo && solo.status !== "open" && !soloSelected ? "text-muted-foreground" : "text-foreground"}`}>
          {open && !solo
            ? <FolderOpen aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            : <Folder aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
          <span className="min-w-0 flex-1 truncate">{project.name}</span>
          {count > 0 && (solo || !open) && <SessionCount count={count} hover="group" />}
        </button>
        <div className="absolute inset-y-0 right-0 flex items-center rounded-r-md bg-gradient-to-l from-muted from-60% to-transparent pl-5 pr-1 transition-opacity pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
          <button type="button" tabIndex={-1} className="rounded p-1 hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          <button type="button" tabIndex={-1} className="rounded p-1 text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && !solo && (
        <div className="mb-1 flex flex-col gap-px">
          {project.workspaces.map((workspace) => {
            const selected = workspace.id === ACTIVE_WORKSPACE;
            const draggable = workspace.status === "open";
            return (
              <div key={workspace.id}
                className={`group/space relative flex min-h-8 items-center rounded-md transition-colors hover:bg-muted ${selected ? "bg-muted text-foreground" : ""} ${PANE_DROP_ACTIVE}`}>
                <button type="button" tabIndex={-1}
                  className={`flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-[34px] pr-2 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "text-foreground" : workspace.status === "open" ? "text-foreground/80" : "text-muted-foreground"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}>
                  <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                  {workspace.terminals > 0 && <SessionCount count={workspace.terminals} hover="group/space" />}
                </button>
                <button type="button" tabIndex={-1}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-opacity hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:opacity-100 group-hover/space:opacity-100 group-focus-within/space:opacity-100 [@media(hover:none)]:opacity-100 opacity-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * What the app's Sidebar shows in its scroll region on the IDE section: the
 * "Back to Jarvis" row (Sidebar.tsx, `onIdeSection`) and the project tree
 * (IdeProjectTree). Drop it into the sidebar's
 * `flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-jarvis` region.
 */
export function IdeNav(): ReactNode {
  return (
    <>
      <nav aria-label="IDE navigation" className="px-2 pt-2">
        <button type="button" tabIndex={-1}
          className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span>Back to Jarvis</span>
        </button>
      </nav>
      <div data-testid="ide-project-tree" className="flex-1 px-2 pb-3 pt-2">
        <div className="flex h-8 items-center justify-between pl-2 pr-1 text-[15px] font-semibold text-foreground">
          <span>Workspaces</span>
          <div className="flex items-center gap-0.5">
            <button type="button" tabIndex={-1} title="Jarvis Live"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Mic className="h-3.5 w-3.5" /></button>
            <button type="button" tabIndex={-1} title="Connect project folder"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        {PROJECTS.map((project) => <ProjectRow key={project.id} project={project} />)}
      </div>
    </>
  );
}
