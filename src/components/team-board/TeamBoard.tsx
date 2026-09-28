/**
 * The team board — a hands-on clone of the app's agent society.
 *
 * The visitor hands Jarvis a goal (a preset or their own words) and watches
 * the team pass it around: messages fly between agents on the stage, each
 * agent's lane fills on the timeline, the feed logs who told whom what, and
 * the run ends the way every real one does — on an approval that waits for
 * the person. Any agent can be opened and messaged directly.
 *
 * Everything is scripted sample data (see team.ts); the board says so under
 * the goal field. No model is called and nothing leaves the page.
 *
 * One clock drives the whole board. It advances on requestAnimationFrame only
 * while the board is on screen and the tab is visible, so a run nobody is
 * watching waits for them instead of finishing off-screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type SubmitEvent, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/components/window-demo/Stage";
import { AgentGlyph, GlyphFace, type Mood } from "./AgentGlyph";
import {
  AGENT,
  RUNS,
  STAGE_LABEL,
  STAGE_VERB,
  TEAM,
  TRAVEL_MS,
  customRun,
  runLength,
  type AgentId,
  type Run,
  type Stage,
  type Step,
} from "./team";
import "./team-board.css";

const STAGE_W = 800;
const STAGE_H = 520;
const TYPE_MS = 26;
const BUBBLE_MS = 2600;
const PULSE_MS = 700;

type Phase = "idle" | "typing" | "running" | "waiting" | "approved" | "declined";

interface ChatLine {
  id: number;
  who: "you" | AgentId;
  text: string;
}

interface Point {
  x: number;
  y: number;
}

/* --- Geometry ------------------------------------------------------------ */

/** A gentle arc between two agents; peers bow toward the lead in the middle. */
function control(a: Point, b: Point): Point {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const k = len * 0.16;
  const c1 = { x: mx + nx * k, y: my + ny * k };
  const c2 = { x: mx - nx * k, y: my - ny * k };
  const centre = AGENT.jarvis;
  const d1 = Math.hypot(c1.x - centre.x, c1.y - centre.y);
  const d2 = Math.hypot(c2.x - centre.x, c2.y - centre.y);
  return d1 < d2 ? c1 : c2;
}

function bezier(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function arcPath(a: Point, b: Point): string {
  const c = control(a, b);
  return `M${a.x} ${a.y} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x} ${b.y}`;
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function stamp(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `00:${s.toFixed(1).padStart(4, "0")}`;
}

/* --- Derived state ------------------------------------------------------- */

function activeStep(steps: readonly Step[], id: AgentId, clock: number): Step | undefined {
  let found: Step | undefined;
  for (const step of steps) {
    if (step.from === id && step.at <= clock && clock < step.at + step.dur) found = step;
  }
  return found;
}

/* --- The board ----------------------------------------------------------- */

export default function TeamBoard() {
  const reducedMotion = usePrefersReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const [run, setRun] = useState<Run>(RUNS[0]!);
  const [phase, setPhase] = useState<Phase>("idle");
  const [clock, setClock] = useState(0);
  const [field, setField] = useState("");
  const [typed, setTyped] = useState(0);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [hovered, setHovered] = useState<AgentId | null>(null);
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [chats, setChats] = useState<Partial<Record<AgentId, ChatLine[]>>>({});
  const [replying, setReplying] = useState<AgentId | null>(null);
  const [message, setMessage] = useState("");
  const [cheer, setCheer] = useState(0);
  const lineId = useRef(0);
  const replyTurn = useRef<Partial<Record<AgentId, number>>>({});

  const length = useMemo(() => runLength(run), [run]);

  /* Visibility gates the clock and the first autoplay. */
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0.2,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const begin = useCallback((next: Run) => {
    setRun(next);
    setField(next.goal);
    setTyped(0);
    setClock(0);
    setSelected(null);
    setPhase("typing");
  }, []);

  /* The board introduces itself once, the first time it scrolls into view. */
  useEffect(() => {
    if (visible && !started) {
      setStarted(true);
      begin(RUNS[0]!);
    }
  }, [visible, started, begin]);

  /* The goal types itself out, then the run starts. */
  useEffect(() => {
    if (phase !== "typing") return;
    if (reducedMotion || typed >= run.goal.length) {
      const hold = window.setTimeout(() => setPhase("running"), reducedMotion ? 0 : 380);
      return () => window.clearTimeout(hold);
    }
    const tick = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    return () => window.clearTimeout(tick);
  }, [phase, typed, run.goal.length, reducedMotion]);

  /* The one clock. */
  useEffect(() => {
    if (phase !== "running" || !visible) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!document.hidden) setClock((c) => c + dt);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, visible]);

  useEffect(() => {
    if (phase === "running" && clock >= length) {
      setClock(length);
      setPhase("waiting");
    }
  }, [clock, length, phase]);

  /* Keep the feed on its newest line — by moving the list, never the page. */
  const shown = useMemo(() => run.steps.filter((step) => step.at <= clock), [run, clock]);
  useEffect(() => {
    const node = feed.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [shown.length, phase, selected]);

  useEffect(() => {
    const node = chatEnd.current?.parentElement;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chats, replying, selected]);

  /* Pointer on the stage, in stage units, for the gaze and the spotlight. */
  const pending = useRef<Point | null>(null);
  const raf = useRef(0);
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * STAGE_W;
    const y = ((event.clientY - box.top) / box.height) * STAGE_H;
    event.currentTarget.style.setProperty("--mx", `${((x / STAGE_W) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--my", `${((y / STAGE_H) * 100).toFixed(1)}%`);
    pending.current = { x, y };
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        setPointer(pending.current);
      });
    }
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const goal = field.trim();
    if (!goal || phase === "typing" || phase === "running") return;
    const preset = RUNS.find((candidate) => candidate.goal.toLowerCase() === goal.toLowerCase());
    begin(preset ?? customRun(goal));
  };

  const decide = (approve: boolean) => {
    setPhase(approve ? "approved" : "declined");
    if (approve) setCheer((n) => n + 1);
  };

  const openChat = (id: AgentId) => {
    setSelected((current) => (current === id ? null : id));
  };

  const send = (event: SubmitEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!selected || !text || replying) return;
    const who = selected;
    setMessage("");
    setChats((all) => ({ ...all, [who]: [...(all[who] ?? []), { id: ++lineId.current, who: "you", text }] }));
    setReplying(who);
    window.setTimeout(() => {
      const turn = replyTurn.current[who] ?? 0;
      replyTurn.current[who] = turn + 1;
      const replies = AGENT[who].replies;
      const reply = replies[turn % replies.length] ?? "";
      setChats((all) => ({ ...all, [who]: [...(all[who] ?? []), { id: ++lineId.current, who, text: reply }] }));
      setReplying(null);
    }, reducedMotion ? 300 : 1300);
  };

  /* --- Per-agent view state --------------------------------------------- */

  const busy = phase === "typing" || phase === "running";
  const view = TEAM.map((agent) => {
    const step = phase === "running" ? activeStep(run.steps, agent.id, clock) : undefined;
    let stage: Stage | null = step?.stage ?? null;
    if (phase === "waiting" && agent.id === "jarvis") stage = "done";
    const working = Boolean(step) || replying === agent.id;
    const mood: Mood = phase === "approved" ? "happy" : working && stage !== "done" ? "working" : "rest";

    let gaze = { x: 0, y: 0 };
    if (pointer && !reducedMotion) {
      const dx = pointer.x - agent.x;
      const dy = pointer.y - agent.y;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 140) * 2.4;
      gaze = { x: (dx / dist) * reach, y: (dy / dist) * reach * 0.8 };
    }

    let pull = { x: 0, y: 0 };
    if (pointer && !reducedMotion) {
      const dx = pointer.x - agent.x;
      const dy = pointer.y - agent.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 110) {
        const k = (1 - dist / 110) * 7;
        pull = { x: (dx / (dist || 1)) * k, y: (dy / (dist || 1)) * k };
      }
    }

    const received = run.steps.find(
      (s) =>
        phase === "running" &&
        s.to === agent.id &&
        clock >= s.at + TRAVEL_MS &&
        clock < s.at + TRAVEL_MS + PULSE_MS,
    );

    return { agent, step, stage, mood, gaze, pull, received };
  });

  const flights =
    phase === "running" && !reducedMotion
      ? run.steps.filter((s) => s.to && s.to !== "you" && s.at <= clock && clock < s.at + TRAVEL_MS)
      : [];

  const bubbles = phase === "running"
    ? TEAM.map((agent) => {
        let latest: Step | undefined;
        for (const s of run.steps) {
          if (s.from === agent.id && s.to !== "you" && s.at <= clock && clock < s.at + BUBBLE_MS) latest = s;
        }
        return latest;
      }).filter((s): s is Step => Boolean(s))
    : [];

  const focus = hovered ?? selected;
  const dimmed = (id: AgentId) => focus !== null && focus !== id;
  const tip = hovered ? AGENT[hovered] : null;

  const progress = Math.min(1, clock / length);
  const lanes = TEAM.map((agent) => ({
    agent,
    steps: run.steps.filter((s) => s.from === agent.id),
  }));

  const chatLog = selected
    ? shown
        .filter((s) => s.to && (s.from === selected || s.to === selected))
        .map((s) => ({ key: `run-${s.at}-${s.from}`, step: s }))
    : [];

  const statusLine =
    phase === "idle"
      ? "Ready"
      : phase === "typing"
        ? "Handing the goal to Jarvis"
        : phase === "running"
          ? `${view.filter((v) => v.step).length} working`
          : phase === "waiting"
            ? "Waiting for you"
            : phase === "approved"
              ? "Approved"
              : "Held — nothing sent";

  return (
    <div ref={root} className="team-board" data-phase={phase} data-reduced={reducedMotion ? "true" : undefined}>
      {/* Title bar: the product window this is a clone of. */}
      <div className="team-board__chrome" aria-hidden="true">
        <span className="team-board__lights"><i /><i /><i /></span>
        <span className="team-board__title">Agents — Personal Jarvis</span>
        <span className="team-board__status"><i data-live={busy ? "true" : undefined} />{statusLine}</span>
      </div>

      <div className="team-board__grid">
        {/* --- Roster ------------------------------------------------------ */}
        <nav className="team-board__roster" aria-label="Agents">
          <p className="team-board__label">Team <span>{TEAM.length}</span></p>
          <ul>
            {view.map(({ agent, stage, mood }) => (
              <li key={agent.id}>
                <button
                  type="button"
                  className="team-row"
                  data-selected={selected === agent.id ? "true" : undefined}
                  data-busy={stage ? "true" : undefined}
                  onClick={() => openChat(agent.id)}
                  onPointerEnter={() => setHovered(agent.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(agent.id)}
                  onBlur={() => setHovered(null)}
                  aria-pressed={selected === agent.id}
                  aria-label={`${agent.name}, ${agent.title}. Open chat.`}
                >
                  <AgentGlyph shape={agent.shape} color={agent.color} size={30} mood={mood} />
                  <span className="team-row__text">
                    <span className="team-row__name">{agent.name}</span>
                    <span className="team-row__sub">
                      {stage ? STAGE_VERB[stage] : replying === agent.id ? "typing" : agent.tier}
                    </span>
                  </span>
                  <span
                    className="team-row__dot"
                    style={stage ? { background: `var(--stage-${stage})` } : undefined}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* --- Goal, stage, timeline -------------------------------------- */}
        <div className="team-board__main">
          <form className="team-goal" onSubmit={submit}>
            <label className="team-goal__field">
              <span className="team-goal__prefix">Goal</span>
              <input
                value={phase === "typing" ? run.goal.slice(0, typed) : field}
                onChange={(e) => setField(e.target.value)}
                readOnly={busy}
                placeholder="Give Jarvis a goal…"
                aria-label="Goal for Jarvis"
                maxLength={120}
              />
              {phase === "typing" && <span className="team-goal__caret" aria-hidden="true" />}
            </label>
            <button type="submit" className="team-goal__send" disabled={busy || !field.trim()}>
              Hand to Jarvis
            </button>
          </form>
          <div className="team-goal__presets" role="group" aria-label="Example goals">
            {RUNS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="team-chip"
                data-active={run.id === preset.id ? "true" : undefined}
                disabled={busy}
                onClick={() => begin(preset)}
              >
                {preset.label}
              </button>
            ))}
            <span className="team-goal__note">Sample run · no model is called on this page</span>
          </div>

          <div
            className="team-stage"
            onPointerMove={onPointerMove}
            onPointerLeave={() => {
              setPointer(null);
              pending.current = null;
            }}
          >
            <svg
              viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
              className="team-stage__svg"
              role="img"
              aria-label="Jarvis in the middle, five specialist agents around it. Messages travel between them as the run progresses."
            >
              {/* Spokes: the lead can reach everyone. */}
              <g className="team-stage__spokes">
                {TEAM.filter((a) => a.id !== "jarvis").map((agent) => (
                  <path
                    key={agent.id}
                    d={arcPath(AGENT.jarvis, agent)}
                    data-lit={focus === agent.id ? "true" : undefined}
                  />
                ))}
              </g>

              {/* Messages in flight: a trail and a packet in the sender's colour. */}
              {flights.map((s) => {
                const a = AGENT[s.from];
                const b = AGENT[s.to as AgentId];
                const c = control(a, b);
                const p = ease(Math.min(1, (clock - s.at) / TRAVEL_MS));
                const tail = Math.max(0, p - 0.32);
                const pts: string[] = [];
                for (let i = 0; i <= 12; i++) {
                  const q = bezier(a, c, b, tail + ((p - tail) * i) / 12);
                  pts.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
                }
                const head = bezier(a, c, b, p);
                const color = `var(${a.color})`;
                return (
                  <g key={`${s.at}-${s.from}-${s.to}`} className="team-flight">
                    <path d={arcPath(a, b)} className="team-flight__route" style={{ stroke: color }} />
                    <polyline points={pts.join(" ")} className="team-flight__trail" style={{ stroke: color }} />
                    <circle cx={head.x} cy={head.y} r={11} className="team-flight__halo" style={{ fill: color }} />
                    <circle cx={head.x} cy={head.y} r={5} style={{ fill: color }} />
                  </g>
                );
              })}

              {/* The agents. */}
              {view.map(({ agent, stage, mood, gaze, pull, received }) => {
                const size = agent.id === "jarvis" ? 92 : 62;
                const scale = size / 40;
                return (
                  <g
                    key={agent.id}
                    className="team-node"
                    data-dim={dimmed(agent.id) ? "true" : undefined}
                    data-mood={mood}
                    transform={`translate(${(agent.x + pull.x).toFixed(1)} ${(agent.y + pull.y).toFixed(1)})`}
                    onPointerEnter={() => setHovered(agent.id)}
                    onPointerLeave={() => setHovered(null)}
                    onClick={() => openChat(agent.id)}
                  >
                    <circle r={size * 0.78} className="team-node__hit" />
                    {stage && (
                      <circle
                        r={size * 0.66}
                        className="team-node__orbit"
                        style={{ stroke: `var(--stage-${stage})` }}
                      />
                    )}
                    {received && (
                      <circle
                        key={`pulse-${received.at}`}
                        r={size * 0.5}
                        className="team-node__pulse"
                        style={{ stroke: `var(${AGENT[received.from].color})` }}
                      />
                    )}
                    {phase === "approved" && (
                      <circle key={`cheer-${cheer}`} r={size * 0.5} className="team-node__pulse team-node__pulse--gold" />
                    )}
                    {selected === agent.id && <circle r={size * 0.72} className="team-node__selected" />}
                    <g className="team-node__bob" style={{ animationDelay: `${(agent.x % 7) * -0.37}s` }}>
                      <g transform={`translate(${-size / 2} ${-size * 0.55}) scale(${scale})`}>
                        <GlyphFace shape={agent.shape} color={agent.color} gaze={gaze} mood={mood} />
                      </g>
                    </g>
                    <text y={size * 0.62 + 22} className="team-node__name">{agent.name}</text>
                    <text y={size * 0.62 + 42} className="team-node__state">
                      {stage ? STAGE_VERB[stage] : replying === agent.id ? "typing…" : "idle"}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Speech bubbles sit in HTML so long lines wrap like text. */}
            <div className="team-stage__overlay" aria-hidden="true">
              {bubbles.map((s) => {
                const a = AGENT[s.from];
                const below = a.y < 150;
                return (
                  <div
                    key={`${s.at}-${s.from}`}
                    className="team-bubble"
                    data-below={below ? "true" : undefined}
                    data-side={a.y > 330 ? (a.x < STAGE_W / 2 ? "left" : "right") : undefined}
                    style={{
                      left: `${(a.x / STAGE_W) * 100}%`,
                      top: `${(a.y / STAGE_H) * 100}%`,
                    }}
                  >
                    {s.to && s.to !== "you" && <span className="team-bubble__to">to {AGENT[s.to].name}</span>}
                    {s.text}
                  </div>
                );
              })}
              {tip && (
                <div
                  className="team-tip"
                  data-below={tip.y < 200 ? "true" : undefined}
                  style={{ left: `${(tip.x / STAGE_W) * 100}%`, top: `${(tip.y / STAGE_H) * 100}%` }}
                >
                  <span className="team-tip__name">{tip.name}</span>
                  <span className="team-tip__title">{tip.title}</span>
                  <span className="team-tip__meta">{tip.runsOn}</span>
                  <span className="team-tip__hint">Click to chat</span>
                </div>
              )}
            </div>
          </div>

          {/* --- Timeline: the one place the stage pastels live ----------- */}
          <div className="team-timeline" aria-label="Timeline of the run">
            <div className="team-timeline__legend" aria-hidden="true">
              {(["thinking", "grep", "read", "edit", "done"] as const).map((s) => (
                <span key={s} className="team-pill" style={{ background: `var(--stage-${s})` }}>
                  {STAGE_LABEL[s]}
                </span>
              ))}
              <span className="team-timeline__clock">{stamp(clock)}</span>
            </div>
            <div className="team-timeline__lanes">
              {lanes.map(({ agent, steps }) => (
                <div key={agent.id} className="team-lane" data-dim={dimmed(agent.id) ? "true" : undefined}>
                  <span className="team-lane__who">
                    <AgentGlyph shape={agent.shape} color={agent.color} size={16} />
                    {agent.name}
                  </span>
                  <span className="team-lane__track">
                    {steps.map((s) => {
                      const left = (s.at / length) * 100;
                      const width = Math.max(0.8, (s.dur / length) * 100);
                      const fill = Math.max(0, Math.min(1, (clock - s.at) / s.dur));
                      return (
                        <span
                          key={`${s.at}-${s.from}`}
                          className="team-lane__bar"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={s.text}
                        >
                          <span
                            className="team-lane__fill"
                            style={{ width: `${fill * 100}%`, background: `var(--stage-${s.stage})` }}
                          />
                        </span>
                      );
                    })}
                  </span>
                </div>
              ))}
              <span className="team-timeline__head" style={{ left: `calc(var(--lane-label) + (100% - var(--lane-label)) * ${progress})` }} />
            </div>
          </div>
        </div>

        {/* --- Feed or chat -------------------------------------------------- */}
        <aside className="team-board__side" aria-label={selected ? `Chat with ${AGENT[selected].name}` : "Team feed"}>
          {selected ? (
            <div className="team-chat">
              <div className="team-side__head">
                <button type="button" className="team-back" onClick={() => setSelected(null)}>
                  <span aria-hidden="true">&#8592;</span> Team feed
                </button>
              </div>
              <div className="team-chat__who">
                <AgentGlyph
                  shape={AGENT[selected].shape}
                  color={AGENT[selected].color}
                  size={40}
                  mood={replying === selected ? "working" : phase === "approved" ? "happy" : "rest"}
                />
                <span>
                  <span className="team-chat__name">{AGENT[selected].name}</span>
                  <span className="team-chat__title">{AGENT[selected].title}</span>
                  <span className="team-chat__meta">{AGENT[selected].runsOn}</span>
                </span>
              </div>
              <div className="team-chat__log" aria-live="polite">
                {chatLog.length === 0 && !(chats[selected]?.length) && (
                  <p className="team-empty">No messages yet. Say something to {AGENT[selected].name} — it answers here and keeps the team in the loop.</p>
                )}
                {chatLog.map(({ key, step }) => (
                  <p key={key} className="team-chat__context">
                    <span>{AGENT[step.from].name} → {step.to === "you" ? "You" : AGENT[step.to as AgentId].name}</span>
                    {step.text}
                  </p>
                ))}
                {(chats[selected] ?? []).map((line) => (
                  <p key={line.id} className="team-chat__line" data-who={line.who === "you" ? "you" : "agent"}>
                    {line.text}
                  </p>
                ))}
                {replying === selected && (
                  <p className="team-chat__line team-chat__typing" data-who="agent" aria-label={`${AGENT[selected].name} is typing`}>
                    <i /><i /><i />
                  </p>
                )}
                <div ref={chatEnd} />
              </div>
              <form className="team-chat__composer" onSubmit={send}>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Message ${AGENT[selected].name}…`}
                  aria-label={`Message ${AGENT[selected].name}`}
                  maxLength={200}
                />
                <button type="submit" disabled={!message.trim() || replying !== null} aria-label="Send">
                  <span aria-hidden="true">&#8593;</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="team-feed">
              <div className="team-side__head">
                <p className="team-board__label">Team feed <span>{shown.length}</span></p>
              </div>
              <div ref={feed} className="team-feed__log" aria-live="polite">
                {shown.length === 0 && (
                  <p className="team-empty">Hand Jarvis a goal. Every message between the agents shows up here.</p>
                )}
                {shown.map((s) => {
                  const from = AGENT[s.from];
                  const isFinal = s.to === "you";
                  return (
                    <div key={`${s.at}-${s.from}`} className="team-entry" data-final={isFinal ? "true" : undefined}>
                      <AgentGlyph shape={from.shape} color={from.color} size={22} />
                      <div className="team-entry__body">
                        <p className="team-entry__head">
                          <span className="team-entry__who">
                            {from.name}
                            {s.to && <> <span aria-hidden="true">→</span> {s.to === "you" ? "You" : AGENT[s.to].name}</>}
                          </span>
                          <span className="team-entry__time">{stamp(s.at)}</span>
                        </p>
                        {!s.to && (
                          <span className="team-pill team-pill--sm" style={{ background: `var(--stage-${s.stage})` }}>
                            {STAGE_LABEL[s.stage]}
                          </span>
                        )}
                        <p className="team-entry__text">{s.text}</p>
                      </div>
                    </div>
                  );
                })}
                {phase === "waiting" && (
                  <div className="team-approval">
                    <p className="team-approval__ask">Jarvis is waiting for your OK.</p>
                    <div className="team-approval__actions">
                      <button type="button" className="team-approve" onClick={() => decide(true)}>Approve</button>
                      <button type="button" className="team-decline" onClick={() => decide(false)}>Not now</button>
                    </div>
                  </div>
                )}
                {(phase === "approved" || phase === "declined") && (
                  <div className="team-entry" data-final="true">
                    <AgentGlyph shape="ghost" color="--ink" size={22} mood={phase === "approved" ? "happy" : "rest"} />
                    <div className="team-entry__body">
                      <p className="team-entry__head"><span className="team-entry__who">Jarvis <span aria-hidden="true">→</span> You</span></p>
                      <p className="team-entry__text">
                        {phase === "approved" ? run.approved : "Okay — nothing is sent. It stays in drafts until you say so."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {(phase === "approved" || phase === "declined") && (
                <div className="team-feed__again">
                  <button type="button" className="team-chip" onClick={() => begin(run)}>
                    Run it again
                  </button>
                  <span>or pick another goal</span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
