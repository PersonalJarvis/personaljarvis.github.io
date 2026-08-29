import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import jarvisLogo from "@/assets/jarvis-logo.png?url";
import { AnthropicMark } from "@/components/logos/AnthropicMark";
import { GeminiMark } from "@/components/logos/GeminiMark";
import {
  CHAT_ENGINE,
  VOICE_ENGINE,
  WAKE_PHRASE,
  WAVEFORM,
  scriptFor,
  turnsFor,
  type Frame,
  type Phase,
  type Step,
  type Surface,
  type Turn,
} from "./demoScript";
import "./demo-stage.css";

/**
 * The hero's demo stage — the app's front page, rebuilt in DOM.
 *
 * ONE window, because the product is one window. The app's front page is a
 * single section with a single `Voice | Chat` switch at the top of its
 * sidebar; the two halves talk to the same assistant and share one history
 * (the app's `lib/homeSurface.ts` says exactly that). Two floating windows
 * would have been a nicer picture and a false one.
 *
 * The switch in the sidebar is the one live control on the page, and it is
 * the point: click it and the other rerun plays — the same assistant, the
 * other way in. Everything else inside the window is real markup that does
 * nothing, the way a screenshot does nothing.
 *
 * Everything is laid out at a fixed 1440x900 and scaled with a
 * ResizeObserver, so the mockup behaves like a screenshot: identical
 * proportions at every viewport instead of reflowing into a different design.
 * That is why there is no responsive styling below this line and every size is
 * in px (docs/hero.md, "Scaling").
 *
 * Fidelity, and where it deliberately stops: the layout, the type roles and
 * the states are the app's. The content is SHORTER — the hero is read from
 * three metres away, not at working distance, so two turns stand in for a day.
 *
 * The sidebar is the exception. It carries the app's WHOLE section list, in
 * the app's order and grouping, and lets it run past the bottom edge under a
 * fade. A shortened list left half the sidebar empty, which read as an app
 * with five sections and a rendering bug rather than as a demo (maintainer,
 * 2026-08-29). The app's own sidebar scrolls here; the fade is how a clipped
 * list says the same thing.
 */

const CHROME_H = 40;
const BODY_H = 596;

/**
 * The stage, in design pixels: the window plus the air around it, and nothing
 * else. It is sized to its content rather than to a screen shape, because the
 * frame it is dropped into no longer has a fixed ratio — the hero gives the
 * stage row whatever height is left over (src/sections/Hero.astro), and a
 * stage with a baked-in 16:10 would either overflow that or leave a dead band
 * under the window.
 *
 * The stage paints NOTHING. The window is the only opaque thing here, so
 * whatever the hero puts behind the demo — today a backdrop image — shows
 * through the air around it.
 *
 * The air is the only thing that decides how big the window comes out, because
 * the scale fits the whole stage into the frame: less air, bigger window. It
 * was 144/90, which put the window at 80% of the frame's width; the maintainer
 * marked up the size they wanted on 2026-08-29 and it measures ~90%, so the
 * air is 64/48 now. Keep the two numbers close to that ratio — the stage has
 * to stay a touch wider than the frame it lands in, or the fit switches to the
 * height axis and the window stops growing with the page.
 */
const WINDOW_W = 1152;
const WINDOW_H = CHROME_H + BODY_H;
const WINDOW_X = 64;
const WINDOW_Y = 48;
const STAGE_W = WINDOW_X * 2 + WINDOW_W;
const STAGE_H = WINDOW_Y * 2 + WINDOW_H;
const SIDEBAR_W = 244;
const HEADER_H = 44;
/** The app's centred reading column, at this window's scale. */
const COLUMN_W = 700;
const COLUMN_PAD = 26;

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
} as const;

/** A token at partial strength — the app leans on `/60`-style opacities. */
function soft(token: string, percent: number): string {
  return `color-mix(in srgb, ${token} ${percent}%, transparent)`;
}

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
 * a short frame — the composer and the Jarvis bar, which are the two things
 * worth seeing. Fitting both axes shrinks the whole window instead, which is
 * what a screenshot does when the wall gets smaller.
 *
 * Measured in a layout effect BEFORE paint, so the stage never shows one frame
 * at the wrong size, and re-measured by a ResizeObserver afterwards. The
 * initial read matters on its own: an observer that only fires on later
 * changes leaves the stage at scale 1, which crops the design to whatever the
 * container happens to be.
 */
function useStageScale(ref: { current: HTMLDivElement | null }): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0) return;
      // A box with no height of its own (the wrapper falls back to its aspect
      // ratio) reports one anyway; the guard is for the frame that has not
      // been laid out yet.
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
    }, 22);
    return () => clearInterval(id);
  }, [full, active, reduced]);
  return active ? shown : "";
}

/**
 * "Good morning" — the greeting the app opens with, from the machine's clock.
 *
 * Resolved AFTER mount on purpose. This island is server-rendered too, and a
 * time-dependent first render would disagree with the server's; starting on
 * the morning string and correcting on mount keeps the two identical.
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
  className,
  filled = false,
}: {
  path: string;
  size?: number;
  color?: string;
  className?: string;
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
      className={className}
      style={{ color, flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const PATH = {
  chevron: "M9 6l6 6-6 6",
  check: "M20 6L9 17l-5-5",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  mic: "M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 19v3",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  sparkles: "M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z",
  plus: "M12 5v14M5 12h14",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  clip: "M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L16 7",
  users: "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9",
  store: "M3 9l1.5-5h15L21 9M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
  boxes: "M12 2.5l8.5 4.7v9.6L12 21.5 3.5 16.8V7.2zM12 12l8.5-4.8M12 12v9.5M12 12L3.5 7.2",
  terminal: "M4 17l6-5-6-5M12 19h8",
  workflow: "M4 4h6v6H4zM14 14h6v6h-6zM10 7h3a2 2 0 0 1 2 2v5",
  gauge: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 12l4.5-4",
  wallet:
    "M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M20 11h-3.5a2.5 2.5 0 0 0 0 5H20z",
  shapes: "M8.5 3l5.5 9.5H3zM17 21.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  notebook: "M5 3h14v18H5zM9 3v18M12 8h4M12 12h4",
  contact: "M4 4h16v16H4zM12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8.5 17a3.5 3.5 0 0 1 7 0",
  userCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.3 18.4a6 6 0 0 1 11.4 0",
  scroll: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h4",
  key: "M14.5 7a4 4 0 1 1-3.4 6.1L4 20.2V22H2v-2.5l8.3-8.3A4 4 0 0 1 14.5 7zM16 10.5h.01",
  cpu: "M6 6h12v12H6zM9.5 9.5h5v5h-5M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7",
  image: "M3 5h18v14H3zM8.3 11a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM21 16.5L15.5 11 7 19",
  share:
    "M18 8a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 18 8zM6 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM18 21.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM8.4 13.3l7.2 4.2M15.6 6.5L8.4 10.7",
  messageAlert: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM12 7v4M12 13.5h.01",
  messages: "M14 9a2 2 0 0 1-2 2H6l-4 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2zM18 9h2a2 2 0 0 1 2 2v9l-4-3h-6a2 2 0 0 1-2-2v-1",
} as const;

/**
 * A vendor mark at a stage size. The logo components leave sizing to the
 * caller (LogoStrip does the same), and inside the stage a size is a design
 * pixel on the 1440x900 canvas — so the box is set here and the mark fills it.
 */
function Mark({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <span style={{ display: "inline-grid", width: size, height: size, flexShrink: 0 }}>
      {children}
    </span>
  );
}

/** The glyph a product-own tool row wears when there is no vendor mark. */
const STEP_GLYPH: Record<NonNullable<Step["glyph"]>, string> = {
  wiki: PATH.book,
  memory: PATH.bookmark,
  screen: PATH.eye,
};

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/**
 * The mark that says work is happening right now — an accent core inside two
 * rings that expand and fade. It is the ONE live mark the product owns, and
 * it appears on both surfaces for exactly that reason.
 */
function LiveCore() {
  return (
    <span
      style={{ position: "relative", display: "inline-flex", width: 10, height: 10, flexShrink: 0 }}
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
        style={{
          position: "relative",
          width: 10,
          height: 10,
          borderRadius: 999,
          background: soft(C.fg, 70),
        }}
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

/** The app's opening line, shrunk once a conversation is on screen. */
function Greeting() {
  const greeting = useGreeting();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        opacity: 0.7,
        transform: "scale(0.88)",
        marginBottom: 6,
      }}
    >
      <img src={jarvisLogo} alt="" width={30} height={30} style={{ width: 30, height: 30 }} />
      <span style={{ fontSize: 30, letterSpacing: "-0.5px", color: C.fg }}>{greeting}</span>
    </div>
  );
}

/** Title bar: three dots left, the title centred. */
function WindowChrome({ title }: { title: string }) {
  return (
    <div
      style={{
        height: CHROME_H,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        position: "relative",
        flexShrink: 0,
        background: C.sidebar,
      }}
    >
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ width: 9, height: 9, borderRadius: 999, background: C.border }}
          />
        ))}
      </div>
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 13,
          color: C.dim,
          pointerEvents: "none",
        }}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * The strip across the top of the stage: who is answering on the left, what
 * they are running on at the right. The app carries the same two facts there,
 * and here it doubles as the clean edge the conversation scrolls under.
 */
function SurfaceHeader({ surface }: { surface: Surface }) {
  const voice = surface === "voice";
  return (
    <div
      style={{
        height: HEADER_H,
        flexShrink: 0,
        borderBottom: `1px solid ${soft(C.border, 60)}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
      }}
    >
      <img src={jarvisLogo} alt="" width={18} height={18} style={{ width: 18, height: 18 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: C.fg }}>Jarvis</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.dim,
        }}
      >
        Ready
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          borderRadius: 8,
          border: `1px solid ${soft(C.border, 70)}`,
          padding: "5px 9px",
          fontSize: 12,
        }}
      >
        <Mark size={14}>
          {voice ? (
            <GeminiMark className="demo-mark" />
          ) : (
            <AnthropicMark className="demo-mark" />
          )}
        </Mark>
        <span style={{ color: C.fg, fontWeight: 500 }}>
          {voice ? VOICE_ENGINE.provider : CHAT_ENGINE.provider}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: C.dim }}>
          {voice ? VOICE_ENGINE.model : CHAT_ENGINE.model}
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

/**
 * `Voice | Chat` — the front page's one switch, at the top of the sidebar,
 * and the one thing on this page a visitor can actually press.
 */
function SurfaceSwitch({
  surface,
  onPick,
}: {
  surface: Surface;
  onPick: (next: Surface) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 2,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.muted,
        padding: 2,
        marginBottom: 10,
      }}
    >
      <SurfaceTab
        active={surface === "voice"}
        label="Voice"
        icon={PATH.mic}
        onClick={() => onPick("voice")}
      />
      <SurfaceTab
        active={surface === "chat"}
        label="Chat"
        icon={PATH.message}
        onClick={() => onPick("chat")}
      />
    </div>
  );
}

function SurfaceTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      className="demo-tab"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderRadius: 10,
        border: "none",
        padding: "7px 8px",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: active ? C.card : "transparent",
        color: active ? C.fg : C.dim,
      }}
    >
      <Glyph path={icon} size={14} />
      {label}
    </button>
  );
}

function SidebarRow({
  label,
  icon,
  active = false,
  meta,
}: {
  label: string;
  icon: string;
  active?: boolean;
  meta?: string;
}) {
  return (
    <div
      className="demo-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 8,
        // A design pixel tighter than it looks like it should be: the app has
        // more sections than fit beside a conversation, and every pixel here
        // is one more row of the real list on screen.
        padding: "6px 9px",
        fontSize: 13,
        color: active ? C.fg : C.dim,
        background: active ? C.muted : "transparent",
      }}
    >
      <Glyph path={icon} size={14} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {meta && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: soft(C.dim, 70) }}>
          {meta}
        </span>
      )}
    </div>
  );
}

/** The recent conversations, per surface — the app mixes both kinds in one list. */
const RECENT: Record<Surface, string[]> = {
  voice: ["Morning brief", "Standup moved", "Trip to Lisbon"],
  chat: ["Shipped — week 35", "Invoice, Kessler", "Wiki cleanup"],
};

/**
 * The app's section list, whole — its own order, its own grouping, its own
 * labels (`components/layout/navGroups.ts`, and the `nav.*` strings from the
 * English locale, with `{name}` filled in).
 *
 * It used to be five rows, which is the one place the "shorten everything"
 * rule was flatly wrong (maintainer, 2026-08-29). Five rows over a hand of
 * dead space does not read as a shortened list — it reads as an app that only
 * has five sections, and the empty half of the sidebar reads as a bug. The
 * real list overruns the sidebar and fades out at the bottom edge, exactly as
 * it does in the app, where the sidebar scrolls.
 *
 * The front page's own row is drawn above this, because the recent
 * conversations hang under it.
 */
const NAV_GROUPS: { label: string; icon: string }[][] = [
  // 1) Daily tools.
  [
    { label: "Jarvis-Agents", icon: PATH.users },
    { label: "Skills, Plugins & MCPs", icon: PATH.boxes },
    { label: "CLIs & CLI Test Hub", icon: PATH.terminal },
    { label: "Marketplace", icon: PATH.store },
  ],
  // 2) Content and data — what you read back, rather than configure.
  [
    { label: "Automations", icon: PATH.workflow },
    { label: "Transcription", icon: PATH.mic },
    { label: "Run Inspector", icon: PATH.gauge },
    { label: "Spend", icon: PATH.wallet },
    { label: "Artifacts", icon: PATH.shapes },
    { label: "Board", icon: PATH.sparkles },
    { label: "Wiki", icon: PATH.notebook },
    { label: "Contacts", icon: PATH.contact },
    { label: "Profile", icon: PATH.userCircle },
    { label: "Jarvis.md", icon: PATH.scroll },
    { label: "Docs", icon: PATH.book },
  ],
  // 3) Configuration.
  [
    { label: "API Keys", icon: PATH.key },
    { label: "Local models", icon: PATH.cpu },
    { label: "Settings", icon: PATH.settings },
    { label: "Jarvis Voice", icon: PATH.mic },
    { label: "Wallpaper", icon: PATH.image },
  ],
  // 4) Social links and in-app feedback.
  [
    { label: "Socials", icon: PATH.share },
    { label: "Feedback", icon: PATH.messageAlert },
  ],
  // 5) The Agentic IDE, apart on purpose — it puts real coding agents to work
  //    in a folder, which is a step past everything above it.
  [{ label: "Agentic IDE", icon: PATH.messages }],
];

function Sidebar({ surface, onPick }: { surface: Surface; onPick: (next: Surface) => void }) {
  const voice = surface === "voice";
  return (
    <aside
      style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        background: C.sidebar,
        padding: "12px 10px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SurfaceSwitch surface={surface} onPick={onPick} />

      <SidebarRow label={voice ? "New voice chat" : "New chat"} icon={PATH.plus} />

      <div
        style={{
          marginTop: 8,
          marginBottom: 6,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.card,
          padding: "9px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 500,
          color: C.fg,
        }}
      >
        <Glyph path={PATH.mic} size={14} />
        Start Realtime Voice
      </div>
      <p style={{ margin: "0 0 14px", padding: "0 4px", fontSize: 11, color: soft(C.dim, 75) }}>
        Your browser owns the microphone on this device.
      </p>

      {/*
        The nav takes the rest of the sidebar and clips what does not fit, with
        the bottom edge faded. The app's own sidebar scrolls here; a fade is
        how a clipped list says so.
      */}
      <div
        className="demo-nav"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          borderTop: `1px solid ${soft(C.border, 70)}`,
          paddingTop: 10,
        }}
      >
        <SidebarRow label={voice ? "Voice" : "Chat"} icon={voice ? PATH.mic : PATH.message} active />
        <div style={{ paddingLeft: 14, marginBottom: 4 }}>
          {RECENT[surface].map((title) => (
            <div
              key={title}
              className="demo-row"
              style={{
                borderRadius: 7,
                padding: "5px 8px",
                fontSize: 12.5,
                color: soft(C.dim, 85),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
          ))}
        </div>
        {NAV_GROUPS.map((group, i) => (
          <div
            key={group[0].label}
            style={
              i === 0
                ? undefined
                : {
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px solid ${soft(C.border, 70)}`,
                  }
            }
          >
            {group.map((item) => (
              <SidebarRow key={item.label} label={item.label} icon={item.icon} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The reasoning block — the same renderer on both surfaces
// ---------------------------------------------------------------------------

/** One tool call: a row, never a box of its own. */
function StepRow({ step, running }: { step: Step; running: boolean }) {
  return (
    <div
      className="demo-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        borderRadius: 7,
        padding: "4px 6px",
        fontSize: 13,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 16,
          height: 16,
          flexShrink: 0,
          color: C.dim,
        }}
      >
        {step.logo ? (
          <img src={step.logo} alt="" width={14} height={14} style={{ width: 14, height: 14 }} />
        ) : (
          <Glyph path={STEP_GLYPH[step.glyph ?? "wiki"]} size={14} />
        )}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          color: C.fg,
          flexShrink: 0,
        }}
      >
        {step.label}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: soft(C.dim, 85),
        }}
      >
        {step.summary}
      </span>
      {running ? (
        <span
          className="demo-spin"
          style={{
            width: 12,
            height: 12,
            flexShrink: 0,
            borderRadius: 999,
            border: `2px solid ${soft(C.primary, 25)}`,
            borderTopColor: C.primary,
          }}
          aria-hidden="true"
        />
      ) : (
        <span
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: soft(C.dim, 65),
          }}
        >
          {step.took}
        </span>
      )}
      <Glyph path={PATH.chevron} size={13} color={soft(C.dim, 50)} />
    </div>
  );
}

/**
 * The turn's reasoning, the way the app shows it: open while it runs, folded
 * to "Thought for Ns" over its own tool rows once it is done.
 *
 * The rows stay visible under the folded header on purpose — what the
 * assistant reached for is the part worth seeing without a click, and it is
 * the part that makes a voice answer trustworthy rather than magical.
 *
 * `preview` adds the two-line gist of the reasoning under the folded header.
 * The chat column has the room for it and the app shows it there; the voice
 * lane is compact and does not.
 */
function ReasoningBlock({
  turn,
  frame,
  live,
  reduced,
  preview = false,
}: {
  turn: Turn;
  frame: Frame;
  live: boolean;
  reduced: boolean;
  preview?: boolean;
}) {
  const thinking = live && frame.phase === "thinking";
  const streamed = useTypewriter(turn.thought, thinking && !reduced, reduced);
  const running = live && frame.phase === "steps";
  const shown = turn.steps.slice(0, live ? frame.steps : turn.steps.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {thinking ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "2px 0" }}>
          <LiveCore />
          <span className="demo-shimmer" style={{ fontWeight: 500 }}>
            Thinking for {turn.thoughtSeconds}s
          </span>
          <span style={{ color: soft(C.dim, 60), fontSize: 12 }}>esc to interrupt</span>
        </div>
      ) : (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: C.dim,
            padding: "2px 0",
          }}
        >
          <Glyph path={PATH.chevron} size={14} />
          <span>Thought for {turn.thoughtSeconds}s</span>
        </div>
      )}

      {thinking ? (
        <div
          style={{
            marginLeft: 6,
            borderLeft: `1px solid ${C.border}`,
            paddingLeft: 13,
            maxHeight: 92,
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
        <>
          {preview && (
            <div
              style={{
                marginLeft: 20,
                marginBottom: 2,
                fontSize: 13,
                lineHeight: 1.5,
                color: soft(C.dim, 80),
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {turn.thought}
            </div>
          )}
          {shown.map((step, i) => (
            <StepRow
              key={`${step.label}-${i}`}
              step={step}
              running={running && i === shown.length - 1}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** The answer, typed out. Lines that start with "- " render as bullets. */
function Answer({
  turn,
  live,
  reduced,
  style,
}: {
  turn: Turn;
  live: boolean;
  reduced: boolean;
  style?: CSSProperties;
}) {
  const full = turn.answer.join("\n");
  const streamed = useTypewriter(full, live && !reduced, reduced);
  const text = live && !reduced ? streamed : full;
  const lines = text.split("\n");

  return (
    <div style={style}>
      {lines.map((line, i) => {
        const last = i === lines.length - 1;
        const caret = live && !reduced && last && text.length < full.length;
        if (line.startsWith("- ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <span style={{ color: soft(C.dim, 70) }}>•</span>
              <span style={{ flex: 1 }}>
                {line.slice(2)}
                {caret && <Caret />}
              </span>
            </div>
          );
        }
        return (
          <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>
            {line}
            {caret && <Caret />}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice surface
// ---------------------------------------------------------------------------

/** One line of the voice lane: who said it in the gutter, the words beside it. */
function LaneLine({
  who,
  children,
  assistant,
  live = false,
}: {
  who: string;
  children: ReactNode;
  assistant: boolean;
  live?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 16, alignItems: "baseline" }}>
      <span
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.dim,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {who}
      </span>
      <span
        style={{
          fontSize: assistant ? 19 : 17,
          lineHeight: assistant ? 1.4 : 1.45,
          color: assistant ? (live ? C.dim : C.fg) : soft(C.dim, live ? 70 : 100),
          fontStyle: live ? "italic" : "normal",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function VoiceTurnView({
  turn,
  frame,
  live,
  reduced,
}: {
  turn: Turn;
  frame: Frame;
  live: boolean;
  reduced: boolean;
}) {
  const spoken = live && frame.phase === "spoken";
  const heard = useTypewriter(turn.said, spoken && !reduced, reduced);
  const said = spoken && !reduced ? heard : turn.said;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <LaneLine who="You" assistant={false} live={spoken}>
        {said}
        {spoken && !reduced && <Caret />}
      </LaneLine>

      {(!live || frame.phase !== "spoken") && (
        <div style={{ paddingLeft: 80 }}>
          <ReasoningBlock turn={turn} frame={frame} live={live} reduced={reduced} />
        </div>
      )}

      {(!live || frame.answer) && (
        <LaneLine who="Jarvis" assistant>
          <Answer turn={turn} live={live && frame.phase === "answering"} reduced={reduced} />
        </LaneLine>
      )}
    </div>
  );
}

/** Which face the bar wears for a given point in the rerun. */
function barState(phase: Phase): { word: string; hint: string; amp: number; live: boolean } {
  switch (phase) {
    case "spoken":
      return { word: "Listening", hint: "Listening…", amp: 1, live: true };
    case "thinking":
    case "steps":
      return { word: "Thinking", hint: "Thinking…", amp: 0.42, live: true };
    case "answering":
      return { word: "Speaking", hint: "Speaking…", amp: 0.78, live: true };
    default:
      return {
        word: "Ready",
        hint: `Say “${WAKE_PHRASE}” or tap the bar to start`,
        amp: 0.14,
        live: false,
      };
  }
}

/**
 * The waveform across the top of the Jarvis bar.
 *
 * A fixed amplitude array with a per-bar animation delay, so the wave travels
 * along the row. No microphone is ever opened — see docs/hero.md.
 */
function Waveform({ amp }: { amp: number }) {
  const bars = 62;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        width: "100%",
      }}
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
              height: Math.max(3, Math.round(a * amp * 52)),
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
 * The Jarvis bar — the front page's one voice control, drawn in the chat
 * composer's language so the two surfaces read as siblings. The whole card is
 * the start/stop control: there is no microphone button, because you tap the
 * bar or you say the wake word.
 */
function JarvisBar({ phase }: { phase: Phase }) {
  const state = barState(phase);
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${state.live ? soft(C.primary, 35) : C.border}`,
        background: C.card,
        padding: "14px 16px 10px",
      }}
    >
      <Waveform amp={state.amp} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: state.live ? C.fg : C.dim,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: state.live ? soft(C.fg, 70) : soft(C.dim, 40),
            }}
          />
          {state.word}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12.5,
            color: C.dim,
          }}
        >
          {state.hint}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 8,
            padding: "5px 8px",
            fontSize: 12,
            color: C.dim,
          }}
        >
          <Glyph path={PATH.sparkles} size={13} />
          Prompt
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            borderRadius: 8,
            padding: "5px 8px",
            fontSize: 12,
          }}
        >
          <Mark size={13}>
            <GeminiMark className="demo-mark" />
          </Mark>
          <span style={{ color: C.fg, fontWeight: 500 }}>{VOICE_ENGINE.provider}</span>
        </span>
      </div>
    </div>
  );
}

function VoiceSurface({ frame, reduced }: { frame: Frame; reduced: boolean }) {
  const [past, live] = turnsFor("voice");
  return (
    <>
      <SurfaceHeader surface="voice" />
      <div
        className="demo-lane"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            width: COLUMN_W,
            margin: "0 auto",
            padding: `18px ${COLUMN_PAD}px 8px`,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <Greeting />
          <VoiceTurnView turn={past} frame={DONE_FRAME} live={false} reduced={reduced} />
          <VoiceTurnView turn={live} frame={frame} live reduced={reduced} />
        </div>
      </div>
      <div style={{ width: COLUMN_W, margin: "0 auto", padding: `0 ${COLUMN_PAD}px 20px` }}>
        <JarvisBar phase={frame.phase} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Chat surface
// ---------------------------------------------------------------------------

/** The closing line of a finished turn — what it was, how long, what it cost. */
function TurnOutcome({ turn }: { turn: Turn }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingTop: 2,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: soft(C.dim, 70),
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <Glyph path={PATH.check} size={14} />
        Done
      </span>
      <span>{turn.elapsed}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Glyph path={PATH.arrowDown} size={12} />
        {turn.outTokens} tokens
      </span>
    </div>
  );
}

function ChatTurnView({
  turn,
  frame,
  live,
  reduced,
}: {
  turn: Turn;
  frame: Frame;
  live: boolean;
  reduced: boolean;
}) {
  const sending = live && frame.phase === "spoken";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "78%",
            borderRadius: 16,
            borderBottomRightRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.muted,
            padding: "10px 15px",
            fontSize: 16,
            lineHeight: 1.5,
            color: C.fg,
          }}
        >
          {turn.said}
        </div>
      </div>

      {!sending && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.fg,
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: 999, background: soft(C.fg, 70) }} />
            <span>Jarvis</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textTransform: "none",
                letterSpacing: "normal",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: C.dim,
              }}
            >
              <Mark size={13}>
                <AnthropicMark className="demo-mark" />
              </Mark>
              {CHAT_ENGINE.provider}
              <span style={{ color: soft(C.dim, 70) }}>· {CHAT_ENGINE.model}</span>
              <span style={{ color: soft(C.dim, 70) }}>· {CHAT_ENGINE.effort}</span>
            </span>
          </div>

          <ReasoningBlock turn={turn} frame={frame} live={live} reduced={reduced} preview />

          {(!live || frame.answer) && (
            <Answer
              turn={turn}
              live={live && frame.phase === "answering"}
              reduced={reduced}
              style={{ fontSize: 16, lineHeight: 1.6, color: C.fg }}
            />
          )}

          {(!live || frame.phase === "done") && <TurnOutcome turn={turn} />}
        </div>
      )}
    </div>
  );
}

/** The composer — the chat's half of the pair the Jarvis bar belongs to. */
function Composer() {
  const pill = (label: string, mark?: ReactNode): ReactNode => (
    <span
      key={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 8,
        padding: "5px 8px",
        fontSize: 12,
        color: C.fg,
        fontWeight: 500,
      }}
    >
      {mark}
      {label}
      <Glyph path={PATH.chevron} size={12} color={soft(C.dim, 70)} />
    </span>
  );

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        background: C.card,
        padding: "14px 14px 10px",
      }}
    >
      <div style={{ fontSize: 15, color: soft(C.dim, 80), padding: "2px 4px 14px" }}>
        Ask anything…
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            fontSize: 12,
            fontWeight: 500,
            color: C.fg,
          }}
        >
          <img src={jarvisLogo} alt="" width={14} height={14} style={{ width: 14, height: 14 }} />
          Jarvis
        </span>
        {pill(
          CHAT_ENGINE.provider,
          <Mark size={13}>
            <AnthropicMark className="demo-mark" />
          </Mark>,
        )}
        {pill(CHAT_ENGINE.model)}
        {pill("High")}
        {pill("Ask before acting")}
        <span style={{ flex: 1 }} />
        <Glyph path={PATH.clip} size={15} color={C.dim} />
        <span style={{ width: 8 }} />
        <Glyph path={PATH.mic} size={15} color={C.dim} />
        <span
          style={{
            marginLeft: 10,
            display: "grid",
            placeItems: "center",
            width: 26,
            height: 26,
            borderRadius: 999,
            background: C.muted,
            color: soft(C.dim, 80),
          }}
        >
          <Glyph path={PATH.arrowUp} size={14} />
        </span>
      </div>
    </div>
  );
}

function ChatSurface({ frame, reduced }: { frame: Frame; reduced: boolean }) {
  const [past, live] = turnsFor("chat");
  return (
    <>
      <SurfaceHeader surface="chat" />
      <div
        className="demo-lane"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            width: COLUMN_W,
            margin: "0 auto",
            padding: `18px ${COLUMN_PAD}px 8px`,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <ChatTurnView turn={past} frame={DONE_FRAME} live={false} reduced={reduced} />
          <ChatTurnView turn={live} frame={frame} live reduced={reduced} />
        </div>
      </div>
      <div style={{ width: COLUMN_W, margin: "0 auto", padding: `0 ${COLUMN_PAD}px 18px` }}>
        <Composer />
      </div>
    </>
  );
}

/** Everything a turn that already happened is: finished, whole, quiet. */
const DONE_FRAME: Frame = { phase: "done", steps: 99, answer: true, duration: 0 };

// ---------------------------------------------------------------------------

export default function DemoStage({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scale = useStageScale(wrap);
  const reduced = usePrefersReducedMotion();

  const [surface, setSurface] = useState<Surface>("voice");
  const [step, setStep] = useState(0);
  const [tookOver, setTookOver] = useState(false);

  const script = scriptFor(surface);

  /**
   * Autoplay, and what the first click changes.
   *
   * Left alone, the stage plays the voice rerun, hands over to the chat one,
   * and comes back — the visitor sees both without touching anything.
   *
   * The first press of the switch stops the hand-over FOR GOOD: from then on
   * the chosen surface loops on its own and the stage never changes surface
   * again by itself. That is the rule from docs/hero.md — the demo must not
   * move out from under the visitor's hand — applied where it actually bites.
   * Freezing the rerun as well would be the wrong reading of it: pressing
   * "Chat" is a request to WATCH the chat rerun, and answering it with a still
   * frame would look broken.
   */
  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => {
      const next = step + 1;
      if (next < script.length) {
        setStep(next);
        return;
      }
      setStep(0);
      if (!tookOver) setSurface((s) => (s === "voice" ? "chat" : "voice"));
    }, script[step].duration);
    return () => clearTimeout(id);
  }, [step, script, tookOver, reduced]);

  const frame = useMemo<Frame>(
    () => (reduced ? script[script.length - 1] : script[step]),
    [reduced, script, step],
  );

  const pick = (next: Surface) => {
    setTookOver(true);
    if (next !== surface) {
      setSurface(next);
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
            <WindowChrome title="Personal Jarvis" />
            <div style={{ display: "flex", height: BODY_H }}>
              <Sidebar surface={surface} onPick={pick} />
              <main
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: C.bg,
                }}
              >
                {surface === "voice" ? (
                  <VoiceSurface frame={frame} reduced={reduced} />
                ) : (
                  <ChatSurface frame={frame} reduced={reduced} />
                )}
              </main>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only">
        Interactive demo of the app's front page. A switch in the sidebar moves
        between its two halves, and each one replays a conversation. In Voice,
        the person asks what their morning looks like; the assistant reads the
        inbox and the calendar, and says the design review has landed on top of
        the standup. They then say “move the standup to three and tell the team
        why” — the assistant checks that all four are free at three, moves the
        meeting and posts the reason. In Chat, they type “summarise what the
        team shipped last week and put it in the wiki”, and the assistant reads
        the issue tracker and the release channel, writes the page, and then
        posts the four user-facing items to the team channel. Both show the
        assistant's reasoning and every tool it used.
      </p>
    </div>
  );
}
