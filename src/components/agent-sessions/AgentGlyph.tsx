/**
 * An agent as the app draws it: a flat silhouette in its identity colour with
 * two ink eyes. Jarvis is the ghost — the product's own mark — in paper.
 *
 * The specialist outlines are lifted from the app's society/AgentSymbol.tsx
 * (40x44 box); the ghost body from its GigiAvatar (240x260 box), scaled into
 * the same box so every agent can be placed by one centre point.
 *
 * `gaze` is the eye offset in box units — the board points it at the cursor.
 * `mood` swaps the face: three dots while working (the app's own "thinking"
 * interlude), two arcs once the person has approved.
 */

export type Shape = "ghost" | "circle" | "hexagon" | "drop" | "squircle" | "triangle" | "cloud";

export type Mood = "rest" | "working" | "happy";

function roundedOutline(): string {
  const points: string[] = [];
  for (let i = 0; i < 52; i++) {
    const angle = (i / 52) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const divisor = Math.pow(Math.abs(c) ** 5 + Math.abs(s) ** 5, 1 / 5) || 1;
    const radius = 16.2 / divisor;
    points.push(`${i === 0 ? "M" : "L"}${(20 + radius * c).toFixed(2)} ${(20 + radius * s).toFixed(2)}`);
  }
  return points.join(" ") + "Z";
}

const SQUIRCLE = roundedOutline();

/** GigiAvatar's shell, mapped from its 240x260 box into the 40x44 one. */
const GHOST =
  "M45 113V94C45 45 73 22 120 22S195 45 195 94V184Q195 194 187 202L171 218L147 200L120 224L93 200L69 218L53 202Q45 194 45 184Z";

function Body({ shape, fill }: { shape: Shape; fill: string }) {
  const style = { fill, stroke: fill };
  switch (shape) {
    case "ghost":
      return <path d={GHOST} transform="translate(-0.4 0.2) scale(0.17)" style={{ fill }} />;
    case "circle":
      return <circle cx={20} cy={20} r={16.2} style={{ fill }} />;
    case "squircle":
      return <path d={SQUIRCLE} style={{ fill }} />;
    case "triangle":
      return <path d="M20 5.5 L36 33.5 L4 33.5 Z" style={style} strokeWidth={5} strokeLinejoin="round" />;
    case "hexagon":
      return <path d="M20 3.5 L34.5 11.75 L34.5 28.25 L20 36.5 L5.5 28.25 L5.5 11.75 Z" style={style} strokeWidth={3} strokeLinejoin="round" />;
    case "cloud":
      return <path d="M11 32 a7.5 7.5 0 0 1 -1 -14.9 A9.5 9.5 0 0 1 29 12.5 A7 7 0 0 1 30 32 Z" style={{ fill }} />;
    case "drop":
      return <path d="M20 3 C20 3 6 20 6 27 a14 13.5 0 0 0 28 0 C34 20 20 3 20 3 Z" style={{ fill }} />;
  }
}

function eyeLine(shape: Shape): number {
  if (shape === "cloud" || shape === "triangle") return 23;
  if (shape === "drop") return 25;
  if (shape === "ghost") return 16.4;
  return 17.2;
}

export function GlyphFace({
  shape,
  color,
  gaze = { x: 0, y: 0 },
  mood = "rest",
}: {
  shape: Shape;
  color: string;
  gaze?: { x: number; y: number };
  mood?: Mood;
}) {
  const fill = `var(${color})`;
  const eyeY = eyeLine(shape);
  const spread = shape === "ghost" ? 6.2 : 4.6;
  return (
    <g className="agent-glyph" data-mood={mood}>
      <Body shape={shape} fill={fill} />
      {mood === "working" ? (
        <g className="agent-glyph__dots" style={{ fill: "var(--agent-eye)" }}>
          <circle cx={13} cy={eyeY + 1} r={2.1} />
          <circle cx={20} cy={eyeY + 1} r={2.5} />
          <circle cx={27} cy={eyeY + 1} r={2.1} />
        </g>
      ) : mood === "happy" ? (
        <path
          d={`M${20 - spread - 2.4} ${eyeY + 1.2} q2.4 -4 4.8 0 M${20 + spread - 2.4} ${eyeY + 1.2} q2.4 -4 4.8 0`}
          style={{ stroke: "var(--agent-eye)" }}
          fill="none"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ) : (
        <g transform={`translate(${(gaze.x + (shape === "ghost" ? 0 : 2)).toFixed(2)} ${(gaze.y - (shape === "ghost" ? 0 : 0.6)).toFixed(2)})${shape === "ghost" ? "" : ` rotate(-14 20 ${eyeY})`}`}>
          <g className="agent-glyph__eyes" style={{ fill: "var(--agent-eye)" }}>
            <ellipse cx={20 - spread} cy={eyeY} rx={1.5} ry={3.1} />
            <ellipse cx={20 + spread} cy={eyeY} rx={1.5} ry={3.1} />
          </g>
        </g>
      )}
    </g>
  );
}

/** A small, static glyph for lists: the roster, the feed, the timeline. */
export function AgentGlyph({
  shape,
  color,
  size,
  mood = "rest",
}: {
  shape: Shape;
  color: string;
  size: number;
  mood?: Mood;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 40 42"
      width={size}
      height={size}
      className="agent-glyph-mini"
    >
      <GlyphFace shape={shape} color={color} mood={mood} />
    </svg>
  );
}
