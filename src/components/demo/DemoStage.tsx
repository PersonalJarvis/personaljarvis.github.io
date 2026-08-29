import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BYLINE,
  LIVE_TURN,
  PAST_TURN,
  SCRIPT,
  WAVEFORM,
  type Frame,
  type ToolRow,
  type Turn,
} from "./demoScript";

/**
 * The hero's demo stage — two windows of the real app, rebuilt in DOM.
 *
 * Everything inside the stage is laid out at a fixed 1440x900 and scaled with a
 * ResizeObserver, so the mockup behaves like a screenshot: identical
 * proportions at every viewport instead of reflowing into a different design.
 * That is why there is no responsive styling below this line and every size is
 * in px (docs/hero.md, "Scaling").
 *
 * The chat mirrors the app's own timeline doctrine: one container per turn,
 * the person's line in a quiet bubble on the right, the assistant flush left
 * under a byline, thinking as a readable scratchpad where it happened, tool
 * calls as plain rows, and a visible turn state at all times.
 */

const STAGE_W = 1440;
const STAGE_H = 900;

const STAGE_COLORS = {
  bg: "var(--app-bg)",
  card: "var(--app-card)",
  muted: "var(--app-muted)",
  fg: "var(--app-fg)",
  dim: "var(--app-fg-muted)",
  border: "var(--app-border)",
} as const;

const STAGE_PILL: Record<ToolRow["stage"], string> = {
  read: "var(--stage-read)",
  grep: "var(--stage-grep)",
  edit: "var(--stage-edit)",
  done: "var(--stage-done)",
};

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
 * Scale factor so the fixed stage fills whatever width it is given.
 *
 * Measured in a layout effect BEFORE paint, so the stage never shows one frame
 * at the wrong size, and re-measured by a ResizeObserver afterwards. The
 * initial read matters on its own: an observer that only fires on later
 * changes leaves the stage at scale 1, which crops the 1440px design to
 * whatever the container happens to be.
 */
function useStageScale(ref: { current: HTMLDivElement | null }): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / STAGE_W);
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
function useTypewriter(full: string, active: boolean, reduced: boolean): string {
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
    }, 24);
    return () => clearInterval(id);
  }, [full, active, reduced]);
  return active ? shown : "";
}

// ---------------------------------------------------------------------------
// Chat pieces
// ---------------------------------------------------------------------------

/** The person's line — a quiet bubble on the right. */
function SaidBubble({ text, spoken }: { text: string; spoken?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
      <div
        style={{
          maxWidth: 520,
          background: STAGE_COLORS.muted,
          color: STAGE_COLORS.fg,
          borderRadius: 14,
          padding: "10px 14px",
          fontSize: 15,
          lineHeight: 1.45,
        }}
      >
        {spoken && (
          <span style={{ color: STAGE_COLORS.dim, fontSize: 12, marginRight: 8 }}>spoken</span>
        )}
        {text}
      </div>
    </div>
  );
}

/** Who answered: the model and the effort it ran at. */
function Byline() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        fontSize: 13,
        color: STAGE_COLORS.dim,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: STAGE_COLORS.fg,
          color: STAGE_COLORS.bg,
          fontSize: 11,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        J
      </span>
      <span style={{ color: STAGE_COLORS.fg, fontWeight: 500 }}>{BYLINE.model}</span>
      <span>·</span>
      <span>{BYLINE.effort} effort</span>
    </div>
  );
}

/**
 * The thinking, readable — open while it runs, folded to a two-line preview
 * once the turn is done. The app folds it exactly this way, because a finished
 * conversation should read as its answer.
 */
function Scratchpad({
  turn,
  live,
  reduced,
}: {
  turn: Turn;
  live: boolean;
  reduced: boolean;
}) {
  const streamed = useTypewriter(turn.thought, live && !reduced, reduced);
  const body = live ? streamed : turn.thought;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: STAGE_COLORS.dim,
          marginBottom: live ? 8 : 6,
        }}
      >
        <span style={{ display: "inline-block", transform: live ? "none" : "rotate(90deg)" }}>
          ›
        </span>
        <span style={live ? { color: STAGE_COLORS.fg } : undefined}>
          {live ? `Thinking for ${turn.thoughtSeconds}s` : `Thought for ${turn.thoughtSeconds}s`}
        </span>
        {live && <span style={{ fontSize: 12 }}>· esc to interrupt</span>}
      </div>
      <div
        style={{
          borderLeft: `1px solid ${STAGE_COLORS.border}`,
          paddingLeft: 14,
          fontSize: 14,
          lineHeight: 1.55,
          color: STAGE_COLORS.dim,
          maxHeight: live ? 96 : 44,
          overflow: "hidden",
        }}
      >
        {body}
      </div>
    </div>
  );
}

/** One tool call: a row, never a box of its own. */
function ToolLine({ row }: { row: ToolRow }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 0",
        fontSize: 13.5,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: STAGE_PILL[row.stage],
          flexShrink: 0,
        }}
      />
      <span style={{ color: STAGE_COLORS.fg, fontFamily: "var(--font-mono)", fontSize: 13 }}>
        {row.name}
      </span>
      <span style={{ color: STAGE_COLORS.dim }}>{row.detail}</span>
    </div>
  );
}

/** The turn always says which state it is in — running, or finished. */
function TurnState({ frame, turn }: { frame: Frame; turn: Turn }) {
  const running = frame.phase !== "done";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        fontSize: 12.5,
        color: STAGE_COLORS.dim,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: running ? STAGE_COLORS.fg : "var(--success)",
        }}
      />
      <span>{running ? "Composing" : "Done"}</span>
      <span>·</span>
      <span>{turn.elapsed}</span>
      <span>·</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>↓ {turn.outTokens} tokens</span>
    </div>
  );
}

function AssistantTurn({
  turn,
  frame,
  reduced,
}: {
  turn: Turn;
  frame: Frame;
  reduced: boolean;
}) {
  const thinking = frame.phase === "thinking";
  const showThought = frame.phase !== "spoken";
  const answer = useTypewriter(turn.answer, frame.answer > 0 && !reduced, reduced);
  const answerText = frame.answer > 0 ? (reduced ? turn.answer : answer) : "";

  return (
    <div style={{ marginBottom: 24 }}>
      <Byline />
      {showThought && <Scratchpad turn={turn} live={thinking} reduced={reduced} />}
      {turn.tools.slice(0, frame.tools).map((row) => (
        <ToolLine key={row.name} row={row} />
      ))}
      {answerText && (
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            lineHeight: 1.6,
            color: STAGE_COLORS.fg,
            maxWidth: 620,
          }}
        >
          {answerText}
        </p>
      )}
      <TurnState frame={frame} turn={turn} />
    </div>
  );
}

const DONE_FRAME: Frame = { phase: "done", tools: 99, answer: 1, duration: 0 };

/** The main window: the chat, mid-conversation. */
function ChatWindow({ frame, reduced }: { frame: Frame; reduced: boolean }) {
  return (
    <>
      <WindowChrome title="Personal Jarvis — Chat" />
      <div style={{ display: "flex", height: 604 }}>
        <aside
          style={{
            width: 190,
            borderRight: `1px solid ${STAGE_COLORS.border}`,
            padding: "14px 12px",
            fontSize: 12.5,
            color: STAGE_COLORS.dim,
          }}
        >
          <div style={{ color: STAGE_COLORS.fg, fontSize: 13, marginBottom: 12 }}>Chats</div>
          {["This morning", "Invoices, Kessler", "Trip to Lisbon", "Standup notes"].map(
            (label, i) => (
              <div
                key={label}
                style={{
                  padding: "6px 8px",
                  borderRadius: 7,
                  marginBottom: 2,
                  background: i === 0 ? STAGE_COLORS.muted : "transparent",
                  color: i === 0 ? STAGE_COLORS.fg : STAGE_COLORS.dim,
                }}
              >
                {label}
              </div>
            ),
          )}
        </aside>

        <div style={{ flex: 1, padding: "22px 28px", overflow: "hidden" }}>
          <SaidBubble text={PAST_TURN.said} spoken />
          <AssistantTurn turn={PAST_TURN} frame={DONE_FRAME} reduced />
          <SaidBubble text={LIVE_TURN.said} spoken />
          <AssistantTurn turn={LIVE_TURN} frame={frame} reduced={reduced} />
        </div>
      </div>
    </>
  );
}

/** The second window: what the microphone heard, and what it became. */
function VoiceWindow({ frame, reduced }: { frame: Frame; reduced: boolean }) {
  const listening = frame.phase === "spoken";
  const transcript = useTypewriter(LIVE_TURN.said, listening && !reduced, reduced);
  const shown = listening ? (reduced ? LIVE_TURN.said : transcript) : LIVE_TURN.said;

  return (
    <>
      <WindowChrome title="Voice" />
      <div style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: listening ? "var(--stage-thinking)" : STAGE_COLORS.dim,
            }}
          />
          <span style={{ fontSize: 13, color: STAGE_COLORS.dim }}>
            {listening ? "Listening" : "Heard you"}
          </span>
        </div>

        {/* A fixed amplitude array — no microphone is ever opened. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            height: 56,
            marginBottom: 18,
          }}
        >
          {WAVEFORM.map((amp, i) => (
            <span
              key={i}
              style={{
                display: "block",
                width: 3,
                borderRadius: 999,
                height: Math.max(4, amp * (listening ? 56 : 22)),
                background: listening ? STAGE_COLORS.fg : STAGE_COLORS.border,
                transition: reduced ? "none" : "height 240ms ease",
              }}
            />
          ))}
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.5, color: STAGE_COLORS.fg, minHeight: 66 }}>
          {shown}
        </p>
      </div>
    </>
  );
}

/** Title bar: three dots left, the title centred. */
function WindowChrome({ title }: { title: string }) {
  return (
    <div
      style={{
        height: 38,
        borderBottom: `1px solid ${STAGE_COLORS.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ width: 8, height: 8, borderRadius: 999, background: STAGE_COLORS.border }}
          />
        ))}
      </div>
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 12.5,
          color: STAGE_COLORS.dim,
          pointerEvents: "none",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function DemoStage({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scale = useStageScale(wrap);
  const reduced = usePrefersReducedMotion();

  const [step, setStep] = useState(0);
  const [tookOver, setTookOver] = useState(false);
  const [front, setFront] = useState<"chat" | "voice">("voice");

  // Autoplay, and it stops for good on the first click — otherwise the demo
  // moves out from under the visitor's hand.
  useEffect(() => {
    if (tookOver || reduced) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].duration);
    return () => clearTimeout(t);
  }, [step, tookOver, reduced]);

  const frame = useMemo<Frame>(
    () => (reduced ? SCRIPT[SCRIPT.length - 1] : SCRIPT[step]),
    [reduced, step],
  );

  const takeOver = (which: "chat" | "voice") => {
    setTookOver(true);
    setFront(which);
  };

  const shell = (which: "chat" | "voice"): React.CSSProperties => ({
    position: "absolute",
    background: STAGE_COLORS.card,
    border: `1px solid ${STAGE_COLORS.border}`,
    borderRadius: 16,
    overflow: "hidden",
    color: STAGE_COLORS.fg,
    fontFamily: "var(--font-sans)",
    zIndex: front === which ? 20 : 10,
    opacity: front === which ? 1 : 0.85,
    transition: reduced ? "none" : "opacity 200ms ease",
  });

  return (
    <div className={className}>
      <div
        ref={wrap}
        // overflow hidden here, not only on an ancestor: until the first
        // measurement lands the inner board is 1440px wide at scale 1, which
        // otherwise pushes the page into horizontal overflow on a narrow screen.
        style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", overflow: "hidden" }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE_W,
            height: STAGE_H,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            background: STAGE_COLORS.bg,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Main window: centred, 78% of the stage. */}
          <div
            style={{
              ...shell("chat"),
              left: "6%",
              top: "5%",
              width: "78%",
              cursor: "default",
            }}
            onClick={() => takeOver("chat")}
            tabIndex={-1}
          >
            <ChatWindow frame={frame} reduced={reduced} />
          </div>

          {/* Voice window: offset lower right, overlapping the main one. */}
          <div
            style={{
              ...shell("voice"),
              // Overlaps the main window by about a quarter of its width — the
              // overlap is what makes the pair read as depth rather than as
              // two tiles side by side.
              left: "64%",
              top: "48%",
              width: "34%",
              cursor: "default",
            }}
            onClick={() => takeOver("voice")}
            tabIndex={-1}
          >
            <VoiceWindow frame={frame} reduced={reduced} />
          </div>
        </div>
      </div>

      <p className="sr-only">
        Interactive demo with two windows. In the chat, the person asks what they
        missed in their mail; the assistant reads two threads and answers. Then
        they say “move the standup to three and tell the team why”, and the
        assistant checks the calendar, finds everyone free at 15:00, moves the
        meeting and drafts a note. The second window shows the voice panel that
        heard the request.
      </p>
    </div>
  );
}
