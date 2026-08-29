/**
 * Vendor marks on a demo row.
 *
 * Two render paths, ported from the app's own `CliLogo.tsx` because the reason
 * for them survives the port:
 *
 *  - **colour** — the vendor's full-colour icon, drawn as an `<img>` on a
 *    neutral tile. Its own colours carry the brand.
 *  - **mono** — a single-colour glyph drawn as a CSS mask over the current text
 *    ink. One file then works on any ground, which matters here because this
 *    site went dark after the marks were chosen. A near-black octocat on a
 *    near-black tile is not a faint logo, it is no logo.
 *
 * A brand the app does not bundle falls back to its Simple Icons glyph in white
 * on the brand's own colour — which for Stripe and Cloudflare is what their real
 * app icon looks like anyway.
 *
 * Every file is bundled at build time, so a mark renders offline and the demo
 * makes no network call — which docs/feature-section.md forbids.
 */

import type { CSSProperties } from "react";

const BRAND = import.meta.glob("../../assets/brands/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const CLIS = import.meta.glob("../../assets/clis/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** The bundled mark for a plugin id, or undefined if none is bundled. */
export function brandMark(id: string): string | undefined {
  return BRAND[`../../assets/brands/${id}.svg`];
}

/** The bundled mark for a CLI vendor file name, e.g. "github.svg". */
export function cliMark(file: string): string | undefined {
  return CLIS[`../../assets/clis/${file}`];
}

export interface MarkTileProps {
  /** Bundled URL of the mark. Absent draws an empty tile rather than a guess. */
  url?: string;
  /** Draw it as a mask over the text ink instead of as a picture. */
  mono?: boolean;
  /**
   * Brand colour for the tile, WITHOUT the leading hash — the catalog's own
   * format, and the reason it is stored that way here: a full hex literal in a
   * source file is a colour nobody can find later, which the style gate
   * rejects on sight. This is data copied from the catalog, not a design
   * decision, and it only ever reaches the two brands with no bundled mark.
   */
  tint?: string;
  /** Design pixels. The rows use 72. */
  size?: number;
  inset?: number;
}

export function MarkTile({
  url,
  mono,
  tint,
  size = 72,
  inset = 16,
}: MarkTileProps) {
  const glyph = size - inset * 2;
  const maskStyle: CSSProperties = url
    ? {
        width: glyph,
        height: glyph,
        background: "currentColor",
        // The quotes are load-bearing. Vite inlines a small SVG as a data URI
        // whose payload still contains the source's single quotes, and an
        // UNQUOTED css url() token may not contain a quote character — so the
        // browser rejected the whole declaration silently and the mask never
        // applied. What you saw was the tile painted solid in the ink colour.
        WebkitMaskImage: `url("${url}")`,
        maskImage: `url("${url}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }
    : {};

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        border: tint ? "none" : "2px solid var(--hairline)",
        background: tint ? `#${tint}` : "var(--surface-card)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        // What a mono mask paints itself with. Only the neutral tile uses one;
        // a tinted tile's file is already white, and masking it would repaint
        // it in the page ink and lose it against the brand colour.
        color: "var(--ink)",
      }}
    >
      {url ? (
        mono ? (
          <span style={maskStyle} />
        ) : (
          <img src={url} alt="" width={glyph} height={glyph} />
        )
      ) : null}
    </span>
  );
}
