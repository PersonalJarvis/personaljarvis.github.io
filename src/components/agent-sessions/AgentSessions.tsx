/**
 * The Agents screen of the desktop app, cloned.
 *
 * Same three columns as the running build — the team rail with the lead's
 * card on top, the conversation, and the Options panel with the agent's live
 * browser, chats and routines — in the app's own greys and type sizes. The
 * team is preconfigured (sessions.ts) and every agent has its own, different
 * conversation built from the parts the real transcript renders.
 *
 * It behaves like the app:
 *   - a chat plays in the first time it is opened: "Thinking…", then the
 *     answer streaming in, then the notices under it;
 *   - the composer works — send a message and the agent answers;
 *   - approval cards wait for a click, and remember it;
 *   - the lead has the Voice | Chat switch, and the voice bar listens;
 *   - the group row opens the split view with both agents side by side.
 *
 * Until the visitor touches it, a cursor walks the team on its own, opening
 * one agent after the other. Any pointer, key or wheel inside the window hands
 * the controls over for good.
 *
 * Nothing calls a model and nothing leaves the page; the window says so.
 * Every clock runs only while the window is on screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { usePrefersReducedMotion } from "@/components/window-demo/Stage";
import gigiUrl from "@/assets/agents/gigi.svg?url";
import { GlyphFace } from "./AgentGlyph";
import { BrowserPreview } from "./BrowserPreview";
import * as I from "./icons";
import { AGENTS, GROUP, ROSTER, TOUR, type Agent, type AgentId, type Block, type Item, type SessionId } from "./sessions";
import "./agent-sessions.css";

/* --- Small pieces -------------------------------------------------------- */

function Avatar({ agent, size }: { agent: Agent; size: number }) {
  if (agent.shape === "ghost") {
    return <img src={gigiUrl} width={size} height={size} alt="" className="as-gigi" draggable={false} />;
  }
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 40 42" width={size} height={size} className="as-avatar">
      <GlyphFace shape={agent.shape} color={agent.color} />
    </svg>
  );
}

function GroupAvatar({ size }: { size: number }) {
  const [a, b] = GROUP.members;
  return (
    <span className="as-group-avatar" style={{ width: size + 8, height: size }}>
      <span style={{ width: size * 0.62 }}><Avatar agent={AGENTS[a]} size={size * 0.62} /></span>
      <span style={{ width: size * 0.62 }}><Avatar agent={AGENTS[b]} size={size * 0.62} /></span>
    </span>
  );
}

/** `code` and **bold**, the two marks the sample answers use. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function blockWords(block: Block): number {
  if ("p" in block) return words(block.p);
  if ("ul" in block) return block.ul.reduce((n, line) => n + words(line), 0);
  if ("table" in block) return 12;
  return 10;
}

function itemWords(item: Item): number {
  return item.k === "reply" ? item.blocks.reduce((n, b) => n + blockWords(b), 0) : 0;
}

function clip(text: string, budget: number): string {
  const parts = text.split(/(\s+)/);
  let seen = 0;
  let out = "";
  for (const part of parts) {
    if (/\S/.test(part)) {
      if (seen >= budget) break;
      seen += 1;
    }
    out += part;
  }
  /* Never leave a mark half open while it streams. */
  if ((out.match(/`/g)?.length ?? 0) % 2) out += "`";
  if ((out.match(/\*\*/g)?.length ?? 0) % 2) out += "**";
  return out;
}

function Blocks({ blocks, budget }: { blocks: readonly Block[]; budget: number }) {
  const out: ReactNode[] = [];
  let left = budget;
  for (let i = 0; i < blocks.length && left > 0; i++) {
    const block = blocks[i]!;
    const need = blockWords(block);
    const whole = left >= need;
    if ("p" in block) {
      out.push(<p key={i}><Inline text={whole ? block.p : clip(block.p, left)} /></p>);
    } else if ("ul" in block) {
      let n = left;
      const lines: string[] = [];
      for (const line of block.ul) {
        if (n <= 0) break;
        const w = words(line);
        lines.push(n >= w ? line : clip(line, n));
        n -= w;
      }
      out.push(<ul key={i}>{lines.map((line, j) => <li key={j}><Inline text={line} /></li>)}</ul>);
    } else if ("table" in block) {
      if (!whole) break;
      const [head, ...rows] = block.table;
      out.push(
        <div key={i} className="as-table">
          <table>
            <thead><tr>{head!.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else {
      if (!whole) break;
      out.push(
        <pre key={i} className="as-code">
          {block.code.split("\n").map((line, j) => (
            <span key={j} data-diff={line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : undefined}>{line}{"\n"}</span>
          ))}
        </pre>,
      );
    }
    left -= need;
  }
  return <>{out}</>;
}

function Thought({ secs, steps, pending }: { secs: string; steps?: readonly string[]; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  if (pending) {
    return <p className="as-thought as-thought--live"><span className="as-shimmer">Thinking…</span></p>;
  }
  return (
    <div className="as-thought-wrap">
      <button type="button" className="as-thought" onClick={() => steps && setOpen((o) => !o)} aria-expanded={steps ? open : undefined}>
        <span className="as-thought__chev" data-open={open ? "true" : undefined}><I.ChevronRight size={12} /></span>
        Thought for {secs}
      </button>
      {open && steps && (
        <ol className="as-trace">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

function Route({ dir, agent, status }: { dir: "from" | "to"; agent: Agent; status?: string }) {
  return (
    <p className="as-route">
      {dir === "from" ? <I.ArrowDownLeft size={13} /> : <I.ArrowUpRight size={13} />}
      <span>{dir === "from" ? "Message from" : "Message to"}</span>
      <Avatar agent={agent} size={15} />
      <span className="as-route__name">{agent.name}</span>
      {status && <span className="as-route__status">· {status}</span>}
      <I.ChevronRight size={12} />
    </p>
  );
}

function Approval({
  item,
  decision,
  onDecide,
}: {
  item: Extract<Item, { k: "approval" }>;
  decision: "yes" | "no" | undefined;
  onDecide: (value: "yes" | "no") => void;
}) {
  if (decision) {
    return (
      <div className="as-approval" data-done="true">
        <p className="as-approval__done">
          <I.Check size={13} /> {decision === "yes" ? item.yes : item.no}
        </p>
        <p className="as-approval__text">{decision === "yes" ? item.afterYes : item.afterNo}</p>
      </div>
    );
  }
  return (
    <div className="as-approval">
      <p className="as-approval__head">
        <span className="as-approval__badge"><I.Sparkle size={11} /> Action needed</span>
      </p>
      <p className="as-approval__text">{item.ask}</p>
      <div className="as-approval__actions">
        <button type="button" className="as-btn as-btn--primary" onClick={() => onDecide("yes")}>{item.yes}</button>
        <button type="button" className="as-btn" onClick={() => onDecide("no")}>{item.no}</button>
      </div>
    </div>
  );
}

function Storyboard() {
  return (
    <div className="as-artifact__frames" aria-hidden="true">
      {["Goal", "Split", "Group chat", "Approve", "Done"].map((label, i) => (
        <span key={label} data-hot={i === 2 ? "true" : undefined}>
          <i />
          <b>{label}</b>
        </span>
      ))}
    </div>
  );
}

/* --- The transcript ------------------------------------------------------ */

interface Progress {
  shown: number;
  words: number;
}

function Transcript({
  agent,
  items,
  progress,
  decisions,
  onDecide,
}: {
  agent: Agent;
  items: readonly Item[];
  progress: Progress;
  decisions: Record<string, "yes" | "no">;
  onDecide: (id: string, value: "yes" | "no") => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const visible = items.slice(0, progress.shown);
  const next = items[progress.shown];

  useEffect(() => {
    const node = root.current;
    if (node && atEnd.current) node.scrollTop = node.scrollHeight;
  }, [progress.shown, progress.words, items.length, decisions]);

  const render = (item: Item, key: number, budget?: number) => {
    switch (item.k) {
      case "stamp":
        return <p key={key} className="as-stamp">{item.text}</p>;
      case "user":
        return <div key={key} className="as-user"><p><Inline text={item.text} /></p></div>;
      case "from":
        return <Route key={key} dir="from" agent={AGENTS[item.agent]} />;
      case "to":
        return <Route key={key} dir="to" agent={AGENTS[item.agent]} status={item.status} />;
      case "thought":
        return <Thought key={key} secs={item.secs} steps={item.steps} />;
      case "reply":
        return (
          <div key={key} className="as-turn">
            <div className="as-answer"><Blocks blocks={item.blocks} budget={budget ?? Infinity} /></div>
            {item.done && budget === undefined && (
              <p className="as-done">
                <I.Check size={13} /> Done <span>{item.done}</span>
                <span className="as-done__details">▸ Details</span>
              </p>
            )}
          </div>
        );
      case "tool":
        return (
          <p key={key} className="as-tool">
            <I.Wrench size={12} /> Used <code>{item.text}</code>
          </p>
        );
      case "memory":
        return (
          <p key={key} className="as-chip">
            <I.FileText size={13} /> Memory updated · {item.file} <I.ChevronRight size={12} />
          </p>
        );
      case "artifact":
        return (
          <div key={key} className="as-artifact">
            <div className="as-artifact__head">
              <I.Layers size={14} />
              <span className="as-artifact__title">{item.title}</span>
              <span className="as-artifact__meta">{item.meta}</span>
            </div>
            <Storyboard />
          </div>
        );
      case "routine":
        return (
          <p key={key} className="as-routine">
            <I.Clock size={13} /> Routine · <strong>{item.title}</strong> <span>{item.schedule}</span>
          </p>
        );
      case "approval":
        return <Approval key={key} item={item} decision={decisions[item.id]} onDecide={(v) => onDecide(item.id, v)} />;
    }
  };

  return (
    <div
      ref={root}
      className="as-transcript"
      onScroll={(e) => {
        const n = e.currentTarget;
        atEnd.current = n.scrollHeight - n.scrollTop - n.clientHeight < 40;
      }}
    >
      <div className="as-measure">
        {items.length === 0 && (
          <div className="as-empty">
            <Avatar agent={agent} size={56} />
            <p className="as-empty__title">Talk to {agent.name}</p>
            <p className="as-empty__hint">Type, speak, or tag an agent, plugin or tool with @ — e.g. @gmail.</p>
          </div>
        )}
        {visible.map((item, i) => render(item, i))}
        {next?.k === "thought" && <Thought key="pending" secs={next.secs} pending />}
        {next?.k === "reply" && progress.words > 0 && render(next, visible.length, progress.words)}
      </div>
    </div>
  );
}

/* --- Composer ------------------------------------------------------------- */

function Composer({
  agent,
  onSend,
  busy,
}: {
  agent: Agent;
  onSend: (text: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    onSend(value);
  };
  return (
    <form className="as-composer" onSubmit={submit}>
      <button type="button" className="as-iconbtn" tabIndex={-1} aria-hidden="true"><I.Plus size={16} /></button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Message ${agent.name}`}
        aria-label={`Message ${agent.name}`}
        maxLength={240}
      />
      <span className="as-modelchip" aria-hidden="true">
        <span className="as-modelchip__mark"><I.Sparkle size={11} /></span>
        {agent.model.chip}
        <I.ChevronDown size={12} />
      </span>
      <span className="as-iconbtn" aria-hidden="true"><I.Mic size={15} /></span>
      <button type="submit" className="as-send" data-ready={text.trim() && !busy ? "true" : undefined} aria-label="Send">
        <I.Send size={14} />
      </button>
    </form>
  );
}

/* --- Voice (the lead's card) ---------------------------------------------- */

type VoiceState = "ready" | "listening" | "speaking";

function VoiceStage({ reduced }: { reduced: boolean }) {
  const [state, setState] = useState<VoiceState>("ready");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  useEffect(() => {
    if (state === "ready") return;
    const t = window.setTimeout(() => setState(state === "listening" ? "speaking" : "ready"), state === "listening" ? 2400 : 4200);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <div className="as-voice" data-state={state}>
      <div className="as-voice__hello">
        <img src={gigiUrl} width={34} height={34} alt="" className="as-gigi as-voice__mark" />
        <h3>{greeting}</h3>
      </div>
      <p className="as-voice__sub">Say your wake word or tap the bar — the conversation shows up here.</p>
      <button
        type="button"
        className="as-voicebar"
        onClick={() => setState((s) => (s === "ready" ? "listening" : s))}
        aria-label="Talk to Jarvis"
      >
        <span className="as-voicebar__dots" aria-hidden="true">
          {Array.from({ length: 44 }, (_, i) => (
            <i key={i} style={{ animationDelay: reduced ? undefined : `${(i % 11) * -0.09}s` }} />
          ))}
        </span>
        <span className="as-voicebar__status">
          <span className="as-voicebar__dot" />
          <span className="as-mono">{state === "ready" ? "READY" : state === "listening" ? "LISTENING" : "SPEAKING"}</span>
          <span className="as-voicebar__hint">
            {state === "ready"
              ? "Say “Hey Jarvis” or tap the bar to start"
              : state === "listening"
                ? "“Hey Jarvis, how is the launch going?”"
                : "Copy is done, the clip renders tonight, and three posts wait for your OK."}
          </span>
          <span className="as-voicebar__model"><I.Sparkle size={12} /> Prompt <b>Realtime voice</b></span>
        </span>
      </button>
    </div>
  );
}

/* --- Options panel ------------------------------------------------------- */

function Options({ agent }: { agent: Agent }) {
  return (
    <aside className="as-options" aria-label="Options">
      <div className="as-options__head">
        <span>Options</span>
        <I.More size={16} />
      </div>
      <div className="as-options__body">
        <span className="as-outline-btn">Character &amp; companion</span>
        <p className="as-options__live">
          <span>{agent.name} · <em data-live={agent.live ? "true" : undefined}>{agent.live ? "Live" : "Idle"}</em></span>
          <I.Expand size={13} />
        </p>
        <BrowserPreview kind={agent.preview} url={agent.url} live={agent.live} />
        <p className="as-options__take">{agent.live ? "Take control / sign in" : "Opens when the agent browses"}</p>

        <p className="as-options__label">Chats <span>{agent.chats.length}</span><I.Plus size={14} /></p>
        <ul className="as-options__list">
          {agent.chats.map(([title, date]) => (
            <li key={title}><I.Chat size={13} /><span>{title}</span><time>{date}</time></li>
          ))}
        </ul>

        <p className="as-options__label">Routines<I.Plus size={14} /></p>
        {agent.routines.length === 0 ? (
          <p className="as-options__none">No routines yet.</p>
        ) : (
          <ul className="as-options__list">
            {agent.routines.map(([title, when]) => (
              <li key={title}><I.Clock size={13} /><span>{title}</span><time>{when}</time></li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/* --- The window ------------------------------------------------------------- */

const START: Record<AgentId, Item[]> = Object.fromEntries(
  Object.values(AGENTS).map((a) => [a.id, [...a.items]]),
) as Record<AgentId, Item[]>;

function paneIds(session: SessionId): AgentId[] {
  return session === "group" ? [...GROUP.members] : [session];
}

export default function AgentSessions() {
  const reduced = usePrefersReducedMotion();
  const win = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<SessionId>("jarvis");
  const [convos, setConvos] = useState<Record<AgentId, Item[]>>(START);
  const [progress, setProgress] = useState<Partial<Record<AgentId, Progress>>>({});
  const [decisions, setDecisions] = useState<Record<string, "yes" | "no">>({});
  const [leadMode, setLeadMode] = useState<"chat" | "voice">("chat");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const [touring, setTouring] = useState(true);
  const [cursor, setCursor] = useState<{ x: number; y: number; press: boolean } | null>(null);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const waitUntil = useRef<Partial<Record<AgentId, number>>>({});
  const replyTurn = useRef<Partial<Record<AgentId, number>>>({});
  const convosRef = useRef(convos);
  convosRef.current = convos;

  useEffect(() => {
    const node = win.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* Opening a chat for the first time starts its playback. */
  const active = useMemo(() => paneIds(session), [session]);
  useEffect(() => {
    setProgress((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of active) {
        if (!next[id]) {
          next[id] = reduced ? { shown: convosRef.current[id].length, words: 0 } : { shown: 0, words: 0 };
          waitUntil.current[id] = performance.now() + 250;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [active, reduced]);

  /* The playback clock: reveals items, holds thoughts, streams answers. */
  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      setProgress((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of active) {
          const p = next[id];
          const items = convosRef.current[id];
          if (!p || p.shown >= items.length) continue;
          if (now < (waitUntil.current[id] ?? 0)) continue;
          const item = items[p.shown]!;
          if (item.k === "reply" && p.words < itemWords(item)) {
            next[id] = { shown: p.shown, words: p.words + 3 };
          } else {
            const upcoming = items[p.shown + 1];
            waitUntil.current[id] =
              now + (upcoming?.k === "thought" ? 1300 : upcoming?.k === "reply" ? 200 : upcoming ? 420 : 0);
            next[id] = { shown: p.shown + 1, words: 0 };
          }
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [active, visible]);

  const complete = active.every((id) => (progress[id]?.shown ?? 0) >= convos[id].length);

  /* The self-running tour, until the visitor takes over. */
  const stopTour = useCallback(() => {
    setTouring(false);
    setCursor(null);
  }, []);

  useEffect(() => {
    if (!touring || !visible || reduced || !complete) return;
    const index = TOUR.indexOf(session);
    const target = TOUR[(index + 1) % TOUR.length]!;
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        const root = win.current;
        const row = root?.querySelector<HTMLElement>(`[data-session="${target}"]`);
        const list = rail.current;
        if (!root || !row) return;
        if (list) {
          const top = row.offsetTop - list.offsetTop;
          if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTo({ top: Math.max(0, top - 80), behavior: "smooth" });
          }
        }
        /* The first time, the cursor appears over the conversation instead
           of flying in from the window's corner. */
        const box = root.getBoundingClientRect();
        const lead = cursorRef.current ? 0 : 260;
        if (!cursorRef.current) setCursor({ x: box.width * 0.55, y: box.height * 0.6, press: false });
        timers.push(
          window.setTimeout(() => {
            const r = row.getBoundingClientRect();
            setCursor({ x: r.left - box.left + Math.min(56, r.width / 2), y: r.top - box.top + r.height / 2, press: false });
            timers.push(window.setTimeout(() => setCursor((c) => (c ? { ...c, press: true } : c)), 950));
            timers.push(
              window.setTimeout(() => {
                setCursor((c) => (c ? { ...c, press: false } : c));
                setSession(target);
              }, 1150),
            );
          }, 350 + lead),
        );
      }, 3600),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [touring, visible, reduced, complete, session]);

  const takeOver = () => {
    if (touring) stopTour();
  };

  const send = (id: AgentId, text: string) => {
    const turn = replyTurn.current[id] ?? 0;
    replyTurn.current[id] = turn + 1;
    const replies = AGENTS[id].replies;
    const reply = replies[turn % replies.length] ?? "";
    setConvos((all) => ({
      ...all,
      [id]: [
        ...all[id],
        { k: "user", text },
        { k: "thought", secs: `${2 + (turn % 3)}s` },
        { k: "reply", blocks: [{ p: reply }], done: `${2 + (turn % 3)}s` },
      ],
    }));
    setProgress((prev) => {
      const p = prev[id] ?? { shown: 0, words: 0 };
      return { ...prev, [id]: { shown: Math.max(p.shown, convosRef.current[id].length), words: 0 } };
    });
    waitUntil.current[id] = performance.now() + 150;
  };

  const decide = (id: string, value: "yes" | "no") => setDecisions((d) => ({ ...d, [id]: value }));

  const q = query.trim().toLowerCase();
  const roster = ROSTER.map((id) => AGENTS[id]).filter(
    (a) => !q || a.name.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
  );
  const showGroup = !q || GROUP.name.toLowerCase().includes(q);

  const busy = (id: AgentId) => (progress[id]?.shown ?? 0) < convos[id].length;
  const optionsAgent = AGENTS[session === "group" ? GROUP.members[0] : session];

  const pane = (id: AgentId, side?: "LEFT CHAT" | "RIGHT CHAT") => {
    const agent = AGENTS[id];
    return (
      <section key={id} className="as-pane" aria-label={`Chat with ${agent.name}`}>
        {side ? (
          <header className="as-pane__head as-pane__head--group">
            <Avatar agent={agent} size={34} />
            <span className="as-pane__who">
              <span className="as-pane__side">{side}</span>
              <span className="as-pane__name">{agent.name}</span>
              <span className="as-pane__title">{agent.title}</span>
            </span>
            <button type="button" className="as-link" onClick={() => setSession(id)}>Open</button>
          </header>
        ) : id === "jarvis" ? (
          /* Only the lead's card has a header, exactly as JarvisChat draws it:
             model on the left, Voice | Chat in the middle, new chat on the
             right. In voice mode the left cell is the voice-brain note. The
             other agents have no header at all — transcript and composer. */
          <header className="as-pane__head as-pane__head--lead">
            <span className="as-pane__cell">
              {leadMode === "voice" ? (
                <span className="as-voicenote">Voice runs on Jarvis' voice brain, not on the model picked for the typed chat.</span>
              ) : (
                <span className="as-provider">
                  <span className="as-provider__mark"><I.Sparkle size={12} /></span>
                  {agent.model.provider}
                  <span className="as-mono as-provider__default">provider default</span>
                </span>
              )}
            </span>
            <span className="as-seg" role="tablist" aria-label="Voice or chat">
              <button type="button" role="tab" aria-selected={leadMode === "voice"} data-on={leadMode === "voice" ? "true" : undefined} onClick={() => setLeadMode("voice")}>
                <I.Mic size={12} /> Voice
              </button>
              <button type="button" role="tab" aria-selected={leadMode === "chat"} data-on={leadMode === "chat" ? "true" : undefined} onClick={() => setLeadMode("chat")}>
                <I.Chat size={12} /> Chat
              </button>
            </span>
            <span className="as-pane__cell as-pane__cell--end">
              {leadMode === "chat" && <span className="as-iconbtn" aria-hidden="true"><I.Refresh size={14} /></span>}
            </span>
          </header>
        ) : null}
        {id === "jarvis" && leadMode === "voice" && !side ? (
          <VoiceStage reduced={reduced} />
        ) : (
          <>
            <Transcript
              agent={agent}
              items={convos[id]}
              progress={progress[id] ?? { shown: 0, words: 0 }}
              decisions={decisions}
              onDecide={decide}
            />
            {side && <p className="as-buildmode">Build mode</p>}
            <Composer agent={agent} busy={busy(id)} onSend={(t) => send(id, t)} />
          </>
        )}
      </section>
    );
  };

  return (
    <div
      ref={win}
      className="as-window"
      onPointerDown={takeOver}
      onKeyDown={takeOver}
      onWheel={takeOver}
      onTouchStart={takeOver}
    >
      {/* Title bar: the app's own, frameless. */}
      <div className="as-topbar">
        <span className="as-topbar__left" aria-hidden="true">
          <I.PanelLeft size={15} />
          <I.ArrowLeft size={15} />
          <I.ArrowRight size={15} />
        </span>
        <span className="as-topbar__center">
          <span className="as-tabs" aria-hidden="true">
            <span>Map</span>
            <span data-on="true">Agents</span>
          </span>
          <span className="as-station" aria-hidden="true">Communications station</span>
        </span>
        <span className="as-topbar__right">
          <span className="as-sample">Sample data · no model is called</span>
          <I.Sun size={15} />
          <I.Refresh size={15} />
        </span>
      </div>

      <div className="as-body" data-group={session === "group" ? "true" : undefined}>
        {/* --- The team rail ----------------------------------------------- */}
        <nav className="as-rail" aria-label="Agents">
          <div className="as-rail__head">
            <span className="as-rail__title">Agents</span>
            <span className="as-rail__actions" aria-hidden="true">
              <span className="as-square"><I.Users size={15} /></span>
              <span className="as-new"><I.Plus size={14} /> New</span>
            </span>
          </div>
          <label className="as-search">
            <I.Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents" aria-label="Search agents" />
          </label>
          <div ref={rail} className="as-rail__list">
            <button
              type="button"
              className="as-lead"
              data-session="jarvis"
              data-on={session === "jarvis" ? "true" : undefined}
              onClick={() => setSession("jarvis")}
            >
              <img src={gigiUrl} width={50} height={50} alt="" className="as-gigi" draggable={false} />
              <span className="as-lead__name">Jarvis <span className="as-lead__tag">Lead</span></span>
            </button>
            <span className="as-rail__rule" />
            {showGroup && (
              <button
                type="button"
                className="as-row"
                data-session="group"
                data-on={session === "group" ? "true" : undefined}
                onClick={() => setSession("group")}
              >
                <GroupAvatar size={34} />
                <span className="as-row__text">
                  <span className="as-row__name">{GROUP.name}</span>
                  <span className="as-row__sub">{GROUP.members.map((m) => AGENTS[m].name).join(", ")}</span>
                </span>
              </button>
            )}
            {roster.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className="as-row"
                data-session={agent.id}
                data-on={session === agent.id ? "true" : undefined}
                onClick={() => setSession(agent.id)}
              >
                <Avatar agent={agent} size={36} />
                <span className="as-row__text">
                  <span className="as-row__name">{agent.name}</span>
                  <span className="as-row__sub">{agent.title}</span>
                </span>
                <span className="as-row__dot" data-live={busy(agent.id) && progress[agent.id] ? "true" : undefined} aria-hidden="true" />
              </button>
            ))}
            {roster.length === 0 && !showGroup && <p className="as-rail__none">No agent matches “{query}”.</p>}
          </div>
        </nav>

        {/* --- Conversation ------------------------------------------------ */}
        <div className="as-main">
          {session === "group" ? (
            <div className="as-split">
              {pane(GROUP.members[0], "LEFT CHAT")}
              {pane(GROUP.members[1], "RIGHT CHAT")}
            </div>
          ) : (
            pane(session)
          )}
        </div>

        {/* --- Options ------------------------------------------------------ */}
        <Options agent={optionsAgent} />
      </div>

      {cursor && (
        <span
          className="as-cursor"
          data-press={cursor.press ? "true" : undefined}
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 2.5 19.5 12l-6.8 1.6L9.4 20z" /></svg>
        </span>
      )}
    </div>
  );
}
