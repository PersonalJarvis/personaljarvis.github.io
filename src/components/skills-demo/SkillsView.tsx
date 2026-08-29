/**
 * The skills window — pure. Props in, markup out.
 *
 * Three layouts on one canvas: the list, an opened skill, and its triggers.
 * The section's argument needs all three — a list alone says "there are files",
 * and it is the trigger block that says why one of them fires at seven in the
 * morning.
 *
 * Every measurement is a design pixel against the shared 1440 canvas; nothing
 * here reacts to the viewport. See docs/feature-section.md.
 */

import type { ReactElement, ReactNode } from "react";

import {
  CANVAS_WIDTH,
  HAIRLINE,
  RADIUS,
  STROKE,
  WindowChrome,
  WindowHeader,
} from "@/components/window-demo/chrome";
import {
  SKILL_COUNT,
  type DemoSkill,
  type Frame,
  type TriggerKind,
} from "./frames";

export { CANVAS_WIDTH };
/** Same height as the other feature windows, so the cards sit on the page as
 *  views of one application rather than as different shapes. */
export const CANVAS_HEIGHT = 1340;

// --- Icons ----------------------------------------------------------------

function MicIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <rect x={9} y={2} width={6} height={11} rx={3} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <rect x={2} y={6} width={20} height={12} rx={2} />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.6-3.6" />
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

const TRIGGER_ICON: Record<TriggerKind, () => ReactElement> = {
  voice: MicIcon,
  hotkey: KeyboardIcon,
  cron: ClockIcon,
};

/** The app's own words for what a trigger is. */
const TRIGGER_LABEL: Record<TriggerKind, string> = {
  voice: "Voice",
  hotkey: "Event",
  cron: "Cron",
};

// --- Pieces ---------------------------------------------------------------

/** The switch. It is the only control on a row, and it is the whole point of
 *  the section: a skill is a file, and this turns it off. */
function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={on ? "On" : "Off"}
      title={on ? "On" : "Off"}
      onClick={onClick}
      className="skill-toggle"
      data-on={on ? "true" : "false"}
      style={{
        width: 78,
        height: 42,
        borderRadius: 999,
        border: `${HAIRLINE}px solid ${on ? "transparent" : "var(--hairline-strong)"}`,
        background: on ? "var(--ink)" : "transparent",
        padding: 0,
        display: "flex",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: on ? "var(--on-ink)" : "var(--muted-soft)",
          marginLeft: on ? 42 : 4,
          transition: "margin-left 160ms ease-out",
        }}
      />
    </button>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="skill-pill"
      data-active={active ? "true" : "false"}
      style={{
        height: 64,
        padding: "0 26px",
        borderRadius: RADIUS,
        border: `${HAIRLINE}px solid ${active ? "transparent" : "var(--hairline-strong)"}`,
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--on-ink)" : "var(--body)",
        fontSize: 28,
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {label}
    </button>
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

const COLUMNS = "1fr 240px 260px 78px";

function Row({
  skill,
  hovered,
  onToggle,
  onOpen,
}: {
  skill: DemoSkill;
  hovered: boolean;
  onToggle?: (name: string) => void;
  onOpen?: (name: string) => void;
}) {
  return (
    <div
      className="skill-row"
      data-hovered={hovered ? "true" : "false"}
      onMouseDown={onOpen ? () => onOpen(skill.name) : undefined}
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
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: 38,
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.2px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {skill.name}
          </span>
          {/* One glyph per trigger, in frontmatter order — two voice triggers
              really do draw two microphones. */}
          <span style={{ display: "inline-flex", gap: 8, color: "var(--muted)" }}>
            {skill.triggers.map((kind, i) => {
              const Icon = TRIGGER_ICON[kind];
              return <Icon key={`${kind}-${i}`} />;
            })}
          </span>
        </span>
        {skill.reason && (
          <span
            style={{
              display: "block",
              fontSize: 26,
              color: "var(--body)",
              fontStyle: "italic",
              marginTop: 4,
            }}
          >
            {skill.reason}
          </span>
        )}
      </span>

      <span style={{ fontSize: 30, color: "var(--body)" }}>{skill.updated}</span>
      <span style={{ fontSize: 30, color: "var(--body)" }}>{skill.author}</span>

      {/* The switch swallows the press: turning a skill off is not opening it. */}
      <span onMouseDown={(e) => e.stopPropagation()}>
        <Toggle
          on={skill.on}
          onClick={onToggle ? () => onToggle(skill.name) : undefined}
        />
      </span>
    </div>
  );
}

// --- The window -----------------------------------------------------------

export interface SkillsViewProps {
  frame: Frame;
  /** The skill the detail layouts show. */
  openSkill?: DemoSkill;
  /** Rows the visitor has switched since taking over. */
  overrides: Record<string, boolean>;
  onToggle?: (name: string) => void;
  onFilter?: (filter: "all" | "mine") => void;
  onOpen?: (name: string) => void;
  onBack?: () => void;
  animate?: boolean;
  fadeKey?: string;
}

export function SkillsView({
  frame,
  openSkill,
  overrides,
  onToggle,
  onFilter,
  onOpen,
  onBack,
  animate = true,
  fadeKey = "",
}: SkillsViewProps) {
  const shell = (children: ReactNode) => (
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
        style={{
          padding: "44px 56px 32px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (frame.layout !== "list" && openSkill) {
    return shell(
      <Detail
        skill={openSkill}
        showTriggers={frame.layout === "triggers"}
        on={overrides[openSkill.name] ?? openSkill.on}
        onToggle={onToggle}
        onBack={onBack}
      />,
    );
  }

  return shell(
    <>
      <WindowHeader title="Skills" subtitle={`${SKILL_COUNT} skills`} action="Add" />

      {/* A mockup, not an input: the stage is aria-hidden, and an unreachable
          text field inside it would be a trap rather than a feature. */}
      <div
        style={{
          marginTop: 36,
          height: 72,
          flexShrink: 0,
          borderRadius: RADIUS,
          border: `${HAIRLINE}px solid var(--hairline-strong)`,
          background: "var(--canvas-soft)",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 24px",
          color: "var(--muted)",
        }}
      >
        <SearchIcon />
        <span style={{ fontSize: 30, color: frame.query ? "var(--ink)" : "var(--muted)" }}>
          {frame.query || "Search skills…"}
        </span>
        {frame.query && (
          <span
            className="skill-caret"
            data-animate={animate ? "true" : "false"}
            style={{ width: 3, height: 34, background: "var(--ink)" }}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <FilterPill
          label="All"
          active={frame.filter === "all"}
          onClick={onFilter ? () => onFilter("all") : undefined}
        />
        <FilterPill
          label="Mine"
          active={frame.filter === "mine"}
          onClick={onFilter ? () => onFilter("mine") : undefined}
        />
        {frame.matches !== undefined && (
          <span style={{ marginLeft: "auto", fontSize: 26, color: "var(--muted)" }}>
            {frame.matches} matches
          </span>
        )}
      </div>

      <div
        key={animate ? fadeKey : undefined}
        className={animate ? "skill-table skill-table--fade" : "skill-table"}
        style={{
          marginTop: 34,
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
            flexShrink: 0,
            borderBottom: `${HAIRLINE}px solid var(--hairline)`,
            fontSize: 24,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--muted-soft)",
          }}
        >
          <span>Skill</span>
          <span>Last updated</span>
          <span>Author</span>
          <span>Enabled</span>
        </div>

        <div className="skill-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {frame.skills.map((skill) => (
            <Row
              key={skill.name}
              skill={{ ...skill, on: overrides[skill.name] ?? skill.on }}
              hovered={frame.openName === skill.name}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </>,
  );
}

/**
 * An opened skill: its card, straight out of that file's own frontmatter.
 *
 * The triggers block is the beat the section is really about, so it gets its
 * own frame rather than sharing one. A skill with no triggers says so — an
 * empty list is a fact about the file, not a gap in the demo.
 */
function Detail({
  skill,
  showTriggers,
  on,
  onToggle,
  onBack,
}: {
  skill: DemoSkill;
  showTriggers: boolean;
  on: boolean;
  onToggle?: (name: string) => void;
  onBack?: () => void;
}) {
  const card = skill.card;
  const facts = [
    { label: "Status", value: card.status },
    ...(card.version ? [{ label: "Version", value: card.version }] : []),
    { label: "Category", value: card.category },
    ...(card.license ? [{ label: "License", value: card.license }] : []),
  ];

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        onClick={onBack}
        className="skill-back"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontSize: 28,
          color: "var(--muted)",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: onBack ? "pointer" : "default",
        }}
      >
        <BackIcon />
        Skills
      </button>

      <div style={{ marginTop: 28, display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 52,
              color: "var(--ink)",
              letterSpacing: "-0.8px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {skill.name}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 28,
              color: "var(--muted)",
              marginTop: 8,
            }}
          >
            {card.byline}
          </span>
        </div>
        <Toggle on={on} onClick={onToggle ? () => onToggle(skill.name) : undefined} />
      </div>

      <p
        style={{
          marginTop: 28,
          fontSize: 30,
          lineHeight: 1.5,
          color: "var(--body)",
          maxWidth: 1150,
        }}
      >
        {card.description}
      </p>

      <div
        style={{
          marginTop: 32,
          display: "flex",
          gap: 64,
          paddingTop: 28,
          borderTop: `${HAIRLINE}px solid var(--hairline)`,
        }}
      >
        {facts.map((f) => (
          <span key={f.label}>
            <FieldLabel>{f.label}</FieldLabel>
            <span
              style={{
                display: "block",
                fontSize: 32,
                color: "var(--ink)",
                marginTop: 8,
              }}
            >
              {f.value}
            </span>
          </span>
        ))}
      </div>

      {showTriggers && card.triggers.length > 0 ? (
        <div className="skill-triggers" style={{ marginTop: 40 }}>
          <span
            style={{
              display: "block",
              fontSize: 24,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--muted-soft)",
              paddingBottom: 16,
              borderBottom: `${HAIRLINE}px solid var(--hairline)`,
            }}
          >
            Triggers
          </span>
          {card.triggers.map((t, i) => {
            const Icon = TRIGGER_ICON[t.kind];
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 160px",
                  alignItems: "center",
                  gap: 24,
                  height: 104,
                  borderBottom: `${HAIRLINE}px solid var(--hairline-soft)`,
                }}
              >
                <span
                  style={{ color: "var(--muted)", display: "grid", placeItems: "center" }}
                  title={TRIGGER_LABEL[t.kind]}
                >
                  <Icon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 28,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.pattern}
                </span>
                <span style={{ fontSize: 26, color: "var(--muted)" }}>
                  {t.locales ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 40 }}>
          <FieldLabel>{card.tags.length > 0 ? "Tags" : "Triggers"}</FieldLabel>
          {card.tags.length > 0 ? (
            <span style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    height: 58,
                    padding: "0 24px",
                    borderRadius: RADIUS,
                    border: `${HAIRLINE}px solid var(--hairline-strong)`,
                    color: "var(--body)",
                    fontSize: 27,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <span
              style={{
                display: "block",
                marginTop: 14,
                fontSize: 28,
                color: "var(--muted)",
              }}
            >
              None — this one runs when you ask for it.
            </span>
          )}
        </div>
      )}
    </>
  );
}
