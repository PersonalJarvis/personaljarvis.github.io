/**
 * The plugins window — pure. Props in, markup out.
 *
 * No fetch, no effect, no context, no router, no socket. This is the seam the
 * app-side refactor was meant to produce; docs/feature-section.md records why
 * the view is rebuilt here instead of imported. If a shared package is ever
 * published, this file is replaced by an import and nothing around it moves.
 *
 * ## Everything here is design pixels
 *
 * The window is drawn on a fixed 1440×1340 canvas and scaled to fit by
 * PluginsDemo. Nothing inside reacts to the viewport — that is the whole point
 * of the technique, and docs/feature-section.md forbids it.
 *
 * The canvas renders at roughly 0.42×, so a design pixel is worth about 0.42
 * rendered pixels. Anything that must land on an exact rendered size is
 * multiplied by ~2.4 here: a 1px divider is written as 2, an 8px radius as 18.
 * The window's own border and radius are the exception — they live outside the
 * transform, on PluginsDemo's frame, so they stay crisp at any scale.
 */

import type { DemoPlugin, FilterId, PluginStatus } from "./frames";
import {
  CANVAS_WIDTH,
  HAIRLINE,
  RADIUS,
  STROKE,
  WindowChrome,
  WindowHeader,
} from "@/components/window-demo/chrome";
import { MarkTile } from "@/components/window-demo/marks";

export { CANVAS_WIDTH };

/** How tall this window is. The width is shared with the other feature demos
 *  (see chrome.tsx); the height is this one's own, because a five-row list and
 *  a terminal do not want the same proportion. */
export const CANVAS_HEIGHT = 1340;

export interface PluginCounts {
  /** How many the real catalog ships — not how many rows are on screen. */
  total: number;
  connected: number;
  installed: number;
  attention: number;
}

export interface PluginsViewProps {
  query: string;
  filter: FilterId;
  /** Already filtered. The view does no work of its own. */
  plugins: DemoPlugin[];
  busyId?: string;
  /** A row the script is pointing at, drawn as if hovered. */
  hoverId?: string;
  banner?: { title: string; detail: string };
  counts: PluginCounts;
  /** Connect or disconnect a row. Absent means the window is a still. */
  onToggle?: (id: string) => void;
  onFilter?: (filter: FilterId) => void;
  /** Suppresses the frame cross-fade for `prefers-reduced-motion`. */
  animate?: boolean;
  /** Restarts the fade. Derived from what is ON SCREEN, not from the frame
   *  number: frames 2–4 show the same three rows while a connect runs, and
   *  re-fading the table under a spinner reads as a glitch, not a transition. */
  fadeKey?: string;
  /** Clears the search. Absent means the window is a still. */
  onClearQuery?: () => void;
}

const STATUS_LABEL: Record<PluginStatus, string> = {
  connected: "Connected",
  not_connected: "Not connected",
  needs_reauth: "Reconnect needed",
};

/** Dot colour per status. Only the two semantic tokens are used — this system
 *  reserves colour for meaning, and "not connected" is not a problem, so it
 *  gets no colour at all. */
const STATUS_COLOR: Record<PluginStatus, string> = {
  connected: "var(--success)",
  not_connected: "var(--muted-soft)",
  needs_reauth: "var(--error)",
};

function StatusDot({ status }: { status: PluginStatus }) {
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

/** The round button at the end of a row. Three shapes for three meanings, the
 *  way the app has them: a plus to connect, a tick to disconnect, a circling
 *  arrow to reconnect. A spinner while a connect is in flight. */
function RowButton({
  status,
  busy,
  onClick,
}: {
  status: PluginStatus;
  busy: boolean;
  onClick?: () => void;
}) {
  const connected = status === "connected";
  const needsReconnect = status === "needs_reauth";
  const label = busy
    ? "Connecting"
    : connected
      ? "Disconnect"
      : needsReconnect
        ? "Reconnect"
        : "Connect";

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="plugin-row-button"
      data-tone={connected ? "connected" : needsReconnect ? "attention" : "idle"}
      style={{
        width: 68,
        height: 68,
        borderRadius: 999,
        border: `${HAIRLINE}px solid var(--hairline-strong)`,
        display: "grid",
        placeItems: "center",
        cursor: onClick ? "pointer" : "default",
        background: "transparent",
        padding: 0,
      }}
    >
      {busy ? (
        <Spinner />
      ) : connected ? (
        <TickIcon />
      ) : needsReconnect ? (
        <ReconnectIcon />
      ) : (
        <PlusIcon />
      )}
    </button>
  );
}

// --- Icons ----------------------------------------------------------------
// Drawn inline rather than pulled from an icon package: eight strokes are
// cheaper than a dependency, and they inherit `currentColor`, so the hover
// states below need no second copy. STROKE is shared with the other demos.

function PlusIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ReconnectIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 3v6h-6" />
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

function WarningIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M12 3.5 1.8 20.5h20.4L12 3.5Z" />
      <path d="M12 10v4M12 17.5h.01" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="plugin-spinner"
      {...STROKE}
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

// --- Pieces ---------------------------------------------------------------

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="plugin-filter-pill"
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
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {label}
      <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </button>
  );
}

function Banner({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        marginTop: 28,
        padding: "22px 26px",
        borderRadius: RADIUS,
        border: `${HAIRLINE}px solid var(--error)`,
        // A tint mixed from the token, so the banner still has exactly one
        // colour source and the style gate still sees no hex.
        background: "color-mix(in srgb, var(--error) 7%, var(--surface-card))",
      }}
    >
      <span style={{ color: "var(--error)", display: "grid", placeItems: "center" }}>
        <WarningIcon />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 30, fontWeight: 500, color: "var(--ink)" }}>{title}</p>
        <p style={{ fontSize: 26, color: "var(--body)", marginTop: 4 }}>{detail}</p>
      </div>
      <span
        style={{
          height: 62,
          padding: "0 24px",
          borderRadius: RADIUS,
          border: `${HAIRLINE}px solid var(--hairline-strong)`,
          color: "var(--ink)",
          fontSize: 27,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        Jump to it
      </span>
    </div>
  );
}

/** Grid used by both the table head and every row, so the columns cannot
 *  drift apart. */
const COLUMNS = "1fr 330px 300px 68px";

function Row({
  plugin,
  busy,
  hovered,
  onToggle,
}: {
  plugin: DemoPlugin;
  busy: boolean;
  hovered: boolean;
  onToggle?: (id: string) => void;
}) {
  const label =
    plugin.status === "connected" && plugin.live
      ? `${STATUS_LABEL.connected} · Live`
      : STATUS_LABEL[plugin.status];

  return (
    <div
      className="plugin-row"
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
      <span style={{ display: "flex", alignItems: "center", gap: 26, minWidth: 0 }}>
        <MarkTile url={plugin.logo} mono={plugin.mono} tint={plugin.tint} />
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 38,
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.2px",
            }}
          >
            {plugin.name}
          </span>
          {plugin.reason && (
            <span
              style={{
                display: "block",
                fontSize: 26,
                color: "var(--body)",
                marginTop: 2,
              }}
            >
              {plugin.reason}
            </span>
          )}
        </span>
      </span>

      <span style={{ fontSize: 30, color: "var(--body)" }}>{plugin.category}</span>

      <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <StatusDot status={plugin.status} />
        <span style={{ fontSize: 30, color: "var(--body)" }}>{label}</span>
      </span>

      <RowButton
        status={plugin.status}
        busy={busy}
        onClick={onToggle ? () => onToggle(plugin.id) : undefined}
      />
    </div>
  );
}

// --- The window -----------------------------------------------------------

export function PluginsView({
  query,
  filter,
  plugins,
  busyId,
  hoverId,
  banner,
  counts,
  onToggle,
  onFilter,
  animate = true,
  fadeKey = "",
  onClearQuery,
}: PluginsViewProps) {
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
        style={{
          padding: "44px 56px 32px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <WindowHeader
          title="Plugins"
          subtitle={`${counts.total} available · ${counts.connected} connected`}
          action="Add"
        />

        {/* Search — a mockup, not an input: the stage is aria-hidden, and an
            unreachable text field inside it would be a trap, not a feature. */}
        <div
          style={{
            marginTop: 36,
            height: 72,
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
          <span style={{ fontSize: 30, color: query ? "var(--ink)" : "var(--muted)" }}>
            {query || "Search plugins…"}
          </span>
          {query && (
            <span
              className="plugin-caret"
              data-animate={animate ? "true" : "false"}
              style={{ width: 3, height: 34, background: "var(--ink)" }}
            />
          )}
        </div>

        {/* Filters */}
        <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
          <FilterPill
            label="All"
            count={counts.total}
            active={filter === "all"}
            onClick={onFilter ? () => onFilter("all") : undefined}
          />
          <FilterPill
            label="Installed"
            count={counts.installed}
            active={filter === "installed"}
            onClick={onFilter ? () => onFilter("installed") : undefined}
          />
          {counts.attention > 0 && (
            <FilterPill
              label="Needs attention"
              count={counts.attention}
              active={filter === "attention"}
              onClick={onFilter ? () => onFilter("attention") : undefined}
            />
          )}

          {query && (
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 20,
                fontSize: 26,
                color: "var(--muted)",
              }}
            >
              {plugins.length} matches
              <button
                type="button"
                tabIndex={-1}
                onClick={onClearQuery}
                className="plugin-clear"
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  fontSize: 26,
                  color: "var(--muted)",
                  cursor: onClearQuery ? "pointer" : "default",
                }}
              >
                Clear filters
              </button>
            </span>
          )}
        </div>

        {banner && <Banner title={banner.title} detail={banner.detail} />}

        {/* Table */}
        {/* The rows scroll. The catalog is twenty-four long and the window
            holds about seven, which is what the app does too — a header reading
            "24 available" over five rows reads as a broken list. */}
        <div
          key={animate ? fadeKey : undefined}
          className={animate ? "plugin-table plugin-table--fade" : "plugin-table"}
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
              borderBottom: `${HAIRLINE}px solid var(--hairline)`,
              fontSize: 24,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--muted-soft)",
            }}
          >
            <span>Plugin</span>
            <span>Category</span>
            <span>Status</span>
            <span />
          </div>

          <div className="plugin-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {plugins.map((plugin) => (
            <Row
              key={plugin.id}
              plugin={plugin}
              busy={busyId === plugin.id}
              hovered={hoverId === plugin.id}
              onToggle={onToggle}
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
