/**
 * The CLIs window — pure. Props in, markup out.
 *
 * Five layouts on one canvas: the catalog, one tool's facts, its safety gate,
 * the instruction being typed, and what actually ran. The last two are the
 * point of the section — an assistant that runs shell commands has to be able
 * to show which one it ran and why it was allowed to.
 *
 * Every measurement is a design pixel against the shared 1440 canvas.
 * See docs/feature-section.md.
 */

import type { ReactNode } from "react";

import {
  CANVAS_WIDTH,
  HAIRLINE,
  RADIUS,
  STROKE,
  WindowChrome,
  WindowHeader,
} from "@/components/window-demo/chrome";
import { MarkTile } from "@/components/window-demo/marks";
import {
  CATALOG,
  CATALOG_TOTAL,
  CONNECTED_TOTAL,
  DETAIL,
  INSTALLED_TOTAL,
  RUN,
  type CliStatus,
  type DemoCli,
  type Frame,
} from "./frames";

export { CANVAS_WIDTH };
/** Same height as the other two feature windows, so the three cards read as
 *  three views of one application. */
export const CANVAS_HEIGHT = 1340;

// --- Icons ----------------------------------------------------------------

function TerminalIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M4 6l6 6-6 6M13 18h7" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <circle cx={12} cy={12} r={9} />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// --- Pieces ---------------------------------------------------------------

/** The status word, with the app's own vocabulary. Only "connected" earns a
 *  colour: the other two are states, not problems. */
const STATUS_COLOR: Record<CliStatus, string> = {
  connected: "var(--success)",
  disconnected: "var(--muted-soft)",
  "not installed": "var(--muted-soft)",
};

function StatusDot({ status }: { status: CliStatus }) {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        background: STATUS_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
}

/**
 * The risk badge.
 *
 * Four tiers, and none of them is green — the app's own styles run from the
 * quietest grey for `safe` up to the destructive colour for `block`, because a
 * risk tier is a statement about what the gate did, not a reassurance.
 */
function RiskBadge({ tier }: { tier: string }) {
  const tone =
    tier === "block"
      ? "var(--error)"
      : tier === "ask"
        ? "var(--ink)"
        : tier === "monitor"
          ? "var(--body)"
          : "var(--muted)";
  return (
    <span
      style={{
        height: 52,
        padding: "0 22px",
        borderRadius: RADIUS,
        border: `${HAIRLINE}px solid ${tone}`,
        color: tone,
        fontSize: 26,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
      }}
    >
      {tier}
    </span>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 28,
        color: "var(--ink)",
      }}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        fontSize: 24,
        letterSpacing: "2px",
        textTransform: "uppercase",
        color: "var(--muted-soft)",
      }}
    >
      {children}
    </span>
  );
}

const COLUMNS = "1fr 300px 320px";

function Row({ cli, hovered }: { cli: DemoCli; hovered: boolean }) {
  return (
    <div
      className="cli-row"
      data-hovered={hovered ? "true" : "false"}
      style={{
        display: "grid",
        gridTemplateColumns: COLUMNS,
        alignItems: "center",
        gap: 24,
        height: 116,
        padding: "0 20px",
        marginInline: -20,
        borderRadius: RADIUS,
        borderBottom: `${HAIRLINE}px solid var(--hairline-soft)`,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <MarkTile url={cli.logo} mono={cli.mono} />
        <span
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: "var(--ink)",
            letterSpacing: "-0.2px",
          }}
        >
          {cli.name}
        </span>
      </span>

      <span style={{ fontSize: 30, color: "var(--body)" }}>{cli.category}</span>

      <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <StatusDot status={cli.status} />
        <span style={{ fontSize: 30, color: "var(--body)" }}>{cli.status}</span>
      </span>
    </div>
  );
}

// --- The window -----------------------------------------------------------

export interface ClisViewProps {
  frame: Frame;
  animate?: boolean;
  fadeKey?: string;
}

export function ClisView({ frame, animate = true, fadeKey = "" }: ClisViewProps) {
  const body = (() => {
    switch (frame.layout) {
      case "catalog":
        return <Catalog hoverId={frame.hoverId} />;
      case "detail":
        return <Detail />;
      case "gate":
        return <Gate />;
      case "compose":
        return <Compose typed={frame.typed ?? RUN.instruction.length} />;
      default:
        return <Result />;
    }
  })();

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: "var(--surface-card)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <WindowChrome />
      <div
        key={animate ? fadeKey : undefined}
        className={animate ? "cli-body cli-body--fade" : "cli-body"}
        style={{
          padding: "44px 56px 32px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function Catalog({ hoverId }: { hoverId?: string }) {
  return (
    <>
      <WindowHeader
        title="CLIs"
        subtitle={`${CONNECTED_TOTAL} connected · ${INSTALLED_TOTAL} installed · ${CATALOG_TOTAL} in catalog`}
        action="Add custom"
      />

      <div
        style={{
          marginTop: 40,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COLUMNS,
            gap: 24,
            paddingBottom: 16,
            borderBottom: `${HAIRLINE}px solid var(--hairline)`,
            fontSize: 24,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--muted-soft)",
          }}
        >
          <span>CLI</span>
          <span>Category</span>
          <span>Status</span>
        </div>

        <div className="cli-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {CATALOG.map((cli) => (
            <Row key={cli.id} cli={cli} hovered={hoverId === cli.id} />
          ))}
        </div>
      </div>
    </>
  );
}

function DetailHead() {
  return (
    <>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontSize: 28,
          color: "var(--muted)",
        }}
      >
        <BackIcon />
        CLIs
      </span>

      <div style={{ marginTop: 28 }}>
        <span
          style={{
            display: "block",
            fontSize: 52,
            color: "var(--ink)",
            letterSpacing: "-0.8px",
          }}
        >
          {DETAIL.name}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 28,
            color: "var(--muted)",
            marginTop: 8,
          }}
        >
          {DETAIL.description}
        </span>
      </div>
    </>
  );
}

function Detail() {
  return (
    <>
      <DetailHead />

      <div
        style={{
          marginTop: 36,
          paddingTop: 28,
          borderTop: `${HAIRLINE}px solid var(--hairline)`,
        }}
      >
        <FieldLabel>Binary</FieldLabel>
        <div style={{ marginTop: 10 }}>
          <Mono>{DETAIL.binary}</Mono>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <FieldLabel>Commands</FieldLabel>
        {DETAIL.commands.map((c) => (
          <div
            key={c.label}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              alignItems: "center",
              height: 92,
              borderBottom: `${HAIRLINE}px solid var(--hairline-soft)`,
            }}
          >
            <span style={{ fontSize: 28, color: "var(--body)" }}>{c.label}</span>
            <Mono>{c.value}</Mono>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 72 }}>
        <span>
          <FieldLabel>Auth mode</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <Mono>{DETAIL.authMode}</Mono>
          </div>
        </span>
        <span>
          <FieldLabel>Default tier</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <Mono>{DETAIL.defaultTier}</Mono>
          </div>
        </span>
      </div>
    </>
  );
}

function PatternRow({
  pattern,
  blocked,
}: {
  pattern: string;
  blocked: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        alignItems: "center",
        gap: 20,
        height: 84,
        borderBottom: `${HAIRLINE}px solid var(--hairline-soft)`,
        color: blocked ? "var(--error)" : "var(--muted)",
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>
        {blocked ? <BlockIcon /> : <TickIcon />}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 27,
          color: "var(--ink)",
        }}
      >
        {pattern}
      </span>
    </div>
  );
}

function Gate() {
  return (
    <>
      <DetailHead />

      <div
        style={{
          marginTop: 36,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 56,
          paddingTop: 28,
          borderTop: `${HAIRLINE}px solid var(--hairline)`,
        }}
      >
        <div>
          <FieldLabel>Blocked</FieldLabel>
          {DETAIL.blocked.map((p) => (
            <PatternRow key={p} pattern={p} blocked />
          ))}
        </div>
        <div>
          <FieldLabel>Allowed</FieldLabel>
          {DETAIL.allowed.map((p) => (
            <PatternRow key={p} pattern={p} blocked={false} />
          ))}
        </div>
      </div>
    </>
  );
}

function Compose({ typed }: { typed: number }) {
  return (
    <>
      <WindowHeader
        title="CLI Test Hub"
        subtitle="Tell Jarvis in plain language what to do with your CLIs"
      />

      <div style={{ marginTop: 44 }}>
        <FieldLabel>Instruction</FieldLabel>
        <div
          style={{
            marginTop: 14,
            minHeight: 150,
            borderRadius: RADIUS,
            border: `${HAIRLINE}px solid var(--hairline-strong)`,
            background: "var(--canvas-soft)",
            padding: "26px 28px",
            display: "flex",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 32, color: "var(--ink)", lineHeight: 1.4 }}>
            {RUN.instruction.slice(0, typed)}
          </span>
          <span
            className="cli-caret"
            style={{ width: 3, height: 40, background: "var(--ink)", marginTop: 3 }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <span style={{ marginRight: "auto" }}>
          <FieldLabel>CLI hint (optional)</FieldLabel>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "var(--muted)", display: "grid", placeItems: "center" }}>
              <TerminalIcon />
            </span>
            <span style={{ fontSize: 30, color: "var(--ink)" }}>{DETAIL.name}</span>
          </div>
        </span>

        <span style={{ fontSize: 26, color: "var(--muted-soft)" }}>
          Ctrl/Cmd + Enter
        </span>
        <span
          style={{
            height: 68,
            padding: "0 34px",
            borderRadius: RADIUS,
            background: "var(--ink)",
            color: "var(--on-ink)",
            fontSize: 30,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Run
        </span>
      </div>
    </>
  );
}

function Result() {
  return (
    <>
      <WindowHeader
        title="CLI Test Hub"
        subtitle="Tell Jarvis in plain language what to do with your CLIs"
      />

      <div
        style={{
          marginTop: 36,
          borderRadius: RADIUS,
          border: `${HAIRLINE}px solid var(--hairline)`,
          background: "var(--canvas-soft)",
          padding: "26px 28px",
        }}
      >
        <span style={{ fontSize: 28, color: "var(--muted)" }}>Jarvis says</span>
        {/* Deliberately asserts no number. Everything else in this frame is
            verbatim from the catalog; a spoken answer is per-run, and inventing
            "you have three open pull requests" would be the one made-up fact on
            the card. */}
        <p style={{ marginTop: 10, fontSize: 31, color: "var(--ink)", lineHeight: 1.45 }}>
          Here are your open pull requests.
        </p>
      </div>

      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <span>
          <FieldLabel>Tool</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <Mono>{RUN.tool}</Mono>
          </div>
        </span>
        <span>
          <FieldLabel>Risk tier</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <RiskBadge tier={RUN.tier} />
          </div>
        </span>
        <span>
          <FieldLabel>Exit</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <Mono>{RUN.exitCode}</Mono>
          </div>
        </span>
        <span>
          <FieldLabel>Duration</FieldLabel>
          <div style={{ marginTop: 10 }}>
            <Mono>{RUN.duration}</Mono>
          </div>
        </span>
      </div>

      <div style={{ marginTop: 32 }}>
        <FieldLabel>Command</FieldLabel>
        <div
          style={{
            marginTop: 14,
            borderRadius: RADIUS,
            border: `${HAIRLINE}px solid var(--hairline-strong)`,
            background: "var(--canvas)",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span style={{ color: "var(--muted)", display: "grid", placeItems: "center" }}>
            <TerminalIcon />
          </span>
          <Mono>{RUN.command}</Mono>
        </div>
      </div>
    </>
  );
}
