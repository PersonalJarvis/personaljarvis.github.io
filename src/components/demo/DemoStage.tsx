import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import jarvisLogo from "@/assets/jarvis-logo.png?url";
import { AnthropicMark } from "@/components/logos/AnthropicMark";
import { GeminiMark } from "@/components/logos/GeminiMark";
import { OpenAiMark } from "@/components/logos/OpenAiMark";
import {
  CHAT_ENGINE,
  CHAT_SCRIPT,
  CHAT_TURNS,
  IDE_SCRIPT,
  PANES,
  USER_NAME,
  VOICE_ENGINE,
  WAKE_PHRASE,
  WAVEFORM,
  type ChatFrame,
  type IdeFrame,
  type Pane,
  type PaneLine,
  type Phase,
  type Scene,
  type Step,
  type Turn,
} from "./demoScript";
import "./demo-stage.css";

/**
 * The hero's demo stage — the app, rebuilt in DOM, playing one errand from
 * the chat into the Agentic IDE.
 *
 * ONE window, because the product is one window. Its sidebar is the app's
 * sidebar as it ships today (`components/layout/Sidebar.tsx`): search, New
 * chat, the primary sections, the user's agents and the recent chats. Two of
 * its rows are live — "New chat" and "Agentic IDE" — and they move between the
 * two scenes the way the real rows move between sections. Everything else
 * inside the window is real markup that does nothing, the way a screenshot
 * does nothing.
 *
 * Scene 1 is the front page: ONE chat with a voice mode inside it. The person
 * talks, Jarvis reads what it needs, and hands the coding part to an agent.
 * Scene 2 is where that agent works: the Agentic IDE, with three coding-agent
 * CLIs side by side in one workspace.
 *
 * Everything is laid out at a fixed design size and scaled with a
 * ResizeObserver, so the mockup behaves like a screenshot: identical
 * proportions at every viewport instead of reflowing into a different design.
 * That is why there is no responsive styling below this line and every size is
 * in px (docs/hero.md, "Scaling").
 */

const CHROME_H = 38;
const BODY_H = 598;

/**
 * The stage, in design pixels: the window plus the air around it, and nothing
 * else. The air decides how big the window comes out, because the scale fits
 * the whole stage into the frame: less air, bigger window. The maintainer
 * sized the window at ~90% of the frame's width on 2026-08-29; keep the two
 * numbers close to this ratio, so the fit stays on the width axis and the
 * window keeps growing with the page.
 */
const WINDOW_W = 1152;
const WINDOW_H = CHROME_H + BODY_H;
const WINDOW_X = 64;
const WINDOW_Y = 48;
const STAGE_W = WINDOW_X * 2 + WINDOW_W;
const STAGE_H = WINDOW_Y * 2 + WINDOW_H;
const SIDEBAR_W = 232;
/** The app's centred reading column, at this window's scale. */
const COLUMN_W = 660;

/**
 * The app's own dark theme, by token. Never a literal here: the whole point
 * of the `--app-*` group is that the clone drifts only when the app does.
 */
const C = {
  bg: "var(--app-bg)",
  sidebar: "var(--app-sidebar)",
  card: "var(--app-card)",
  muted: "var(--app-muted)",
  fg: "var(--app-fg)",
  dim: "var(--app-fg-muted)",
  border: "var(--app-border)",
  primary: "var(--app-primary)",
  success: "var(--success)",
  error: "var(--error)",
} as const;

/** A token at partial strength — the app leans on `/60`-style opacities. */
function soft(token: string, percent: number): string {
  return `color-mix(in srgb, ${token} ${percent}%, transparent)`;
}

const MONO = "var(--font-mono)";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Scale factor so the fixed stage fits whatever box it is given.
 *
 * CONTAIN, not fill-the-width: the hero hands the stage row whatever height is
 * left after the headline and the buttons, and that height moves with the
 * viewport. Scaling on width alone would push the window's lower half out of
 * a short frame. Fitting both axes shrinks the whole window instead, which is
 * what a screenshot does when the wall gets smaller.
 *
 * Measured in a layout effect BEFORE paint, so the stage never shows one frame
 * at the wrong size, and re-measured by a ResizeObserver afterwards.
 */
function useStageScale(ref: { current: HTMLDivElement | null }): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0) return;
      setScale(height > 0 ? Math.min(width / STAGE_W, height / STAGE_H) : width / STAGE_W);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return scale;
}

/** Types `full` out one character at a time; instant when motion is reduced. */
function useTypewriter(full: string, active: boolean, reduced: boolean, msPerChar = 22): string {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setShown(full);
      return;
    }
    let i = 0;
    setShown("");
    const id = setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, msPerChar);
    return () => clearInterval(id);
  }, [full, active, reduced, msPerChar]);
  return active ? shown : "";
}

/**
 * "Good morning" — the greeting the app opens with, from the machine's clock.
 *
 * Resolved AFTER mount on purpose: this island is server-rendered too, and a
 * time-dependent first render would disagree with the server's.
 */
function useGreeting(): string {
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return greeting;
}

// ---------------------------------------------------------------------------
// Glyphs — small enough to draw, so the demo pulls in no icon dependency
// ---------------------------------------------------------------------------

function Glyph({
  path,
  size = 14,
  color,
  filled = false,
}: {
  path: string;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const PATH = {
  chevron: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  check: "M20 6L9 17l-5-5",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  mic: "M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 19v3",
  wave: "M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  users: "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9",
  speech: "M3 10v4M7 6v12M11 9v6M15 4v16M19 8v8",
  shapes: "M8.5 3l5.5 9.5H3zM17 21.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  store: "M3 9l1.5-5h15L21 9M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
  panel: "M4 4h16v16H4zM9 4v16",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  branch: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  agent: "M12 8V4H8M4 12h16v8H4zM2 16h2M20 16h2M9 15.5v1M15 15.5v1",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  stop: "M7 7h10v10H7z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7",
} as const;

/**
 * A vendor mark at a stage size. The logo components leave sizing to the
 * caller, and inside the stage a size is a design pixel on the fixed canvas —
 * so the box is set here and the mark fills it.
 */
function Mark({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <span style={{ display: "inline-grid", width: size, height: size, flexShrink: 0 }}>
      {children}
    </span>
  );
}

function CliMark({ cli, size = 14 }: { cli: Pane["cli"]; size?: number }) {
  return (
    <Mark size={size}>
      {cli === "claude" ? (
        <AnthropicMark className="demo-mark" />
      ) : cli === "codex" ? (
        <OpenAiMark className="demo-mark" />
      ) : (
        <GeminiMark className="demo-mark" />
      )}
    </Mark>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/**
 * The mark that says work is happening right now — a core inside two rings
 * that expand and fade. It is the ONE live mark the product owns.
 */
function LiveCore({ size = 10 }: { size?: number }) {
  return (
    <span
      style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
    >
      <span
        className="demo-live-ring"
        style={{ position: "absolute", inset: 0, borderRadius: 999, background: soft(C.primary, 45) }}
      />
      <span
        className="demo-live-ring"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: soft(C.primary, 45),
          animationDelay: "0.9s",
        }}
      />
      <span
        className="demo-core"
        style={{ position: "relative", width: size, height: size, borderRadius: 999, background: soft(C.fg, 70) }}
      />
    </span>
  );
}

/** The blinking cursor on a line that is still arriving. */
function Caret() {
  return (
    <span
      className="demo-caret"
      style={{
        display: "inline-block",
        width: 2,
        height: "1em",
        marginLeft: 3,
        transform: "translateY(2px)",
        background: C.fg,
      }}
      aria-hidden="true"
    />
  );
}

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span
      className="demo-spin"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        border: `2px solid ${soft(C.primary, 22)}`,
        borderTopColor: C.primary,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * The app's top bar: the sidebar toggle and history arrows at the left, the
 * theme and window controls at the right. The app draws no title here; the
 * demo keeps the product's name centred so the window reads on its own.
 */
function TopBar() {
  const icon = (path: string, key: string) => (
    <span key={key} style={{ display: "grid", placeItems: "center", width: 22, height: 22, color: C.dim }}>
      <Glyph path={path} size={14} />
    </span>
  );
  return (
    <div
      style={{
        height: CHROME_H,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 10px",
        position: "relative",
        flexShrink: 0,
        background: C.sidebar,
      }}
    >
      {icon(PATH.panel, "panel")}
      {icon(PATH.arrowLeft, "back")}
      <span style={{ opacity: 0.45, display: "flex" }}>{icon(PATH.arrowRight, "fwd")}</span>
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 12.5,
          color: C.dim,
          pointerEvents: "none",
        }}
      >
        Personal Jarvis
      </span>
      <span style={{ flex: 1 }} />
      {icon(PATH.sun, "sun")}
      {icon(PATH.refresh, "refresh")}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

type AgentStatus = "idle" | "working" | "done";

/** The user's own agents, as the sidebar lists them under "Agents". */
const SIDEBAR_AGENTS: { name: string; role: string; shape: "triangle" | "circle"; color: string }[] = [
  { name: "Scout", role: "Claude Code", shape: "triangle", color: "var(--app-agent-violet)" },
  { name: "Atlas", role: "Codex", shape: "circle", color: "var(--app-agent-blue)" },
  { name: "Quill", role: "Gemini CLI", shape: "circle", color: "var(--app-agent-green)" },
];

const RECENT = [
  "Fix the login test",
  "Morning brief",
  "Release notes, week 40",
  "Standup moved",
  "Kessler invoice",
  "Trip to Lisbon",
  "Shipped — week 39",
];

function SidebarRow({
  label,
  icon,
  active = false,
  badge,
  beta = false,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  badge?: string;
  beta?: boolean;
  onClick?: () => void;
}) {
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 11,
    width: "100%",
    borderRadius: 8,
    border: "none",
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 13.5,
    textAlign: "left",
    color: C.fg,
    background: active ? C.muted : "transparent",
    cursor: onClick ? "pointer" : "default",
  };
  const body = (
    <>
      <Glyph path={icon} size={15} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {beta && (
        <span
          style={{
            borderRadius: 5,
            background: C.muted,
            border: `1px solid ${C.border}`,
            padding: "0 5px",
            fontSize: 10,
            lineHeight: "15px",
            color: C.dim,
          }}
        >
          Beta
        </span>
      )}
      <span style={{ flex: 1 }} />
      {badge && <span style={{ fontSize: 11, color: C.dim }}>{badge}</span>}
    </>
  );
  return onClick ? (
    <button type="button" tabIndex={-1} onClick={onClick} className="demo-row" style={style}>
      {body}
    </button>
  ) : (
    <div className="demo-row" style={style}>
      {body}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "14px 10px 5px", fontSize: 11.5, color: C.dim }}>{children}</div>
  );
}

function AgentAvatar({ shape, color }: { shape: "triangle" | "circle"; color: string }) {
  return shape === "triangle" ? (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8 1.5L15 14.5H1z" fill={color} />
    </svg>
  ) : (
    <span style={{ width: 13, height: 13, borderRadius: 999, background: color, flexShrink: 0 }} />
  );
}

function AgentStatusMark({ status }: { status: AgentStatus }) {
  if (status === "working") return <Spinner size={10} />;
  if (status === "done") return <Glyph path={PATH.check} size={12} color={C.success} />;
  return <span style={{ width: 6, height: 6, borderRadius: 999, background: soft(C.dim, 50) }} />;
}

function Sidebar({
  scene,
  onPick,
  agents,
}: {
  scene: Scene;
  onPick: (next: Scene) => void;
  agents: Record<string, AgentStatus>;
}) {
  return (
    <aside
      style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        background: C.sidebar,
        padding: "10px 8px 8px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* The search bar the app opens with — Ctrl+Space from anywhere. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 9,
          border: `1px solid ${C.border}`,
          background: C.card,
          padding: "6px 8px",
          marginBottom: 8,
          fontSize: 12.5,
          color: C.dim,
        }}
      >
        <Glyph path={PATH.search} size={13} />
        <span style={{ flex: 1 }}>Search</span>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: C.success }} />
        {["Ctrl", "Space"].map((k) => (
          <span
            key={k}
            style={{
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              padding: "0 4px",
              fontSize: 10,
              lineHeight: "15px",
            }}
          >
            {k}
          </span>
        ))}
      </div>

      <div className="demo-nav" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <SidebarRow label="New chat" icon={PATH.plus} active={scene === "chat"} onClick={() => onPick("chat")} />
        <SidebarRow label="Agents" icon={PATH.users} badge="3" />
        <SidebarRow label="Jarvis Voice" icon={PATH.speech} />
        <SidebarRow label="Artifacts" icon={PATH.shapes} />
        <SidebarRow
          label="Agentic IDE"
          icon={PATH.code}
          beta
          active={scene === "ide"}
          onClick={() => onPick("ide")}
        />
        <SidebarRow label="Plugins / Skills / MCP" icon={PATH.grid} />
        <SidebarRow label="Marketplace" icon={PATH.store} />
        <SidebarRow label="More" icon={PATH.chevronDown} />

        <GroupLabel>Agents</GroupLabel>
        {SIDEBAR_AGENTS.map((a) => (
          <div
            key={a.name}
            className="demo-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 13.5,
              color: C.fg,
            }}
          >
            <AgentAvatar shape={a.shape} color={a.color} />
            <span>{a.name}</span>
            <span style={{ fontSize: 11.5, color: soft(C.dim, 80) }}>{a.role}</span>
            <span style={{ flex: 1 }} />
            <AgentStatusMark status={agents[a.name] ?? "idle"} />
          </div>
        ))}

        <GroupLabel>Recent</GroupLabel>
        {RECENT.map((title) => (
          <div
            key={title}
            className="demo-row"
            style={{
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 13,
              color: soft(C.fg, 85),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        ))}
      </div>

      {/* The profile row at the foot of the column. A placeholder person. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          borderTop: `1px solid ${soft(C.border, 70)}`,
          padding: "9px 8px 2px",
          fontSize: 13,
          color: C.fg,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 22,
            height: 22,
            borderRadius: 999,
            background: C.muted,
            fontSize: 11,
            color: C.dim,
          }}
        >
          {USER_NAME[0]}
        </span>
        <span style={{ flex: 1 }}>{USER_NAME}</span>
        <Glyph path={PATH.download} size={13} color={C.dim} />
        <Glyph path={PATH.settings} size={13} color={C.dim} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Scene 1 — the chat
// ---------------------------------------------------------------------------

/** One tool call: a row, never a box of its own. */
function StepRow({ step, running }: { step: Step; running: boolean }) {
  return (
    <div
      className="demo-row"
      style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 7, padding: "3px 6px", fontSize: 13 }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 16, height: 16, flexShrink: 0, color: C.dim }}>
        {step.logo ? (
          <img src={step.logo} alt="" width={14} height={14} style={{ width: 14, height: 14 }} />
        ) : (
          <Glyph path={step.glyph === "memory" ? PATH.bookmark : PATH.agent} size={14} />
        )}
      </span>
      <span style={{ fontFamily: MONO, fontWeight: 500, color: C.fg, flexShrink: 0 }}>{step.label}</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: MONO,
          fontSize: 12,
          color: soft(C.dim, 85),
        }}
      >
        {step.summary}
      </span>
      {running ? (
        <Spinner />
      ) : (
        <span style={{ flexShrink: 0, fontFamily: MONO, fontSize: 11, color: soft(C.dim, 65) }}>{step.took}</span>
      )}
    </div>
  );
}

/**
 * The turn's reasoning, the way the app shows it: open while it runs, folded
 * to "Thought for Ns" over its own tool rows once it is done.
 */
function ReasoningBlock({ turn, frame, live, reduced }: { turn: Turn; frame: ChatFrame; live: boolean; reduced: boolean }) {
  const thinking = live && frame.phase === "thinking";
  const streamed = useTypewriter(turn.thought, thinking && !reduced, reduced);
  const running = live && frame.phase === "steps";
  const shown = turn.steps.slice(0, live ? frame.steps : turn.steps.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {thinking ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "2px 0" }}>
          <LiveCore />
          <span className="demo-shimmer" style={{ fontWeight: 500 }}>
            Thinking for {turn.thoughtSeconds}s
          </span>
        </div>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.dim, padding: "2px 0" }}>
          <Glyph path={PATH.chevron} size={13} />
          <span>Thought for {turn.thoughtSeconds}s</span>
        </div>
      )}

      {thinking ? (
        <div
          style={{
            marginLeft: 6,
            borderLeft: `1px solid ${C.border}`,
            paddingLeft: 13,
            maxHeight: 84,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            fontSize: 13,
            lineHeight: 1.55,
            color: C.dim,
          }}
        >
          <span>
            {reduced ? turn.thought : streamed}
            {!reduced && <Caret />}
          </span>
        </div>
      ) : (
        shown.map((step, i) => (
          <StepRow key={`${step.label}-${i}`} step={step} running={running && i === shown.length - 1} />
        ))
      )}
    </div>
  );
}

/** The answer, typed out — plain text on the page, the way the app sets it. */
function Answer({ turn, live, reduced }: { turn: Turn; live: boolean; reduced: boolean }) {
  const full = turn.answer.join("\n");
  const streamed = useTypewriter(full, live && !reduced, reduced);
  const text = live && !reduced ? streamed : full;
  const caret = live && !reduced && text.length < full.length;
  return (
    <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: C.fg }}>
      {text}
      {caret && <Caret />}
    </p>
  );
}

/** The person's line — a soft grey bubble on the right; a mic mark when spoken. */
function UserBubble({ text, voice, arriving }: { text: string; voice: boolean; arriving: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "80%",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          borderRadius: 16,
          background: C.muted,
          padding: "9px 14px",
          fontSize: 15,
          lineHeight: 1.5,
          color: arriving ? C.dim : C.fg,
        }}
      >
        {voice && (
          <span style={{ transform: "translateY(2px)" }}>
            <Glyph path={PATH.mic} size={13} color={C.dim} />
          </span>
        )}
        <span>
          {text}
          {arriving && <Caret />}
        </span>
      </div>
    </div>
  );
}

function ChatTurnView({ turn, frame, live, reduced }: { turn: Turn; frame: ChatFrame; live: boolean; reduced: boolean }) {
  const listening = live && frame.phase === "listening";
  const heard = useTypewriter(turn.said, listening && !reduced, reduced, 34);
  const said = listening && !reduced ? heard : turn.said;
  const answered = !live || frame.phase === "answering" || frame.phase === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <UserBubble text={said} voice={turn.voice} arriving={listening && !reduced} />
      {!listening && <ReasoningBlock turn={turn} frame={frame} live={live} reduced={reduced} />}
      {answered && <Answer turn={turn} live={live && frame.phase === "answering"} reduced={reduced} />}
    </div>
  );
}

/** The greeting the front page opens with, faded once a chat is on screen. */
function Greeting() {
  const greeting = useGreeting();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: 0.6,
        marginBottom: 4,
      }}
    >
      <img src={jarvisLogo} alt="" width={30} height={30} style={{ width: 30, height: 30 }} />
      <span style={{ fontSize: 26, letterSpacing: "-0.4px", color: C.fg }}>
        {greeting}, {USER_NAME}
      </span>
    </div>
  );
}

/** The voice-mode state word for a point in the rerun. */
function voiceState(phase: Phase): { word: string; amp: number } {
  switch (phase) {
    case "listening":
      return { word: "Listening", amp: 1 };
    case "thinking":
    case "steps":
      return { word: "Thinking", amp: 0.36 };
    default:
      return { word: "Speaking", amp: 0.8 };
  }
}

function Waveform({ amp }: { amp: number }) {
  const bars = 64;
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, flex: 1, minWidth: 0 }}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, i) => {
        const a = WAVEFORM[i % WAVEFORM.length];
        return (
          <span
            key={i}
            className="demo-wave-bar"
            style={{
              display: "block",
              width: 3,
              borderRadius: 999,
              height: Math.max(3, Math.round(a * amp * 30)),
              background: amp > 0.3 ? soft(C.fg, 85) : soft(C.dim, 55),
              animationDelay: `${(i % WAVEFORM.length) * -34}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * The composer, in one of its two faces. In voice mode the row is the call:
 * the state word, the wave, "Back to typing" and the stop button. Typed, it is
 * one quiet row — the round +, the permission stance as words, the model as a
 * plain word with the effort muted beside it, the mic and the voice button.
 */
function Composer({ phase }: { phase: Phase }) {
  const voice = phase !== "done";
  const state = voiceState(phase);
  const round = (children: ReactNode, filled: boolean): ReactNode => (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: 30,
        height: 30,
        borderRadius: 999,
        flexShrink: 0,
        background: filled ? C.fg : "transparent",
        border: filled ? "none" : `1px solid ${C.border}`,
        color: filled ? C.bg : C.dim,
      }}
    >
      {children}
    </span>
  );

  return (
    <div>
      <div style={{ borderRadius: 18, border: `1px solid ${C.border}`, background: C.card, padding: voice ? "10px 10px 10px 16px" : "12px 10px 10px 14px" }}>
        {voice ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: 92, fontSize: 13, color: C.fg }}>
              <LiveCore size={8} />
              {state.word}
            </span>
            <Waveform amp={state.amp} />
            <span style={{ fontSize: 12.5, color: C.dim, whiteSpace: "nowrap" }}>Back to typing</span>
            {round(<Glyph path={PATH.stop} size={12} filled />, true)}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 15, color: soft(C.dim, 85), padding: "2px 4px 12px" }}>Ask anything</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {round(<Glyph path={PATH.plus} size={15} />, false)}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.dim }}>
                <Glyph path={PATH.shield} size={13} />
                Ask before acting
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, color: C.fg }}>{CHAT_ENGINE.model}</span>
              <span style={{ fontSize: 12.5, color: C.dim }}>{CHAT_ENGINE.effort}</span>
              <span style={{ width: 4 }} />
              <Glyph path={PATH.mic} size={15} color={C.dim} />
              {round(<Glyph path={PATH.wave} size={15} />, true)}
            </div>
          </>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          padding: "7px 6px 0",
          fontSize: 11.5,
          color: C.dim,
          minHeight: 22,
        }}
      >
        {voice ? (
          <>
            <Mark size={12}>
              <OpenAiMark className="demo-mark" />
            </Mark>
            {VOICE_ENGINE.provider} {VOICE_ENGINE.model}
          </>
        ) : (
          <>Say “{WAKE_PHRASE}” any time</>
        )}
      </div>
    </div>
  );
}

function ChatScene({ frame, reduced }: { frame: ChatFrame; reduced: boolean }) {
  const [past, live] = CHAT_TURNS;
  return (
    <>
      <div
        className="demo-lane"
        style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      >
        <div style={{ width: COLUMN_W, margin: "0 auto", padding: "18px 0 10px", display: "flex", flexDirection: "column", gap: 22 }}>
          <Greeting />
          <ChatTurnView turn={past} frame={DONE_FRAME} live={false} reduced={reduced} />
          <ChatTurnView turn={live} frame={frame} live reduced={reduced} />
        </div>
      </div>
      <div style={{ width: COLUMN_W, margin: "0 auto", padding: "0 0 8px" }}>
        <Composer phase={frame.phase} />
      </div>
    </>
  );
}

/** Everything a turn that already happened is: finished, whole, quiet. */
const DONE_FRAME: ChatFrame = { phase: "done", steps: 99, duration: 0 };

// ---------------------------------------------------------------------------
// Scene 2 — the Agentic IDE
// ---------------------------------------------------------------------------

function PaneLineView({ line }: { line: PaneLine }) {
  const base: CSSProperties = { fontFamily: MONO, fontSize: 11.5, lineHeight: 1.55, wordBreak: "break-word" };
  switch (line.kind) {
    case "prompt":
      return (
        <div style={{ ...base, borderRadius: 6, background: C.muted, padding: "5px 8px", color: C.fg }}>
          <span style={{ color: C.dim }}>› </span>
          {line.text}
        </div>
      );
    case "text":
      return (
        <div style={{ ...base, display: "flex", gap: 7, color: C.fg }}>
          <span style={{ color: C.dim }}>●</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.5 }}>{line.text}</span>
        </div>
      );
    case "tool":
      return (
        <div style={base}>
          <div style={{ display: "flex", gap: 7, color: C.fg }}>
            <span style={{ color: line.fail ? C.error : C.success }}>●</span>
            <span>
              <span style={{ fontWeight: 600 }}>{line.name}</span>
              <span style={{ color: C.dim }}>({line.arg})</span>
            </span>
          </div>
          {line.result && (
            <div style={{ paddingLeft: 14, color: line.fail ? C.error : C.dim }}>⎿ {line.result}</div>
          )}
        </div>
      );
    case "add":
    case "del": {
      const add = line.kind === "add";
      return (
        <div
          style={{
            ...base,
            marginLeft: 14,
            borderRadius: 3,
            padding: "0 6px",
            background: soft(add ? C.success : C.error, 14),
            color: add ? C.success : C.error,
          }}
        >
          {add ? "+ " : "- "}
          {line.text}
        </div>
      );
    }
    case "done":
      return (
        <div style={{ ...base, display: "flex", gap: 7, alignItems: "center", color: C.success }}>
          <Glyph path={PATH.check} size={13} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500 }}>{line.text}</span>
        </div>
      );
  }
}

function paneFinished(pane: Pane, shown: number): boolean {
  return shown >= pane.lines.length && pane.lines[pane.lines.length - 1].kind === "done";
}

function AgentPane({ pane, shown }: { pane: Pane; shown: number }) {
  const done = paneFinished(pane, shown);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.card,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "9px 11px 8px", borderBottom: `1px solid ${soft(C.border, 80)}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
          <CliMark cli={pane.cli} size={14} />
          <span style={{ fontWeight: 600, color: C.fg }}>{pane.agent}</span>
          <span style={{ color: C.dim, fontSize: 12 }}>{pane.cliLabel}</span>
          <span style={{ flex: 1 }} />
          {done ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: C.success }}>
              <Glyph path={PATH.check} size={12} />
              Done
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.dim }}>
              <Spinner size={10} />
              Working
            </span>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pane.task}
        </div>
      </div>

      {/* Top-aligned, the way a terminal fills: the longest pane's whole run
          fits this height, so nothing is ever pushed out of the top. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          padding: "10px 11px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {pane.lines.slice(0, shown).map((line, i) => (
          <PaneLineView key={i} line={line} />
        ))}
        {!done && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11.5 }}>
            <span className="demo-shimmer">✻ Working…</span>
            <span style={{ color: soft(C.dim, 60) }}>esc to interrupt</span>
          </div>
        )}
      </div>

      <div
        style={{
          margin: "0 8px 8px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          padding: "6px 9px",
          fontFamily: MONO,
          fontSize: 11.5,
          color: soft(C.dim, 80),
        }}
      >
        › Message {pane.agent}
      </div>
    </div>
  );
}

function IdeScene({ frame }: { frame: IdeFrame }) {
  const working = PANES.filter((p, i) => !paneFinished(p, frame.lines[i])).length;
  return (
    <>
      <div
        style={{
          height: 42,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          borderBottom: `1px solid ${soft(C.border, 70)}`,
          fontSize: 13,
        }}
      >
        <Glyph path={PATH.folder} size={14} color={C.dim} />
        <span style={{ fontWeight: 600, color: C.fg }}>web-app</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 11.5, color: C.dim }}>
          <Glyph path={PATH.branch} size={12} />
          main
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.dim }}>
          {working} working · {PANES.length - working} done
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            padding: "4px 9px",
            fontSize: 12,
            color: C.fg,
          }}
        >
          <Glyph path={PATH.plus} size={12} />
          New agent
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 8, padding: 10 }}>
        {PANES.map((pane, i) => (
          <AgentPane key={pane.agent} pane={pane} shown={frame.lines[i]} />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

/** Who the sidebar shows as working, for a point in either scene. */
function agentStatuses(scene: Scene, chat: ChatFrame, ide: IdeFrame): Record<string, AgentStatus> {
  if (scene === "chat") {
    const dispatched = chat.phase !== "listening" && chat.phase !== "thinking" && chat.steps >= 2;
    return { Scout: dispatched ? "working" : "idle", Atlas: "working", Quill: "working" };
  }
  const out: Record<string, AgentStatus> = {};
  PANES.forEach((p, i) => {
    out[p.agent] = paneFinished(p, ide.lines[i]) ? "done" : "working";
  });
  return out;
}

export default function DemoStage({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scale = useStageScale(wrap);
  const reduced = usePrefersReducedMotion();

  const [scene, setScene] = useState<Scene>("chat");
  const [step, setStep] = useState(0);
  const [tookOver, setTookOver] = useState(false);

  const length = scene === "chat" ? CHAT_SCRIPT.length : IDE_SCRIPT.length;
  const duration = scene === "chat" ? CHAT_SCRIPT[step]?.duration : IDE_SCRIPT[step]?.duration;

  /**
   * Autoplay, and what the first click changes.
   *
   * Left alone, the stage plays the chat, follows the hand-off into the
   * Agentic IDE, and comes back — the visitor sees both without touching
   * anything. The first press of a live sidebar row stops the hand-over FOR
   * GOOD: from then on the chosen scene loops on its own. Pressing "Agentic
   * IDE" is a request to WATCH the agents, so the scene keeps playing rather
   * than freezing.
   */
  useEffect(() => {
    if (reduced || duration === undefined) return;
    const id = setTimeout(() => {
      const next = step + 1;
      if (next < length) {
        setStep(next);
        return;
      }
      setStep(0);
      if (!tookOver) setScene((s) => (s === "chat" ? "ide" : "chat"));
    }, duration);
    return () => clearTimeout(id);
  }, [step, length, duration, tookOver, reduced]);

  const last = (n: number) => (reduced ? n - 1 : Math.min(step, n - 1));
  const chatFrame = CHAT_SCRIPT[scene === "chat" ? last(CHAT_SCRIPT.length) : CHAT_SCRIPT.length - 1];
  const ideFrame = IDE_SCRIPT[scene === "ide" ? last(IDE_SCRIPT.length) : 0];

  const pick = (next: Scene) => {
    setTookOver(true);
    if (next !== scene) {
      setScene(next);
      setStep(0);
    }
  };

  return (
    <div className={className}>
      {/*
        `height: 100%` when the frame has a height of its own — the hero gives
        the stage row exactly what is left over — and the aspect ratio as the
        fallback for a frame that does not, so the demo can never collapse to
        nothing.
      */}
      <div
        ref={wrap}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: WINDOW_X,
              top: WINDOW_Y,
              width: WINDOW_W,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              background: C.bg,
              overflow: "hidden",
              color: C.fg,
              fontFamily: "var(--font-sans)",
            }}
          >
            <TopBar />
            <div style={{ display: "flex", height: BODY_H }}>
              <Sidebar scene={scene} onPick={pick} agents={agentStatuses(scene, chatFrame, ideFrame)} />
              <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: C.bg }}>
                {scene === "chat" ? (
                  <ChatScene frame={chatFrame} reduced={reduced} />
                ) : (
                  <IdeScene frame={ideFrame} />
                )}
              </main>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only">
        Interactive demo of the app. It opens on the front page, a single chat
        with a voice mode. The person asks out loud what their morning looks
        like; the assistant reads the inbox and the calendar and answers. They
        then say the login test is failing and ask for an agent to fix it — the
        assistant finds the failed run on GitHub and hands the job to an agent
        called Scout. The demo then moves to the Agentic IDE, where three coding
        agents work side by side in one project: Scout, on Claude Code, fixes
        the test, runs the suite and opens a pull request; Atlas, on Codex,
        updates dependencies; Quill, on Gemini CLI, drafts the release notes.
        Two rows in the sidebar, New chat and Agentic IDE, move between the two
        scenes.
      </p>
    </div>
  );
}
