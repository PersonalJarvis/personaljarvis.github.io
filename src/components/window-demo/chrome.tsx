/**
 * The window's title bar, shared by every feature demo.
 *
 * Three feature cards show three different parts of the same application, so
 * the frame around them has to be the same frame. Separate copies drift — one
 * gains a pixel, another loses a dot — and the page stops reading as three
 * views of one product.
 *
 * ## Design pixels
 *
 * Everything here is measured against the 1440-wide canvas the feature demos
 * share, not against the viewport. The canvas renders at roughly 0.4x, so a
 * value that must land on an exact rendered size is written about 2.4x larger:
 * a 1px divider is 2, an 8px radius is 18. See docs/feature-section.md.
 */

/** A hairline in design pixels, so it renders as one real pixel. */
export const HAIRLINE = 2;
/** An 8px radius in design pixels. */
export const RADIUS = 18;

/** Every feature demo is drawn on a canvas this wide. Height is per demo — a
 *  list of plugins and a terminal do not want the same proportion — but the
 *  width is shared, which is what keeps the three windows the same size on the
 *  page and the type inside them the same size as each other. */
export const CANVAS_WIDTH = 1440;

export function WindowChrome({ title = "Personal Jarvis" }: { title?: string }) {
  return (
    <div
      style={{
        height: 76,
        flexShrink: 0,
        background: "var(--canvas-soft)",
        borderBottom: `${HAIRLINE}px solid var(--hairline)`,
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        position: "relative",
      }}
    >
      <span style={{ display: "flex", gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "var(--hairline-strong)",
            }}
          />
        ))}
      </span>
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 28,
          color: "var(--muted)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * The header inside a window: the section's name, a line of counts under it,
 * and one pill on the right.
 *
 * The app puts a row of icon buttons there. The demo keeps a single pill,
 * because at this scale a row of 16px icons is a row of grey smudges and the
 * point of the header is the name and the number, not the toolbar.
 */
export function WindowHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 56,
            fontWeight: 400,
            color: "var(--ink)",
            letterSpacing: "-1px",
            lineHeight: 1.15,
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 30,
            color: "var(--muted)",
            marginTop: 8,
          }}
        >
          {subtitle}
        </span>
      </div>
      {action && (
        <span
          style={{
            height: 64,
            padding: "0 28px",
            borderRadius: RADIUS,
            background: "var(--ink)",
            color: "var(--on-ink)",
            fontSize: 28,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

/** The shared stroke set for the inline icons every demo draws. They inherit
 *  `currentColor`, so a hover state needs no second copy. */
export const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
